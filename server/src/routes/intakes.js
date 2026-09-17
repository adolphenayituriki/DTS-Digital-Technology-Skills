import { Router } from "express";
import Intake from "../models/Intake.js";
import auth from "../middleware/auth.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const intakes = await Intake.find({ status: "open" }).sort({ deadline: 1 });
    res.json(intakes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/all", auth, async (req, res) => {
  try {
    const intakes = await Intake.find().sort({ createdAt: -1 });
    res.json(intakes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { title, program, description, courses, startDate, endDate, deadline, capacity } = req.body;
    if (!title || !program) {
      return res.status(400).json({ message: "Title and program are required" });
    }
    const courseList = Array.isArray(courses)
      ? courses.map((c) => String(c).trim()).filter(Boolean)
      : typeof courses === "string"
        ? courses.split(",").map((c) => c.trim()).filter(Boolean)
        : [];
    const intake = await Intake.create({ title, program, description, courses: courseList, startDate, endDate, deadline, capacity });
    res.status(201).json(intake);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const intake = await Intake.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!intake) return res.status(404).json({ message: "Intake not found" });
    res.json(intake);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const intake = await Intake.findByIdAndDelete(req.params.id);
    if (!intake) return res.status(404).json({ message: "Intake not found" });
    res.json({ message: "Intake deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
