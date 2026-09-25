import { Router } from "express";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";

const router = Router();
const roles = ["admin", "editor", "trainer", "finance", "user"];

const publicUser = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt,
});

router.use(auth, requireRole("admin"));

router.get("/", async (req, res) => {
  try {
    const { role, q } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (q) {
      const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: rx }, { email: rx }];
    }
    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.json(users.map(publicUser));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, password, role = "user" } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    if (!roles.includes(role)) {
      return res.status(400).json({ message: "Invalid user role" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ message: "User already exists" });
    }
    const user = await User.create({ name, email: normalizedEmail, password, role });
    res.status(201).json(publicUser(user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "User already exists" });
    }
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (String(user._id) === String(req.user._id) && (req.body.active === false || (req.body.role && req.body.role !== "admin"))) {
      return res.status(400).json({ message: "You cannot remove your own administrator access" });
    }
    if (req.body.name !== undefined) user.name = String(req.body.name).trim();
    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "A valid email is required" });
      }
      const duplicate = await User.findOne({ email, _id: { $ne: user._id } });
      if (duplicate) return res.status(409).json({ message: "User already exists" });
      user.email = email;
    }
    if (req.body.role !== undefined) {
      if (!roles.includes(req.body.role)) return res.status(400).json({ message: "Invalid user role" });
      user.role = req.body.role;
    }
    if (req.body.active !== undefined) user.active = !!req.body.active;
    await user.save();
    res.json(publicUser(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "User already exists" });
    res.status(500).json({ message: error.message });
  }
});

export default router;
