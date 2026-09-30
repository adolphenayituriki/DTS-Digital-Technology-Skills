import { Router } from "express";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roles.js";
import { emailProblem as checkEmail, normalizeEmail } from "../utils/email.js";
import { generateTemporaryPassword, passwordProblem } from "../utils/password.js";
import { sendStaffCredentials } from "../utils/mailer.js";

const router = Router();
const roles = ["admin", "editor", "trainer", "finance", "user"];

const publicUser = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  mustChangePassword: !!user.mustChangePassword,
  passwordUpdatedAt: user.passwordUpdatedAt || null,
  createdAt: user.createdAt,
});

// sendMail swallows its own transport errors and returns null when Brevo is
// unreachable, so a mail outage never rolls back an account the admin needs.
const mailDelivered = (result) => Array.isArray(result) ? result.some(Boolean) : !!result;

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

// Creating an account is the one moment the admin would otherwise have to
// choose a password on someone else's behalf and then read it out over the
// phone or hand it over in plain sight. Instead the password is generated
// here, emailed to the address on the account, and flagged so the recipient is
// forced to replace it on first sign-in.
//
// The admin form does not ask for a password at all, so a password is optional
// here: requiring one produced "name, email, and password are required" on a
// perfectly good submission.
router.post("/", async (req, res) => {
  try {
    // Older client builds posted `username`/`fullName`; accepting them costs
    // nothing and keeps a cached bundle working against a newer server.
    const name = String(req.body.name ?? req.body.fullName ?? req.body.username ?? "").trim();
    const email = normalizeEmail(req.body.email);
    const role = String(req.body.role ?? req.body.roleName ?? "user");
    const requestedPassword = req.body.password ? String(req.body.password) : "";

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }
    if (!roles.includes(role)) {
      return res.status(400).json({ message: "Invalid user role" });
    }
    // An admin may still type a password, but it has to clear the same policy
    // the recipient will be held to.
    if (requestedPassword) {
      const weakPassword = passwordProblem(requestedPassword);
      if (weakPassword) return res.status(400).json({ message: weakPassword });
    }
    const emailError = checkEmail(email);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ message: "User already exists" });
    }

    const temporaryPassword = requestedPassword || generateTemporaryPassword();
    const user = await User.create({
      name,
      email,
      password: temporaryPassword,
      role,
      // A trainer is only useful once they can open the trainer dashboard, and
      // the assignment screen only lists trainers, so the role is recorded
      // exactly as chosen and never silently downgraded.
      active: true,
      mustChangePassword: true,
    });

    let emailSent = false;
    try {
      const result = await sendStaffCredentials(user, temporaryPassword, {
        reason: "created",
        sentBy: req.user,
      });
      emailSent = mailDelivered(result);
    } catch (error) {
      console.error("[users] Failed to email new account credentials:", error.message);
    }

    // Hand the plaintext back only when the email did not land, so an admin can
    // still pass it on by hand instead of leaving someone locked out of an
    // account they cannot receive mail for.
    res.status(201).json({
      ...publicUser(user),
      emailSent,
      temporaryPassword: emailSent ? undefined : temporaryPassword,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "User already exists" });
    }
    res.status(500).json({ message: error.message });
  }
});

// Re-issue credentials for a user who is locked out. Same guarantees as
// creation: a fresh password nobody else has seen, emailed to the address on
// the account, and required to be changed before the dashboard opens again.
router.post("/:id/reset-password", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const temporaryPassword = generateTemporaryPassword();
    user.password = temporaryPassword;
    user.mustChangePassword = true;
    // Stamped now rather than on the real change so "password updated" never
    // advertises a timestamp the user never chose.
    user.passwordUpdatedAt = new Date();
    await user.save();

    let emailSent = false;
    try {
      const result = await sendStaffCredentials(user, temporaryPassword, {
        reason: "reset",
        sentBy: req.user,
      });
      emailSent = mailDelivered(result);
    } catch (error) {
      console.error("[users] Failed to email reset credentials:", error.message);
    }

    res.json({
      message: emailSent
        ? `A new password was emailed to ${user.email}.`
        : "The password was reset but the email could not be sent.",
      emailSent,
      temporaryPassword: emailSent ? undefined : temporaryPassword,
      user: publicUser(user),
    });
  } catch (error) {
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
      const emailError = checkEmail(req.body.email);
      if (emailError) {
        return res.status(400).json({ message: emailError });
      }
      const email = normalizeEmail(req.body.email);
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
