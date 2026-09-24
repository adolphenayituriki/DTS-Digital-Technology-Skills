import { Router } from "express";
import jwt from "jsonwebtoken";
import Application from "../models/Application.js";
import Intake from "../models/Intake.js";
import auth from "../middleware/auth.js";
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
    const enrolledCount = await Application.countDocuments({ intakeId });
    if (intake.status === "full" || enrolledCount >= intake.capacity) {
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
    await Intake.findByIdAndUpdate(intakeId, { enrolled: intake.enrolled + 1 });
    sendApplicationConfirmation(application, intake);
    notifyAdminsNewApplication(application, intake);
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

router.get("/", auth, async (req, res) => {
  try {
    const applications = await Application.find().sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const previous = await Application.findById(req.params.id);
    if (!previous) return res.status(404).json({ message: "Application not found" });
    const application = await Application.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!application) return res.status(404).json({ message: "Application not found" });
    if (req.body.status && req.body.status !== previous.status) {
      sendApplicationStatusChange(application);
    }
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });
    await Intake.findByIdAndUpdate(application.intakeId, { $inc: { enrolled: -1 } });
    res.json({ message: "Application deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
