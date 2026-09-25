import { Router } from "express";
import jwt from "jsonwebtoken";
import Application from "../models/Application.js";
import Intake from "../models/Intake.js";
import Student from "../models/Student.js";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";
import {
  createStudentForApplication,
  studentStatusFromApplication,
} from "../services/studentService.js";
import {
  sendApplicationConfirmation,
  sendApplicationStatusChange,
  notifyAdminsNewApplication,
} from "../utils/mailer.js";

const router = Router();

const extractUser = (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    return decoded.id || null;
  } catch {
    return null;
  }
};

router.post("/", async (req, res) => {
  try {
    const { intakeId, email, phone, campus, motivation, preferredCourses } = req.body;
    const name = (req.body.name || "").trim();
    const program = (req.body.program || "").trim();
    if (!intakeId || !name || !email) {
      return res.status(400).json({ message: "Intake, name, and email are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }
    const intake = await Intake.findById(intakeId);
    if (!intake) return res.status(404).json({ message: "Intake not found" });
    if (intake.status === "closed") {
      return res.status(400).json({ message: "This intake is no longer accepting applications" });
    }
    if (intake.deadline && new Date(intake.deadline) < new Date()) {
      await Intake.findByIdAndUpdate(intakeId, { status: "closed" });
      return res.status(400).json({ message: "The application deadline for this intake has passed" });
    }
    const activeCount = await Student.countDocuments({ intakeId, status: "active" });
    if (intake.status === "full" || activeCount >= intake.capacity) {
      await Intake.findByIdAndUpdate(intakeId, { status: "full" });
      return res.status(400).json({ message: "This intake has reached full capacity" });
    }
    const duplicate = await Application.findOne({ intakeId, email, status: { $in: ["pending", "reviewed", "accepted"] } });
    if (duplicate) {
      return res.status(409).json({ message: "You have already applied for this intake" });
    }
    const courseList = Array.isArray(preferredCourses)
      ? preferredCourses.map((c) => String(c).trim()).filter(Boolean)
      : program
        ? [program]
        : [];
    const application = await Application.create({
      userId: extractUser(req),
      intakeId,
      intakeTitle: intake.title,
      name,
      email,
      phone,
      campus,
      program: courseList.join(", ") || program,
      preferredCourses: courseList,
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
    res.status(500).json({ message: error.message });
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
    res.json({ message: "Application deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
