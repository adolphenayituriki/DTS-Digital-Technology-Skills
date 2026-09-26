import { Router } from "express";
import Intake from "../models/Intake.js";
import Student from "../models/Student.js";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";

const router = Router();

const withEnrollment = async (intakes) => {
  const counts = await Student.aggregate([
    { $match: { status: "active" } },
    { $group: { _id: "$intakeId", count: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((r) => [String(r._id), r.count]));
  return intakes.map((i) => ({ ...i.toObject(), enrolled: map.get(String(i._id)) || 0 }));
};

router.get("/", async (req, res) => {
  try {
    const intakes = await Intake.find({ status: "open" }).select("-tuitionFee -currency").sort({ deadline: 1 });
    res.json(await withEnrollment(intakes));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/all", auth, requireRole("admin", "finance"), async (req, res) => {
  try {
    const intakes = await Intake.find().sort({ createdAt: -1 });
    res.json(await withEnrollment(intakes));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
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

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    // Read the stored title first. `findByIdAndUpdate` below is called with
    // `new: true`, so it returns the already-updated document and comparing the
    // request body against that result afterwards is always false, which meant
    // a renamed intake never propagated to its students.
    const previous = await Intake.findById(req.params.id).select("title").lean();
    if (!previous) return res.status(404).json({ message: "Intake not found" });

    const intake = await Intake.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!intake) return res.status(404).json({ message: "Intake not found" });

    // Students denormalise the intake title onto their own record. Keep it in
    // step so the balances list never shows a stale label next to a live fee.
    const nextTitle = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (nextTitle && nextTitle !== previous.title) {
      await Student.updateMany({ intakeId: intake._id }, { $set: { intakeTitle: intake.title } });
    }
    res.json(intake);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    // Deleting an intake that students still point at leaves them with a
    // dangling reference: their required fee silently becomes 0 and payments
    // start failing. Refuse while it is in use.
    const attached = await Student.countDocuments({ intakeId: req.params.id });
    if (attached > 0) {
      return res.status(409).json({
        message: `Cannot delete: ${attached} student${attached === 1 ? "" : "s"} still registered under this intake. Move or remove those students first.`,
      });
    }
    const intake = await Intake.findByIdAndDelete(req.params.id);
    if (!intake) return res.status(404).json({ message: "Intake not found" });
    res.json({ message: "Intake deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
