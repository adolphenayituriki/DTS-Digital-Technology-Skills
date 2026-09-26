import { Router } from "express";
import Message from "../models/Message.js";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";
import { notifyAdminsNewMessage } from "../utils/mailer.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "Name, email, subject, and message are required" });
    }

    const newMessage = await Message.create({ name, email, phone, subject, message });
    notifyAdminsNewMessage(newMessage).catch((e) =>
      console.error("[mailer] new-message notification failed:", e.message)
    );
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", auth, requireRole("admin", "editor"), async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id/read", auth, requireRole("admin", "editor"), async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, requireRole("admin", "editor"), async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
