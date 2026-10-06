import { Router } from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";
import User from "../models/User.js";
import Intake from "../models/Intake.js";
import Student from "../models/Student.js";
import TrainerAssignment from "../models/TrainerAssignment.js";
import Attendance from "../models/Attendance.js";
import { gradeForScore } from "../utils/grade.js";
import {
  ASSESSMENT_TYPES, DEFAULT_ASSESSMENT_NO, assessmentTypeProblem, assessmentNoProblem,
} from "../utils/options.js";

const router = Router();
router.use(auth, requireRole("trainer", "admin"));

const cleanCourse = (value) => String(value || "").trim();
const normalizeCourse = (value) => cleanCourse(value).toLowerCase();
const validId = (value) => mongoose.isValidObjectId(value);

const normalizeDate = (value) => {
  const raw = value instanceof Date ? value : String(value || "").slice(0, 10);
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

  const publicStudent = (student) => {
  const data = student.toObject ? student.toObject() : { ...student };
  delete data.pinHash;
  return data;
};

const courseMatches = (student, course) => {
  if (!course) return true;
  const target = normalizeCourse(course);
  const values = [...(student.preferredCourses || []), student.program || ""]
    .map(normalizeCourse)
    .filter(Boolean);
  return values.some((value) => value === target || value.includes(target) || target.includes(value));
};

const getAssignments = async (user, intakeId) => {
  const filter = { active: true };
  if (user.role !== "admin") filter.trainerId = user._id;
  if (intakeId && validId(intakeId)) filter.intakeId = intakeId;
  return TrainerAssignment.find(filter).lean();
};

// What a roster row actually needs.
//
// getRoster used to select everything but the PIN hash, so every trainer page
// pulled each student's whole document across the wire - motivation, remarks,
// photo metadata, and the entire embedded `marks` and `completedCourses` arrays -
// and then either ignored it or sent it on to the browser. Four routes call this
// helper, so it was the single largest avoidable payload in the trainer area.
//
// `withMarks` opts back in to the mark sub-documents for the one caller that
// aggregates over them. The dashboard only ever asks how many there are, and
// serves that from the count below instead.
const ROSTER_FIELDS =
  "name email regNumber phone intakeId intakeTitle program preferredCourses status completedCourses mustChangePin photo";

const getRoster = async (user, { intakeId, course, q, withMarks, withMarkCounts } = {}) => {
  const requestedCourse = cleanCourse(course);
  const filter = {};
  if (intakeId && validId(intakeId)) filter.intakeId = intakeId;

  // Handed back so callers that also need the assignment count do not have to
  // run the same query a second time. An admin's roster is not scoped by
  // assignment at all, so their list is fetched here rather than left empty.
  let assignments = null;
  if (user.role !== "admin") {
    assignments = await getAssignments(user, intakeId);
    if (!assignments.length) return { students: [], markCount: 0, studentsWithoutMarks: 0, assignments };
    const candidateStudents = await Student.find({
      intakeId: { $in: assignments.map((assignment) => assignment.intakeId) },
    }).select("_id intakeId preferredCourses program").lean();
    const allowedIds = candidateStudents
      .filter((student) => assignments.some((assignment) => {
        if (String(assignment.intakeId) !== String(student.intakeId)) return false;
        if (requestedCourse && assignment.course && normalizeCourse(assignment.course) !== normalizeCourse(requestedCourse)) return false;
        return courseMatches(student, requestedCourse || assignment.course);
      }))
      .map((student) => student._id);
    if (!allowedIds.length) return { students: [], markCount: 0, studentsWithoutMarks: 0, assignments };
    filter._id = { $in: allowedIds };
  }

  const select = withMarks ? `${ROSTER_FIELDS} marks` : ROSTER_FIELDS;
  let students = await Student.find(filter).select(select).sort({ name: 1 }).lean();
  if (requestedCourse) students = students.filter((student) => courseMatches(student, requestedCourse));
  if (q) {
    const query = String(q).trim().toLowerCase();
    students = students.filter((student) =>
      [student.name, student.email, student.regNumber, student.phone, student.intakeTitle, student.program]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(query))
    );
  }

  // How many marks are recorded across the roster, and how many students have
  // none. The dashboard needs both, and without this it had to ship every mark
  // document to the client just to call .length on it.
  //
  // Opt-in because it costs an extra aggregate per student in the array, and only
  // one caller actually reads the numbers. When this ran on every roster request
  // it made the roster list, the attendance register and the clear-all endpoint
  // each pay for a count that they then discard. With no `withMarkCounts` asked
  // for, these stay null and the caller sees undefined rather than a wrong 0.
  let markCount = null;
  let studentsWithoutMarks = null;
  if (withMarkCounts && !withMarks) {
    const ids = students.map((student) => student._id);
    if (ids.length) {
      const [counts] = await Student.aggregate([
        { $match: { _id: { $in: ids } } },
        {
          $group: {
            _id: null,
            totalMarks: { $sum: { $size: { $ifNull: ["$marks", []] } } },
            withNoMarks: { $sum: { $cond: [{ $eq: [{ $size: { $ifNull: ["$marks", []] } }, 0] }, 1, 0] } },
          },
        },
      ]);
      markCount = counts?.totalMarks || 0;
      studentsWithoutMarks = counts?.withNoMarks || 0;
    } else {
      markCount = 0;
      studentsWithoutMarks = 0;
    }
  }

  // An admin sees every student, so their roster is not narrowed by assignment.
  // Their assignment total still has to be counted, and it is counted here
  // rather than by the caller issuing a second identical query.
  const assignmentRows = assignments ?? (await getAssignments(user));

  return { students, markCount, studentsWithoutMarks, assignments: assignmentRows };
};

