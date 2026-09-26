import { Router } from "express";
import Student from "../models/Student.js";
import Application from "../models/Application.js";
import Attendance from "../models/Attendance.js";
import auth from "../middleware/auth.js";
import studentSession from "../middleware/studentSession.js";
import {
  resetStudentPin,
  applicationStatusFromStudent,
} from "../services/studentService.js";
import {
  sendStudentCredentials,
  sendApplicationStatusChange,
} from "../utils/mailer.js";
import { signStudentToken } from "../utils/token.js";
import { normalizeEmail } from "../utils/email.js";

const router = Router();

const PUBLIC_FIELDS = "-pinHash";

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

const publicStudent = (student) => {
  const data = student.toObject();
  delete data.pinHash;
  return data;
};

const rateLimit = new Map();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 10;

const checkRateLimit = (key) => {
  const now = Date.now();
  const entry = rateLimit.get(key);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    rateLimit.set(key, { start: now, count: 1 });
    return { allowed: true, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > RATE_MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((RATE_WINDOW_MS - (now - entry.start)) / 1000);
    return { allowed: false, retryAfter };
  }
  return { allowed: true, retryAfter: 0 };
};

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimit.entries()) {
    if (now - entry.start > RATE_WINDOW_MS) rateLimit.delete(key);
  }
}, RATE_WINDOW_MS).unref();

