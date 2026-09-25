import { Router } from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";
import User from "../models/User.js";
import Intake from "../models/Intake.js";
import Student from "../models/Student.js";
import TrainerAssignment from "../models/TrainerAssignment.js";
import Attendance from "../models/Attendance.js";

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

const gradeForScore = (score) => {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
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

const getRoster = async (user, { intakeId, course, q } = {}) => {
  const requestedCourse = cleanCourse(course);
  const filter = {};
  if (intakeId && validId(intakeId)) filter.intakeId = intakeId;

  if (user.role !== "admin") {
    const assignments = await getAssignments(user, intakeId);
    if (!assignments.length) return [];
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
    if (!allowedIds.length) return [];
    filter._id = { $in: allowedIds };
  }

  let students = await Student.find(filter).select("-pinHash").sort({ name: 1 });
  if (requestedCourse) students = students.filter((student) => courseMatches(student, requestedCourse));
  if (q) {
    const query = String(q).trim().toLowerCase();
    students = students.filter((student) =>
      [student.name, student.email, student.regNumber, student.phone, student.intakeTitle, student.program]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(query))
    );
  }
  return students;
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
    const students = await getRoster(req.user, req.query);
    const studentIds = students.map((student) => student._id);
    const records = studentIds.length
      ? await Attendance.find({ studentId: { $in: studentIds } }).sort({ sessionDate: -1, createdAt: -1 }).limit(100).lean()
      : [];
    const marksRecorded = students.reduce((total, student) => total + (student.marks?.length || 0), 0);
    const sessionKeys = new Set(records.map((record) => `${record.sessionDate.toISOString().slice(0, 10)}:${record.course || ""}`));
    const present = records.filter((record) => record.status === "present" || record.status === "late").length;
    res.json({
      studentCount: students.length,
      assignmentCount: (await getAssignments(req.user)).length,
      attendanceRate: records.length ? Math.round((present / records.length) * 100) : 0,
      sessionCount: sessionKeys.size,
      marksRecorded,
      studentsWithoutMarks: students.filter((student) => !student.marks?.length).length,
      recentAttendance: records.slice(0, 8).map((record) => ({
        ...record,
        student: record.studentId,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/students", async (req, res) => {
  try {
    const students = await getRoster(req.user, req.query);
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
    const students = await getRoster(req.user, req.query);
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
    const records = [];
    for (const entry of entries) {
      if (!allowedStatuses.has(entry.status)) {
        return res.status(400).json({ message: "Invalid attendance status" });
      }
      const result = await getScopedStudent(req.user, entry.studentId, course);
      if (result.error) return res.status(403).json({ message: result.error });
      if (String(result.student.intakeId) !== String(intakeId)) {
        return res.status(400).json({ message: "A student does not belong to the selected intake" });
      }
      const record = await Attendance.findOneAndUpdate(
        { studentId: result.student._id, intakeId, sessionDate, course },
        {
          $set: {
            trainerId: req.user._id,
            status: entry.status,
            notes: String(entry.notes || "").trim(),
            recordedById: req.user._id,
          },
          $setOnInsert: { studentId: result.student._id, intakeId, sessionDate, course },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      records.push(serializeAttendance(record));
    }
    res.status(201).json({ message: "Attendance saved", records });
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
  return {
    course,
    score,
    grade: gradeForScore(score),
    remarks: String(body.remarks || "").trim(),
    recordedBy: user.name || user.email,
    recordedById: user._id,
    assessedAt: new Date(),
  };
};

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

export default router;
