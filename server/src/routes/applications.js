import { Router } from "express";
import Application from "../models/Application.js";
import Intake from "../models/Intake.js";
import Student from "../models/Student.js";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";
import { verifyToken } from "../utils/token.js";
import {
  createStudentForApplication,
  studentStatusFromApplication,
} from "../services/studentService.js";
import {
  sendApplicationConfirmation,
  sendApplicationStatusChange,
  notifyAdminsNewApplication,
} from "../utils/mailer.js";
import { emailProblem as checkEmail, normalizeEmail } from "../utils/email.js";
import {
  LEVELS_OF_STUDY,
  GENDERS,
  REG_NUMBER_PATTERN,
  optionProblem,
} from "../utils/options.js";
import {
  parseCertificateUpload,
  removeCertificate,
  certificateLimiter,
} from "../utils/certificateUpload.js";

const router = Router();

// Advanced is a session you can only join if you already hold the Basic
// certificate, so the level is read from the intake rather than trusted from
// the request body - a crafted body cannot downgrade its own entry level.
const isAdvancedIntake = (intake) => /advanced/i.test(`${intake.title || ""} ${intake.program || ""}`);

const normalizeRegNumber = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "");

const extractUser = (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    const decoded = verifyToken(header.slice(7));
    return decoded.kind === "student" ? null : decoded.id || null;
  } catch {
    return null;
  }
};

// A multipart body is accepted so the certificate travels with the application
// in one request. A plain JSON body still works for applicants not uploading
// anything: express.json() is already applied globally and ignores
// multipart/form-data, so multer is the only extra parser needed here.

router.post(
  "/",
  // Public endpoint that writes a file to disk, so it gets its own budget
  // rather than trusting the caller to be a real applicant.
  (req, res, next) => {
    const limit = certificateLimiter.check(req.ip);
    if (!limit.allowed) {
      res.set("Retry-After", String(limit.retryAfter));
      return res.status(429).json({ message: certificateLimiter.message });
    }
    next();
  },
  parseCertificateUpload,
  async (req, res) => {
    const uploaded = req.certificate;
    let application = null;
  // Multer has already written the file to disk by this point, so every exit
  // below the validation has to either store it on an application or delete it
  // - otherwise a rejected submission leaves an orphan on the server.
  const discard = () => {
    if (uploaded) removeCertificate(uploaded.url);
  };
  // Every rejected submission routes through here so the temporary file is
  // cleaned up in exactly one place.
  const fail = (status, message) => {
    discard();
    return res.status(status).json({ message });
  };
  try {
    const {
      intakeId,
      email: rawEmail,
      phone,
      campus,
      motivation,
      preferredCourses,
      levelOfStudy,
      department,
      gender,
    } = req.body;
    const name = (req.body.name || "").trim();
    const program = (req.body.program || "").trim();
    const regNumber = normalizeRegNumber(req.body.regNumber);
    if (!intakeId || !name || !rawEmail) {
      return fail(400, "Intake, name, and email are required");
    }
    const emailError = checkEmail(rawEmail);
    if (emailError) {
      return fail(400, emailError);
    }
    if (regNumber && !REG_NUMBER_PATTERN.test(regNumber)) {
      return fail(400, "Registration number looks incorrect. Example: 225020019");
    }
    const optionErrors = [
      optionProblem(LEVELS_OF_STUDY, levelOfStudy, "Level of study"),
      optionProblem(GENDERS, gender, "Gender"),
    ].filter(Boolean);
    if (optionErrors.length) {
      return fail(400, optionErrors[0]);
    }
    // Stored and compared in normalised form, otherwise "Name@Gmail.com" and
    // "name@gmail.com " would each be treated as a different applicant.
    const email = normalizeEmail(rawEmail);
    const intake = await Intake.findById(intakeId);
    if (!intake) return fail(404, "Intake not found");
    if (intake.status === "closed") {
      return fail(400, "This intake is no longer accepting applications");
    }
    if (intake.deadline && new Date(intake.deadline) < new Date()) {
      await Intake.findByIdAndUpdate(intakeId, { status: "closed" });
      return fail(400, "The application deadline for this intake has passed");
    }
    const activeCount = await Student.countDocuments({ intakeId, status: "active" });
    if (intake.status === "full" || activeCount >= intake.capacity) {
      await Intake.findByIdAndUpdate(intakeId, { status: "full" });
      return fail(400, "This intake has reached full capacity");
    }
    const advanced = isAdvancedIntake(intake);
    // The rule that protects the Advanced session, enforced where it cannot be
    // bypassed: an Advanced applicant without the Basic certificate on file is
    // turned away before anything is written.
    if (advanced && !uploaded) {
      return fail(400, "Advanced applicants must upload their Basic certificate");
    }
    const duplicate = await Application.findOne({ intakeId, email, status: { $in: ["pending", "reviewed", "accepted"] } });
    if (duplicate) {
      return fail(409, "You have already applied for this intake");
    }
    const courseList = Array.isArray(preferredCourses)
      ? preferredCourses.map((c) => String(c).trim()).filter(Boolean)
      : program
        ? [program]
        : [];
    application = await Application.create({
      userId: extractUser(req),
      intakeId,
      intakeTitle: intake.title,
      name,
      regNumber,
      email,
      phone,
      campus,
      program: courseList.join(", ") || program,
      preferredCourses: courseList,
      levelOfStudy: String(levelOfStudy || "").trim(),
      department: String(department || "").trim(),
      gender: String(gender || "").trim(),
      // Only kept for an Advanced applicant, so the field always means
      // "this is the proof for this session" and never carries a stray upload
      // that nobody asked for.
      certificate: advanced && uploaded ? uploaded.url : "",
      certificateName: advanced && uploaded ? uploaded.name : "",
      motivation,
    });
    let credentials = null;
    try {
      const { student, pin } = await createStudentForApplication(application);
      credentials = { regNumber: student.regNumber, pin };
    } catch (error) {
      console.error("[applications] Failed to create student profile:", error.message);
    }
    sendApplicationConfirmation(application, intake, credentials).catch((e) =>
      console.error("[mailer] confirmation email failed:", e.message)
    );
    notifyAdminsNewApplication(application, intake).catch((e) =>
      console.error("[mailer] admin notify email failed:", e.message)
    );
    res.status(201).json({ message: "Application submitted successfully", application });
  } catch (error) {
    // The certificate is already attached to the document here, so it is left
    // on disk: the file name is the only handle on the stored copy.
    if (application) return res.status(500).json({ message: error.message });
    return fail(500, error.message);
  }
});

router.get("/mine", auth, async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const applications = await Application.find().sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const previous = await Application.findById(req.params.id);
    if (!previous) return res.status(404).json({ message: "Application not found" });
    const application = await Application.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!application) return res.status(404).json({ message: "Application not found" });
    if (req.body.status && req.body.status !== previous.status) {
      const student = await Student.findOne({ applicationId: application._id });
      if (student) {
        student.status = studentStatusFromApplication(application.status);
        await student.save().catch(() => {});
      }
      sendApplicationStatusChange(application, student).catch((e) =>
        console.error("[mailer] status-change email failed:", e.message)
      );
    }
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });
    await Student.findOneAndDelete({ applicationId: application._id });
    // An applicant's certificate is personal data, so it goes when the
    // application does rather than lingering in uploads forever.
    removeCertificate(application.certificate);
    res.json({ message: "Application deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