router.post("/login", async (req, res) => {
  try {
    const regNumber = String(req.body.regNumber || "").trim().toUpperCase();
    const pin = String(req.body.pin || "").trim();
    if (!regNumber || !pin) {
      return res.status(400).json({ message: "Registration number and PIN are required" });
    }

    const limit = checkRateLimit(`${req.ip}:${regNumber}`);
    if (!limit.allowed) {
      res.set("Retry-After", String(limit.retryAfter));
      return res.status(429).json({
        message: "Too many sign-in attempts. Please wait a few minutes and try again.",
      });
    }

    const student = await Student.findOne({ regNumber: new RegExp(`^${regNumber}$`, "i") }).select("+pinHash");
    if (!student) {
      return res.status(404).json({ message: "No student found with that registration number" });
    }
    const ok = await student.comparePin(pin);
    if (!ok) {
      return res.status(401).json({ message: "Incorrect PIN" });
    }
    res.json({ ...publicStudent(student), token: signStudentToken(student._id) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/forgot-pin", async (req, res) => {
  try {
    const regNumber = String(req.body.regNumber || "").trim().toUpperCase();
    const email = normalizeEmail(req.body.email);
    if (!regNumber || !email) {
      return res.status(400).json({ message: "Registration number and email are required" });
    }
    const generic = {
      message: "If your registration number and email match, a new PIN has been sent to your email.",
    };
    const student = await Student.findOne({ regNumber: new RegExp(`^${regNumber}$`, "i") });
    // Deliberately not running the strict validator here. This is a lookup, not
    // a registration, and records created before the stricter rule may still
    // hold a malformed address that the applicant cannot retype. Normalising
    // both sides is enough to make the comparison reliable.
    if (!student || normalizeEmail(student.email) !== email) {
      return res.json(generic);
    }
    const { student: updated, pin } = await resetStudentPin(student);
    await updated.save();
    sendStudentCredentials(updated, { pin }).catch((e) =>
      console.error("[mailer] forgot-pin email failed:", e.message)
    );
    res.json(generic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/mine", auth, async (req, res) => {
  try {
    const students = await Student.find({ userId: req.user._id })
      .select(PUBLIC_FIELDS)
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Real attendance rollup for the signed-in student. The profile page used to
// render hardcoded percentages, which meant students were shown figures that
// did not exist in the database.
router.get("/mine/attendance", studentSession, async (req, res) => {
  try {
    // A PIN sign-in resolves to `req.student`; a staff account reaching a
    // student's profile has to look the record up by its linked user.
    const student = req.student
      || (req.user && await Student.findOne({ userId: req.user._id }).select("_id").lean());

    if (!student) {
      return res.json({ total: 0, present: 0, absent: 0, late: 0, rate: 0, records: [] });
    }

    const studentId = student._id;

    const [rollup, records] = await Promise.all([
      Attendance.aggregate([
        { $match: { studentId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Attendance.find({ studentId })
        .sort({ sessionDate: -1, createdAt: -1 })
        .limit(20)
        .select("sessionDate status course note")
        .lean(),
    ]);

    const tally = rollup.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    const present = tally.present || 0;
    const absent = tally.absent || 0;
    const late = tally.late || 0;
    const total = present + absent + late;

    res.json({
      total,
      present,
      absent,
      late,
      rate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
      records: records.map((r) => ({
        id: String(r._id),
        sessionDate: r.sessionDate,
        status: r.status,
        course: r.course || "",
        note: r.note || "",
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fresh copy of the signed-in student's own record.
//
// PIN sign-in caches the student in localStorage, so once staff record a mark
// or tick a course complete the cached copy is stale and the profile would keep
// showing the old data until the student signed in again. This re-reads the
// record each time so marks, payment-linked state and the achievement card
// update without a re-login.
router.get("/mine/profile", studentSession, async (req, res) => {
  try {
    let student = req.student;

    if (!student && req.user) {
      student = await Student.findOne({ userId: req.user._id });
    }

    if (!student) {
      return res.status(404).json({ message: "No student record is linked to this session" });
    }

    res.json(publicStudent(student));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.use(auth, requireAdmin);

router.get("/", async (req, res) => {
  try {
    const { status, intakeId, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (intakeId) filter.intakeId = intakeId;
    if (q) {
      const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: rx }, { regNumber: rx }, { email: rx }];
    }
    const students = await Student.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select(PUBLIC_FIELDS);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(publicStudent(student));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const previousStatus = student.status;
    ["name", "phone", "campus", "program", "motivation", "remarks"].forEach((key) => {
      if (req.body[key] !== undefined) student[key] = req.body[key];
    });
    if (req.body.status !== undefined && ["applicant", "active", "rejected"].includes(req.body.status)) {
      student.status = req.body.status;
    }
    if (Array.isArray(req.body.preferredCourses)) {
      student.preferredCourses = req.body.preferredCourses
        .map((c) => String(c).trim())
        .filter(Boolean);
    }

    await student.save();

    if (req.body.status && req.body.status !== previousStatus) {
      const application = await Application.findById(student.applicationId);
      if (application) {
        application.status = applicationStatusFromStudent(student.status);
        await application.save();
        sendApplicationStatusChange(application, student).catch((e) =>
          console.error("[mailer] status-change email failed:", e.message)
        );
      }
    }

    res.json(publicStudent(student));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/:id/marks", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const course = String(req.body.course || "").trim();
    const score = Number(req.body.score);
    if (!course) return res.status(400).json({ message: "Course is required" });
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return res.status(400).json({ message: "Score must be a number between 0 and 100" });
    }

    const mark = {
      course,
      score,
      grade: req.body.grade ? String(req.body.grade).trim() : undefined,
      remarks: req.body.remarks ? String(req.body.remarks).trim() : undefined,
      completed: req.body.completed === true,
      recordedBy: req.user?.name || req.user?.email || undefined,
    };
    if (mark.completed) mark.completedAt = new Date();
    student.marks.push(mark);
    await student.save();
    res.status(201).json(publicStudent(student));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id/marks/:markId", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const mark = student.marks.id(req.params.markId);
    if (!mark) return res.status(404).json({ message: "Mark not found" });

    if (req.body.course !== undefined) mark.course = String(req.body.course).trim();
    if (req.body.score !== undefined) {
      const score = Number(req.body.score);
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        return res.status(400).json({ message: "Score must be a number between 0 and 100" });
      }
      mark.score = score;
    }
    if (req.body.grade !== undefined) mark.grade = String(req.body.grade).trim();
    if (req.body.remarks !== undefined) mark.remarks = String(req.body.remarks).trim();
    if (req.body.completed !== undefined) {
      mark.completed = req.body.completed === true;
      // Stamp or clear the date alongside the flag so the two can never
      // disagree, which would otherwise produce a card with no date on it.
      mark.completedAt = mark.completed ? mark.completedAt || new Date() : undefined;
    }
    await student.save();
    res.json(publicStudent(student));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id/marks/:markId", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const mark = student.marks.id(req.params.markId);
    if (!mark) return res.status(404).json({ message: "Mark not found" });

    mark.deleteOne();
    await student.save();
    res.json(publicStudent(student));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/:id/reset-pin", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select("+pinHash");
    if (!student) return res.status(404).json({ message: "Student not found" });

    const { student: updated, pin } = await resetStudentPin(student);
    await updated.save();
    sendStudentCredentials(updated, { pin }).catch((e) =>
      console.error("[mailer] reset-pin email failed:", e.message)
    );

    res.json({
      message: "New PIN generated and emailed to the student",
      pin,
      regNumber: updated.regNumber,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;