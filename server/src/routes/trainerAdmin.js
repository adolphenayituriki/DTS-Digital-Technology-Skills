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

// Every account holding the trainer role, not just the active ones. A trainer
// an admin has just created must appear in the dropdown immediately, and an
// account disabled by mistake has to stay visible so it can be found and fixed
// rather than silently vanishing from the only screen that manages it.
router.get("/", async (req, res) => {
  try {
    const trainers = await User.find({ role: "trainer" })
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

// Assigns one trainer to one intake or to several at once. The form sends
// `intakeIds`; a single `intakeId` is still accepted so an older client keeps
// working. Each pairing is its own assignment row, which is what the trainer's
// roster is built from.
router.post("/assignments", async (req, res) => {
  try {
    const trainerId = String(req.body.trainerId || "");
    const rawIntakeIds = Array.isArray(req.body.intakeIds)
      ? req.body.intakeIds
      : [req.body.intakeId];
    const intakeIds = [...new Set(rawIntakeIds.map((value) => String(value || "")).filter(Boolean))];
    const course = cleanCourse(req.body.course);

    if (!mongoose.isValidObjectId(trainerId) || !intakeIds.length || intakeIds.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: "Select a trainer and at least one intake" });
    }
    const [trainer, intakes] = await Promise.all([
      User.findOne({ _id: trainerId, role: "trainer" }),
      Intake.find({ _id: { $in: intakeIds } }),
    ]);
    if (!trainer) return res.status(404).json({ message: "Trainer account not found. Give the user the Trainer role first." });
    if (intakes.length !== intakeIds.length) {
      return res.status(404).json({ message: "One of the selected intakes no longer exists" });
    }
    if (trainer.active === false) {
      return res.status(400).json({ message: `${trainer.name} is disabled. Enable the account before assigning them to an intake.` });
    }
    // Refuse a course the intake does not actually teach, so a roster can never
    // end up permanently empty for a typo.
    const mismatch = course && intakes.find((intake) => {
      const courses = Array.isArray(intake.courses) ? intake.courses : [];
      return courses.length && !courses.some((item) => cleanCourse(item).toLowerCase() === course.toLowerCase());
    });
    if (mismatch) {
      return res.status(400).json({ message: `"${course}" is not a course in ${mismatch.title}` });
    }

    const created = [];
    for (const intake of intakes) {
      const assignment = await TrainerAssignment.findOneAndUpdate(
        { trainerId, intakeId: intake._id, course },
        { $set: { active: true, assignedBy: req.user._id }, $setOnInsert: { trainerId, intakeId: intake._id, course } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      created.push(assignment);
    }
    const assignments = await TrainerAssignment.find({ _id: { $in: created.map((a) => a._id) } })
      .populate("trainerId", "name email")
      .populate("intakeId", "title program courses currency");
    res.status(201).json({ assignments, count: assignments.length });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This trainer is already assigned to one of those intakes" });
    }
    res.status(500).json({ message: error.message });
  }
});

// Edit form submits here. Reassigning is a soft swap: the old row is deactivated
// and a fresh one is written, so the unique index cannot trip and the change is
// still visible in the assignment history.
router.put("/assignments/:id", async (req, res) => {
  try {
    const existing = await TrainerAssignment.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Assignment not found" });

    const trainerId = String(req.body.trainerId || existing.trainerId);
    const intakeId = String(req.body.intakeId || existing.intakeId);
    const course = req.body.course === undefined ? existing.course : cleanCourse(req.body.course);
    if (!mongoose.isValidObjectId(trainerId) || !mongoose.isValidObjectId(intakeId)) {
      return res.status(400).json({ message: "Select a trainer and an intake" });
    }
    const [trainer, intake] = await Promise.all([
      User.findOne({ _id: trainerId, role: "trainer" }),
      Intake.findById(intakeId),
    ]);
    if (!trainer) return res.status(404).json({ message: "Trainer account not found. Give the user the Trainer role first." });
    if (!intake) return res.status(404).json({ message: "Intake not found" });

    existing.active = false;
    await existing.save();

    const assignment = await TrainerAssignment.findOneAndUpdate(
      { trainerId, intakeId, course },
      { $set: { active: true, assignedBy: req.user._id }, $setOnInsert: { trainerId, intakeId, course } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .populate("trainerId", "name email")
      .populate("intakeId", "title program courses currency");
    res.json(assignment);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This trainer is already assigned to that intake and course" });
    }
    res.status(500).json({ message: error.message });
  }
});

// Removal is a deactivate, not a delete: the record is kept so attendance and
// marks already attributed to this pairing still resolve.
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
