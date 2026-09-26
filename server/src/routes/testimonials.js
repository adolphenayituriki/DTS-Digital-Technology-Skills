import { Router } from "express";
import Testimonial from "../models/Testimonial.js";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";
import { notifyAdminsNewTestimonial } from "../utils/mailer.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ isApproved: true }).sort({
      createdAt: -1,
    });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/all", auth, requireRole("admin", "editor"), async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, role, content, rating } = req.body;

    if (!name || !content) {
      return res
        .status(400)
        .json({ message: "Name and content are required" });
    }

    const testimonial = await Testimonial.create({
      name,
      role,
      content,
      rating,
    });
    notifyAdminsNewTestimonial(testimonial).catch((e) =>
      console.error("[mailer] new-testimonial notification failed:", e.message)
    );
    res.status(201).json(testimonial);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id/approve", auth, requireRole("admin", "editor"), async (req, res) => {
  try {
    const isApproved = req.body.isApproved === undefined ? true : !!req.body.isApproved;
    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true }
    );

    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found" });
    }

    res.json(testimonial);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, requireRole("admin", "editor"), async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);

    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found" });
    }

    res.json({ message: "Testimonial deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
