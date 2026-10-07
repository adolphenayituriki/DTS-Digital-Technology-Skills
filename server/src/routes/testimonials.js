import { Router } from "express";
import Testimonial from "../models/Testimonial.js";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";
import { notifyAdminsNewTestimonial } from "../utils/mailer.js";
import { parsePage, pageResponse } from "../utils/pagination.js";

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

router.get("/all", auth, requireRole("admin", "editor", "secretary"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePage(req.query);
    const [items, total] = await Promise.all([
      Testimonial.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Testimonial.countDocuments(),
    ]);
    res.json(pageResponse({ items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    // Public route, so the body is coerced and capped rather than trusted:
    // strings only, lengths the admin list and the carousel can display, and a
    // rating that falls back to 5 instead of failing schema validation.
    const name = String(req.body.name ?? "").trim();
    const role = String(req.body.role ?? "").trim().slice(0, 100);
    const content = String(req.body.content ?? "").trim();
    const rating = Number(req.body.rating);

    if (!name || !content) {
      return res
        .status(400)
        .json({ message: "Name and content are required" });
    }
    if (name.length > 80 || content.length > 800) {
      return res.status(400).json({
        message: "Name must be 80 characters or fewer and the testimonial 800 or fewer.",
      });
    }

    const testimonial = await Testimonial.create({
      name,
      role,
      content,
      rating: rating >= 1 && rating <= 5 ? rating : 5,
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
