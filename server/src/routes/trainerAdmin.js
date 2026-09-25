import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Intake from "../models/Intake.js";
import TrainerAssignment from "../models/TrainerAssignment.js";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";

const router = Router();
router.use(auth, requireRole("admin"));

const cleanCourse = (value) => String(value || "").trim();

router.get("/", async (req, res) => {
  try {
    const trainers = await User.find({ role: "trainer", active: true })
      .select("-password")
      .sort({ name: 1 });
    res.json(trainers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/assignments", async (req, res) => {
  try {
    const assignments = await TrainerAssignment.find()
      .populate("trainerId", "name email")
      .populate("intakeId", "title program courses currency")
      .sort({ active: -1, createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/assignments", async (req, res) => {
  try {
    const { trainerId, intakeId } = req.body;
    const course = cleanCourse(req.body.course);
    if (!mongoose.isValidObjectId(trainerId) || !mongoose.isValidObjectId(intakeId)) {
      return res.status(400).json({ message: "Trainer and intake are required" });
    }
    const [trainer, intake] = await Promise.all([
      User.findOne({ _id: trainerId, role: "trainer", active: true }),
      Intake.findById(intakeId),
    ]);
    if (!trainer) return res.status(404).json({ message: "Active trainer not found" });
    if (!intake) return res.status(404).json({ message: "Intake not found" });
    if (course && Array.isArray(intake.courses) && intake.courses.length && !intake.courses.some((item) => cleanCourse(item).toLowerCase() === course.toLowerCase())) {
      return res.status(400).json({ message: "Course is not part of this intake" });
    }
    const assignment = await TrainerAssignment.findOneAndUpdate(
      { trainerId, intakeId, course },
      { $set: { active: true, assignedBy: req.user._id }, $setOnInsert: { trainerId, intakeId, course } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate("trainerId", "name email").populate("intakeId", "title program courses currency");
    res.status(201).json(assignment);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This trainer is already assigned to that intake and course" });
    }
    res.status(500).json({ message: error.message });
  }
});

router.delete("/assignments/:id", async (req, res) => {
  try {
    const assignment = await TrainerAssignment.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