const getScopedStudent = async (user, studentId, course) => {
  if (!validId(studentId)) return { error: "Invalid student" };
  const student = await Student.findById(studentId).select("-pinHash");
  if (!student) return { error: "Student not found" };
  if (user.role === "admin") return { student };
  const assignments = await TrainerAssignment.find({ trainerId: user._id, intakeId: student.intakeId, active: true }).lean();
  const requestedCourse = cleanCourse(course);
  const allowed = assignments.some((assignment) => {
    if (requestedCourse && assignment.course && normalizeCourse(assignment.course) !== normalizeCourse(requestedCourse)) return false;
    return courseMatches(student, requestedCourse || assignment.course);
  });
  return allowed ? { student } : { error: "Student is outside your assigned intake or course" };
};

/**
 * The same authorization as getScopedStudent, for a whole batch at once.
 *
 * The bulk attendance and marks endpoints used to call getScopedStudent once per
 * entry inside their loop. Each call is two round trips - find the student, find
 * their assignments - and the loops cap at 500 entries, so saving one full-class
 * register cost up to 1,000 serial queries before a single write happened, and
 * every one of those queries was repeated for students already checked.
 *
 * Here the students and the assignments are each fetched once, and the identical
 * per-student rule is then applied in memory. Same decision, same error message,
 * three queries instead of a thousand.
 */
const getScopedStudents = async (user, studentIds, course, { withMarks = false } = {}) => {
  const ids = [...new Set(studentIds.map(String))];
  if (!ids.length) return { students: new Map(), error: "No students supplied" };
  if (ids.some((id) => !validId(id))) return { students: new Map(), error: "Invalid student" };

  const select = withMarks ? "-pinHash marks" : "-pinHash";
  const rows = await Student.find({ _id: { $in: ids } }).select(select).lean();
  const byId = new Map(rows.map((row) => [String(row._id), row]));
  if (byId.size !== ids.length) return { students: new Map(), error: "Student not found" };

  if (user.role === "admin") return { students: byId };

  // One query for every intake represented in the batch. An admin-free trainer's
  // assignments are per-intake, so this is the whole authorization set.
  const intakeIds = [...new Set(rows.map((row) => String(row.intakeId)))];
  const assignments = await TrainerAssignment.find({
    trainerId: user._id,
    intakeId: { $in: intakeIds },
    active: true,
  }).lean();
  const byIntake = new Map();
  for (const assignment of assignments) {
    const key = String(assignment.intakeId);
    byIntake.set(key, [...(byIntake.get(key) || []), assignment]);
  }

  const requestedCourse = cleanCourse(course);
  for (const student of rows) {
    const forIntake = byIntake.get(String(student.intakeId)) || [];
    const allowed = forIntake.some((assignment) => {
      if (requestedCourse && assignment.course && normalizeCourse(assignment.course) !== normalizeCourse(requestedCourse)) return false;
      return courseMatches(student, requestedCourse || assignment.course);
    });
    if (!allowed) {
      return { students: new Map(), error: "Student is outside your assigned intake or course" };
    }
  }

  return { students: byId };
};

