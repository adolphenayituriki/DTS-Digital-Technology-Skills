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
  LEARNING_PLACES,
  REG_NUMBER_PATTERN,
  optionProblem,
} from "../utils/options.js";
import { earlyPaymentNotice } from "../utils/fees.js";
import { renameInDrive } from "../utils/googleDrive.js";
import {
  parseCertificateUpload,
  storeCertificate,
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
    let stored = null;
  // Nothing is written anywhere until every check below has passed, so a
  // rejected submission leaves nothing behind. Once `stored` is set, every exit
  // below has to either attach it to an application or delete it - otherwise a
  // certificate outlives the application that carried it.
  const discard = () => {
    if (stored) removeCertificate(stored.url, stored.fileId);
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
      learningPlace: rawLearningPlace,
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
    // Applicants are issued a Gmail address for their student profile, so a new
    // application has to be reachable on one. `www.nayituriki.com@gmail.com` and
    // every other dotted local part is still accepted as typed.
    const emailError = checkEmail(rawEmail, { requireGmail: true });
    if (emailError) {
      return fail(400, emailError);
    }
    if (regNumber && !REG_NUMBER_PATTERN.test(regNumber)) {
      return fail(400, "Registration number looks incorrect. Example: 225020019");
    }
    const optionErrors = [
      optionProblem(LEVELS_OF_STUDY, levelOfStudy, "Level of study"),
      optionProblem(GENDERS, gender, "Gender"),
      optionProblem(LEARNING_PLACES, rawLearningPlace, "Learning place"),
    ].filter(Boolean);
    if (optionErrors.length) {
      return fail(400, optionErrors[0]);
    }
    const learningPlace = String(rawLearningPlace || "").trim();
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
    // The certificate is stored here, after the last check and just before the
    // document is written, so a rejected applicant never causes a file to be
    // pushed to Drive. The reg number prefixes the stored file so a staff member
    // browsing the folder can tell whose certificate they are looking at.
    try {
      stored = advanced && uploaded ? await storeCertificate(uploaded, { hint: regNumber }) : null;
    } catch (error) {
      console.error("[applications] Failed to store certificate:", error.message);
      return fail(500, "The certificate could not be saved. Please try again in a moment.");
    }
    application = await Application.create({
      userId: extractUser(req),
      intakeId,
      intakeTitle: intake.title,
      name,
      regNumber,
      email,
      phone,
      campus,
      learningPlace,
      program: courseList.join(", ") || program,
      preferredCourses: courseList,
      levelOfStudy: String(levelOfStudy || "").trim(),
      department: String(department || "").trim(),
      gender: String(gender || "").trim(),
      // Only kept for an Advanced applicant, so the field always means
      // "this is the proof for this session" and never carries a stray upload
      // that nobody asked for.
      certificate: stored ? stored.url : "",
      certificateFileId: stored ? stored.fileId : "",
      certificateName: stored ? stored.name : "",
      motivation,
    });
    let credentials = null;
    try {
      const { student, pin } = await createStudentForApplication(application);
      credentials = { regNumber: student.regNumber, pin };
    } catch (error) {
      console.error("[applications] Failed to create student profile:", error.message);
    }
    // The DTS registration number is only assigned now, when the student profile
    // was created - it did not exist while the certificate was uploaded, which is
    // why the file went up under a temporary name. Renaming it to the registration
    // number is what makes the Drive folder readable: that number is what staff
    // will be looking for, and the extension is preserved so the file still opens.
    // Not fatal if it fails - the certificate is stored and attached either way,
    // only its filename would be less useful.
    if (stored?.fileId && credentials?.regNumber && uploaded?.ext) {
      try {
        await renameInDrive(stored.fileId, `${credentials.regNumber}${uploaded.ext}`);
      } catch (error) {
        console.error("[applications] Could not rename certificate:", error.message);
      }
    }
    sendApplicationConfirmation(application, intake, credentials).catch((e) =>
      console.error("[mailer] confirmation email failed:", e.message)
    );
    notifyAdminsNewApplication(application, intake).catch((e) =>
      console.error("[mailer] admin notify email failed:", e.message)
    );
    // The 2,000 RWF early-payment notice travels back with the response so the
    // card the applicant reads is driven by the same number the email quotes,
    // and changing the amount never needs a client rebuild.
    res.status(201).json({
      message: "Application submitted successfully",
      application,
      earlyPayment: earlyPaymentNotice(),
    });
  } catch (error) {
    // The certificate is already attached to the document here, so it is left
    // in storage: the file id is the only handle on the stored copy.
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
    // application does rather than lingering in Drive forever. The file id
    // identifies the Drive copy; the stored url covers local files from before
    // Drive was configured.
    removeCertificate(application.certificate, application.certificateFileId);
    res.json({ message: "Application deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
