import { Router } from "express";
import Student from "../models/Student.js";
import Application from "../models/Application.js";
import auth from "../middleware/auth.js";
import {
  resetStudentPin,
  applicationStatusFromStudent,
} from "../services/studentService.js";
import {
  sendStudentCredentials,
  sendApplicationStatusChange,
} from "../utils/mailer.js";

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

router.post("/login", async (req, res) => {
  try {
    const regNumber = String(req.body.regNumber || "").trim().toUpperCase();
    const pin = String(req.body.pin || "").trim();
    if (!regNumber || !pin) {
      return res.status(400).json({ message: "Registration number and PIN are required" });
    }
    const student = await Student.findOne({ regNumber: new RegExp(`^${regNumber}$`, "i") }).select("+pinHash");
    if (!student) {
      return res.status(404).json({ message: "No student found with that registration number" });
    }
    const ok = await student.comparePin(pin);
    if (!ok) {
      return res.status(401).json({ message: "Incorrect PIN" });
    }
    res.json(publicStudent(student));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/forgot-pin", async (req, res) => {
  try {
    const regNumber = String(req.body.regNumber || "").trim().toUpperCase();
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!regNumber || !email) {
      return res.status(400).json({ message: "Registration number and email are required" });
    }
    const generic = {
      message: "If your registration number and email match, a new PIN has been sent to your email.",
    };
    const student = await Student.findOne({ regNumber: new RegExp(`^${regNumber}$`, "i") });
    if (!student || String(student.email || "").toLowerCase() !== email) {
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
        sendApplicationStatusChange(application, student);
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

    student.marks.push({
      course,
      score,
      grade: req.body.grade ? String(req.body.grade).trim() : undefined,
      remarks: req.body.remarks ? String(req.body.remarks).trim() : undefined,
      recordedBy: req.user?.name || req.user?.email || undefined,
    });
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

    student.marks.id(req.params.markId).deleteOne();
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
    sendStudentCredentials(updated, { pin });

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