const serializeAttendance = (record) => ({
  ...record,
  id: record._id,
  student: record.studentId,
  recordedBy: record.recordedById,
});

router.get("/assignments", async (req, res) => {
  try {
    const assignments = await TrainerAssignment.find(
      req.user.role === "admin" ? { active: true } : { trainerId: req.user._id, active: true }
    )
      .populate("intakeId", "title program courses currency")
      .populate("trainerId", "name email")
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    // markCount and studentsWithoutMarks come back with the roster, so the
    // dashboard no longer needs every mark document shipped to it just to count
    // them. It is the only caller that reads them, so it opts in explicitly.
    const { students, markCount, studentsWithoutMarks, assignments: assignmentRows } = await getRoster(req.user, { ...req.query, withMarkCounts: true });
    const studentIds = students.map((student) => student._id);
    const records = studentIds.length
      ? await Attendance.find({ studentId: { $in: studentIds } }).sort({ sessionDate: -1, createdAt: -1 }).limit(100).lean()
      : [];
    const sessionKeys = new Set(records.map((record) => `${record.sessionDate.toISOString().slice(0, 10)}:${record.course || ""}`));
    const present = records.filter((record) => record.status === "present" || record.status === "late").length;

    // A day-by-day rate, oldest first, so the dashboard can show whether
    // attendance is improving rather than only the lifetime average. Without
    // this the trainer sees one number that never changes and cannot tell a
    // good month from a bad one.
    const byDate = new Map();
    for (const record of records) {
      const key = String(record.sessionDate).slice(0, 10);
      const bucket = byDate.get(key) || { date: key, total: 0, present: 0 };
      bucket.total += 1;
      if (record.status === "present" || record.status === "late") bucket.present += 1;
      byDate.set(key, bucket);
    }
    const trend = [...byDate.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((bucket) => ({
        date: bucket.date,
        rate: bucket.total ? Math.round((bucket.present / bucket.total) * 100) : 0,
        marked: bucket.total,
      }));

    // Worst-attending students, which is the list a trainer actually acts on.
    // Names come from the roster, not from `records`: that query is a plain
    // lean() find with no populate, so studentId is a bare id there.
    const nameById = new Map(students.map((student) => [String(student._id), student]));
    const perStudent = new Map();
    for (const record of records) {
      const id = String(record.studentId?._id || record.studentId);
      if (!id) continue;
      const person = nameById.get(id);
      const bucket = perStudent.get(id) || {
        id,
        name: person?.name || "Student",
        regNumber: person?.regNumber || "",
        total: 0,
        present: 0,
      };
      bucket.total += 1;
      if (record.status === "present" || record.status === "late") bucket.present += 1;
      perStudent.set(id, bucket);
    }
    const atRisk = [...perStudent.values()]
      .filter((entry) => entry.total >= 2)
      .map((entry) => ({ ...entry, rate: Math.round((entry.present / entry.total) * 100) }))
      .filter((entry) => entry.rate < 75)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 6);

    res.json({
      studentCount: students.length,
      // Counted in the same query as the roster rather than in a second one, and
      // joined into this response rather than awaited inside it - it used to run
      // after the roster and attendance reads had already finished.
      assignmentCount: assignmentRows.length,
      attendanceRate: records.length ? Math.round((present / records.length) * 100) : 0,
      sessionCount: sessionKeys.size,
      marksRecorded: markCount,
      // A course counts as done when every assessment on it is scored, which is
      // a truer measure of coverage than "has any mark at all".
      studentsWithoutMarks,
      trend,
      atRisk,
      recentAttendance: records.slice(0, 8).map((record) => {
        const id = String(record.studentId?._id || record.studentId);
        const person = nameById.get(id);
        return {
          _id: record._id,
          sessionDate: record.sessionDate,
          course: record.course,
          status: record.status,
          student: { _id: id, name: person?.name || "Student", regNumber: person?.regNumber || "" },
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/students", async (req, res) => {
  try {
    const { students } = await getRoster(req.user, req.query);
    res.json(students.map(publicStudent));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/students/:id", async (req, res) => {
  try {
    const result = await getScopedStudent(req.user, req.params.id, req.query.course);
    if (result.error) return res.status(result.error === "Student not found" ? 404 : 403).json({ message: result.error });
    res.json(publicStudent(result.student));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/attendance", async (req, res) => {
  try {
    const { students } = await getRoster(req.user, req.query);
    const studentIds = students.map((student) => student._id);
    if (!studentIds.length) return res.json([]);
    const allowed = new Set(studentIds.map((id) => String(id)));
    const filter = { studentId: { $in: studentIds } };
    if (req.query.intakeId && validId(req.query.intakeId)) filter.intakeId = req.query.intakeId;
    if (req.query.studentId && validId(req.query.studentId) && allowed.has(String(req.query.studentId))) filter.studentId = req.query.studentId;
    if (req.query.sessionDate) {
      const sessionDate = normalizeDate(req.query.sessionDate);
      if (!sessionDate) return res.status(400).json({ message: "Invalid session date" });
      filter.sessionDate = sessionDate;
    }
    if (req.query.course !== undefined) filter.course = cleanCourse(req.query.course);
    const records = await Attendance.find(filter)
      .populate("studentId", "name regNumber intakeTitle")
      .populate("recordedById", "name email")
      .sort({ sessionDate: -1, createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/attendance", async (req, res) => {
  try {
    const { intakeId, sessionDate: rawDate, course: rawCourse, entries } = req.body;
    const course = cleanCourse(rawCourse);
    const sessionDate = normalizeDate(rawDate);
    if (!validId(intakeId) || !sessionDate) {
      return res.status(400).json({ message: "A valid intake and session date are required" });
    }
    if (!Array.isArray(entries) || !entries.length || entries.length > 500) {
      return res.status(400).json({ message: "Attendance entries are required" });
    }
    const allowedStatuses = new Set(["present", "absent", "late", "excused"]);
    // Validate every entry before touching the database, so a bad status in the
    // middle of a register cannot leave half a session written.
    for (const entry of entries) {
      if (!allowedStatuses.has(entry.status)) {
        return res.status(400).json({ message: "Invalid attendance status" });
      }
    }

    // Authorize the whole register in three queries, then write it in one.
    // This used to be findOneAndUpdate inside the loop, which cost up to 1,500
    // serial round trips for a full class.
    const { students, error } = await getScopedStudents(req.user, entries.map((entry) => entry.studentId), course);
    if (error) return res.status(error === "Student not found" ? 404 : 403).json({ message: error });

    for (const entry of entries) {
      const student = students.get(String(entry.studentId));
      if (String(student.intakeId) !== String(intakeId)) {
        return res.status(400).json({ message: "A student does not belong to the selected intake" });
      }
    }

    const operations = entries.map((entry) => ({
      updateOne: {
        filter: { studentId: entry.studentId, intakeId, sessionDate, course },
        update: {
          $set: {
            trainerId: req.user._id,
            status: entry.status,
            notes: String(entry.notes || "").trim(),
            recordedById: req.user._id,
          },
          $setOnInsert: { studentId: entry.studentId, intakeId, sessionDate, course },
        },
        upsert: true,
      },
    }));
    await Attendance.bulkWrite(operations, { ordered: false, setDefaultsOnInsert: true });

    // Read the saved rows back so the response carries the same document shape the
    // per-entry upserts used to return, including ids and timestamps.
    const saved = await Attendance.find({ studentId: { $in: entries.map((entry) => entry.studentId) }, intakeId, sessionDate, course }).lean();
    const order = new Map(entries.map((entry, index) => [String(entry.studentId), index]));
    saved.sort((a, b) => (order.get(String(a.studentId)) ?? 0) - (order.get(String(b.studentId)) ?? 0));

    res.status(201).json({ message: "Attendance saved", records: saved.map(serializeAttendance) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Clears one session day for a class.
 *
 * A day that was saved by mistake has to be retractable, otherwise the register
 * is permanently wrong and the trainer has no way to re-record it. Scoped to
 * the trainer's own roster, so this can only ever touch students they teach.
 */
router.delete("/attendance", async (req, res) => {
  try {
    const { intakeId, sessionDate: rawDate, course: rawCourse } = req.body || {};
    const course = cleanCourse(rawCourse);
    const sessionDate = normalizeDate(rawDate);
    if (!validId(intakeId) || !sessionDate) {
      return res.status(400).json({ message: "A valid intake and session date are required" });
    }
    const { students } = await getRoster(req.user, { intakeId, course });
    const studentIds = students.map((student) => student._id);
    if (!studentIds.length) return res.json({ message: "Nothing to clear", removed: 0 });

    const filter = { studentId: { $in: studentIds }, intakeId, sessionDate };
    if (course) filter.course = course;
    const result = await Attendance.deleteMany(filter);
    res.json({
      message: `Cleared ${result.deletedCount} record${result.deletedCount === 1 ? "" : "s"} for ${sessionDate.toISOString().slice(0, 10)}`,
      removed: result.deletedCount || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const markPayload = (body, user) => {
  const course = cleanCourse(body.course);
  const score = Number(body.score);
  if (!course || !Number.isFinite(score) || score < 0 || score > 100) {
    return { error: "A course and a score between 0 and 100 are required" };
  }
  // An absent type is allowed: that is how a mark saved before assessment types
  // existed is re-submitted without being forced into a category. A type that is
  // present but unrecognised is rejected, so a crafted request cannot invent
  // categories the reports would then have to handle.
  const assessmentType = String(body.assessmentType ?? "").trim().toLowerCase();
  if (assessmentType) {
    const typeProblem = assessmentTypeProblem(assessmentType);
    if (typeProblem) return { error: typeProblem };
  }
  const assessmentNo = body.assessmentNo === undefined || body.assessmentNo === null || body.assessmentNo === ""
    ? DEFAULT_ASSESSMENT_NO
    : Number(body.assessmentNo);
  const noProblem = assessmentNoProblem(assessmentNo);
  if (noProblem) return { error: noProblem };

  const assessmentDate = body.assessmentDate ? normalizeDate(body.assessmentDate) : null;
  if (body.assessmentDate && !assessmentDate) return { error: "Invalid assessment date" };

  const payload = {
    course,
    assessmentType,
    assessmentNo,
    assessmentDate: assessmentDate || new Date(),
    score,
    grade: gradeForScore(score),
    remarks: String(body.remarks || "").trim(),
    recordedBy: user.name || user.email,
    recordedById: user._id,
    assessedAt: new Date(),
  };
  // Only sent when the trainer actually specifies it. The PUT handler does
  // `mark.set(payload)`, so always including this would silently clear an
  // existing `completed` flag every time a score was edited.
  if (body.completed !== undefined) {
    payload.completed = body.completed === true;
    payload.completedAt = payload.completed ? new Date() : undefined;
  }
  return payload;
};

// The identity of an assessment within a course, used to match an incoming mark
// to the one already stored. An absent type has to be matched on absence too,
// not on a falsy value that would also match a missing field on a different one.
const markMatchesAssessment = (mark, course, assessmentType, assessmentNo) =>
  String(mark.course || "").toLowerCase() === course.toLowerCase()
  && String(mark.assessmentType || "") === assessmentType
  && Number(mark.assessmentNo || DEFAULT_ASSESSMENT_NO) === assessmentNo;

/**
 * Records one assessment for a whole class in a single request.
 *
 * The per-student routes below write one mark at a time, which meant a trainer
 * with thirty students pressed Save thirty times and any one failure left the
 * class half-marked. This upserts every student in one go: students left blank
 * are skipped rather than recorded as a zero, so a partially filled sheet saves
 * only what was actually entered.
 */
router.post("/marks/bulk", async (req, res) => {
  try {
    const course = cleanCourse(req.body.course);
    if (!course) return res.status(400).json({ message: "A course is required" });
    const assessmentType = String(req.body.assessmentType ?? "").trim().toLowerCase();
    if (assessmentType) {
      const typeProblem = assessmentTypeProblem(assessmentType);
      if (typeProblem) return res.status(400).json({ message: typeProblem });
    }
    const assessmentNo = req.body.assessmentNo === undefined || req.body.assessmentNo === null || req.body.assessmentNo === ""
      ? DEFAULT_ASSESSMENT_NO
      : Number(req.body.assessmentNo);
    const noProblem = assessmentNoProblem(assessmentNo);
    if (noProblem) return res.status(400).json({ message: noProblem });
    const assessmentDate = req.body.assessmentDate ? normalizeDate(req.body.assessmentDate) : new Date();
    if (!assessmentDate) return res.status(400).json({ message: "Invalid assessment date" });

    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
    if (!entries.length || entries.length > 500) {
      return res.status(400).json({ message: "Enter a score for at least one student" });
    }

    // Blank cells are separated out first: they are "not entered", not zero, and
    // must not be authorized or written at all. Validating the rest up front also
    // means a bad score cannot leave the class half-marked.
    const filled = [];
    let skipped = 0;
    for (const entry of entries) {
      if (entry.score === "" || entry.score === null || entry.score === undefined) {
        skipped += 1;
        continue;
      }
      const score = Number(entry.score);
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        return res.status(400).json({ message: "Scores must be between 0 and 100" });
      }
      filled.push({ ...entry, score });
    }
    if (!filled.length) {
      return res.status(400).json({ message: "Enter a score for at least one student" });
    }

    // One authorization pass for the whole sheet, with the mark arrays included
    // because matching an incoming mark to the one already stored needs them.
    // The old loop ran getScopedStudent and a full-document save per entry, which
    // is up to 1,500 serial round trips for a large class.
    const { students, error } = await getScopedStudents(req.user, filled.map((entry) => entry.studentId), course, { withMarks: true });
    if (error) return res.status(error === "Student not found" ? 404 : 403).json({ message: error });

    const recordedBy = req.user.name || req.user.email;
    const assessedAt = new Date();
    const operations = [];

    for (const entry of filled) {
      const student = students.get(String(entry.studentId));
      const remarks = String(entry.remarks || "").trim();
      const existing = (student.marks || []).find((mark) =>
        markMatchesAssessment(mark, course, assessmentType, assessmentNo),
      );

      if (existing) {
        // Positional $set, keyed on the existing sub-document's own id, so the
        // update targets exactly the mark being re-scored.
        operations.push({
          updateOne: {
            filter: { _id: student._id, "marks._id": existing._id },
            update: {
              $set: {
                "marks.$.score": entry.score,
                "marks.$.grade": gradeForScore(entry.score),
                "marks.$.remarks": remarks,
                "marks.$.assessmentDate": assessmentDate,
                "marks.$.recordedBy": recordedBy,
                "marks.$.recordedById": req.user._id,
                "marks.$.assessedAt": assessedAt,
              },
            },
          },
        });
      } else {
        operations.push({
          updateOne: {
            filter: { _id: student._id },
            update: {
              $push: {
                marks: {
                  course,
                  assessmentType,
                  assessmentNo,
                  assessmentDate,
                  score: entry.score,
                  grade: gradeForScore(entry.score),
                  remarks,
                  recordedBy,
                  recordedById: req.user._id,
                  assessedAt,
                  // Defaults to not complete: completing a course is a separate,
                  // deliberate act, and a trainer typing up Quiz 1 has not
                  // finished it.
                  completed: false,
                },
              },
            },
          },
        });
      }
    }

    if (operations.length) {
      await Student.bulkWrite(operations, { ordered: false });
    }

    const savedCount = operations.length;
    res.status(201).json({
      message: `${savedCount} mark${savedCount === 1 ? "" : "s"} saved`,
      saved: savedCount,
      skipped,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Every assessment recorded for a class, so the entry grid can build its
 * columns and a trainer can see at a glance which quizzes and exams already
 * exist for the course they are about to mark.
 */
router.get("/assessments", async (req, res) => {
  try {
    // withMarks: this is the one caller that genuinely iterates the mark
    // sub-documents, so it asks for them explicitly. Every other roster caller
    // leaves them in the database.
    const { students } = await getRoster(req.user, { ...req.query, withMarks: true });
    const buckets = new Map();
    for (const student of students) {
      for (const mark of student.marks || []) {
        if (req.query.course && cleanCourse(req.query.course)
          && String(mark.course || "").toLowerCase() !== cleanCourse(req.query.course).toLowerCase()) {
          continue;
        }
        const type = String(mark.assessmentType || "");
        const no = Number(mark.assessmentNo || DEFAULT_ASSESSMENT_NO);
        const key = `${type}:${no}:${String(mark.course || "").toLowerCase()}`;
        const bucket = buckets.get(key) || {
          course: mark.course,
          assessmentType: type,
          assessmentNo: no,
          assessmentDate: mark.assessmentDate || mark.assessedAt || null,
          recorded: 0,
          average: 0,
          _sum: 0,
        };
        bucket.recorded += 1;
        bucket._sum += Number(mark.score || 0);
        // Keep the earliest assessment date, which is the day it was actually
        // given even if marks were typed up days later.
        const date = mark.assessmentDate || mark.assessedAt;
        if (date) {
          const when = new Date(date);
          if (!bucket.assessmentDate || when < new Date(bucket.assessmentDate)) {
            bucket.assessmentDate = when;
          }
        }
        buckets.set(key, bucket);
      }
    }
    const list = [...buckets.values()].map(({ _sum, ...bucket }) => ({
      ...bucket,
      average: bucket.recorded ? Math.round((_sum / bucket.recorded) * 10) / 10 : 0,
    }));
    list.sort((a, b) => {
      if (String(a.course).localeCompare(String(b.course))) return String(a.course).localeCompare(String(b.course));
      if (a.assessmentType !== b.assessmentType) return String(a.assessmentType).localeCompare(String(b.assessmentType));
      return a.assessmentNo - b.assessmentNo;
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/students/:id/marks", async (req, res) => {
  try {
    const result = await getScopedStudent(req.user, req.params.id, req.body.course);
    if (result.error) return res.status(result.error === "Student not found" ? 404 : 403).json({ message: result.error });
    const payload = markPayload(req.body, req.user);
    if (payload.error) return res.status(400).json({ message: payload.error });
    result.student.marks.push(payload);
    await result.student.save();
    res.status(201).json(publicStudent(result.student));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/students/:id/marks/:markId", async (req, res) => {
  try {
    const result = await getScopedStudent(req.user, req.params.id, req.body.course);
    if (result.error) return res.status(result.error === "Student not found" ? 404 : 403).json({ message: result.error });
    const mark = result.student.marks.id(req.params.markId);
    if (!mark) return res.status(404).json({ message: "Mark not found" });
    const payload = markPayload(req.body, req.user);
    if (payload.error) return res.status(400).json({ message: payload.error });
    mark.set(payload);
    await result.student.save();
    res.json(publicStudent(result.student));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Marks one course as finished (or unfinished) for one student.
//
// This is the deliberate sign-off that unlocks the Course Appreciation card, so
// it is a separate route rather than another field on the marks endpoints. Marks
// are evidence a course was assessed; completion is a judgement about the course
// itself, and it has to be revocable - a trainer who signed one off in error
// needs a way to take it back without deleting their assessments.
//
// Scoping is getScopedStudent, the same guard the attendance and marks routes
// use, so a trainer can only sign off students on intakes they are assigned to.
router.put("/students/:id/courses", async (req, res) => {
  try {
    const course = cleanCourse(req.body.course);
    if (!course) return res.status(400).json({ message: "A course name is required" });
    const result = await getScopedStudent(req.user, req.params.id, course);
    if (result.error) {
      return res.status(result.error === "Student not found" ? 404 : 403).json({ message: result.error });
    }
    const student = result.student;
    // Compared case-insensitively so ticking "Microsoft Office" twice from a
    // differently-cased course picker cannot create duplicate rows.
    const existing = student.completedCourses.find(
      (entry) => String(entry.course || "").toLowerCase() === course.toLowerCase()
    );

    if (req.body.completed === false) {
      if (existing) student.completedCourses.pull({ _id: existing._id });
    } else if (existing) {
      // Re-signing refreshes who did it and when, rather than adding a row.
      existing.completedAt = new Date();
      existing.recordedBy = req.user.name || req.user.email;
      existing.recordedById = req.user._id;
    } else {
      student.completedCourses.push({
        course,
        completedAt: new Date(),
        recordedBy: req.user.name || req.user.email,
        recordedById: req.user._id,
      });
    }

    await student.save();
    res.json(publicStudent(student));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
