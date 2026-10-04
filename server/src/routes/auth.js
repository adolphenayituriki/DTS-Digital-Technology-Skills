import { Router } from "express";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import { signUserToken } from "../utils/token.js";
import { emailProblem as checkEmail, normalizeEmail } from "../utils/email.js";
import { PASSWORD_MIN_LENGTH, passwordProblem } from "../utils/password.js";

const router = Router();

// Shape returned to the client for the signed-in user. Kept in one place so
// /login, /register, /me and PUT /me can never drift apart.
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  photo: user.photo || "",
  // Sent back so the profile page can delete the copy it just replaced. Without
  // it every photo update orphans the previous file in Drive.
  photoFileId: user.photoFileId || "",
  role: user.role,
  mustChangePassword: !!user.mustChangePassword,
  passwordUpdatedAt: user.passwordUpdatedAt || null,
  createdAt: user.createdAt,
});

router.post("/register", async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const emailError = checkEmail(email);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    // Self-service signup: the person chose this password themselves, so there
    // is nothing to rotate away from.
    const weakPassword = passwordProblem(password);
    if (weakPassword) {
      return res.status(400).json({ message: weakPassword });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password, role: "user", mustChangePassword: false });
    const token = signUserToken(user._id);

    res.status(201).json({
      token,
      user: publicUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch || user.active === false) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signUserToken(user._id);

    res.json({
      token,
      user: publicUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    res.json(publicUser(req.user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Self-service profile edit. Deliberately narrow: a user may change their own
// name, phone and photo, and their own email. Role, active and password are
// never writable here - password has its own endpoint below, and role/active
// stay under /api/users (admin only) so an account can never escalate itself.
router.put("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Account not found" });

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: "Name is required" });
      user.name = name;
    }

    if (req.body.phone !== undefined) {
      user.phone = String(req.body.phone).trim();
    }

    if (req.body.photo !== undefined) {
      // Accept either an absolute URL from POST /api/upload/avatar, or a path
      // served by this API (/uploads/..., /api/avatars/...) or the client
      // (/Logo.png). Anything else (javascript:, data:, another origin) is
      // rejected.
      const photo = String(req.body.photo).trim();
      if (photo) {
        const isApiPath = photo.startsWith("/uploads/") || photo.startsWith("/api/avatars/");
        const isSameOriginPath = photo.startsWith("/") && !photo.startsWith("//");
        const isOwnOrigin = /^https?:\/\//i.test(photo);
        if (!isApiPath && !isSameOriginPath && !isOwnOrigin) {
          return res.status(400).json({ message: "Photo must be a valid image URL" });
        }
      }
      user.photo = photo;
      // The Drive id travels with the URL and is stored alongside it. Clearing the
      // photo clears the id with it, so a removed photo is never left holding a
      // handle to a file it no longer points at.
      if (req.body.photoFileId !== undefined) {
        user.photoFileId = String(req.body.photoFileId).trim();
      } else if (!photo) {
        user.photoFileId = "";
      }
    }

    if (req.body.email !== undefined) {
      const email = normalizeEmail(req.body.email);
      const emailError = checkEmail(email);
      if (emailError) return res.status(400).json({ message: emailError });

      // unique index on email would otherwise throw a raw E11000
      const taken = await User.findOne({ email, _id: { $ne: user._id } });
      if (taken) return res.status(400).json({ message: "Email is already in use" });
      user.email = email;
    }

    await user.save();
    res.json({ message: "Profile updated", user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// The one place a password can be changed by the person who owns it. It is
// deliberately reachable while mustChangePassword is still true - that is how
// the flag gets cleared - and it always demands the current password, so a
// borrowed session cannot be used to lock the real owner out.
router.put("/password", auth, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ message: `New password must be at least ${PASSWORD_MIN_LENGTH} characters` });
    }
    const weakPassword = passwordProblem(newPassword);
    if (weakPassword) {
      return res.status(400).json({ message: weakPassword });
    }

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    if (await user.comparePassword(newPassword)) {
      return res.status(400).json({ message: "Your new password must be different from the current one" });
    }

    user.password = newPassword;
    // Pre-save hook hashes it. Clearing the flag here is what releases the
    // account from the forced-change screen on every dashboard.
    user.mustChangePassword = false;
    user.passwordUpdatedAt = new Date();
    await user.save();

    // The cached session on the client still carries mustChangePassword, so
    // hand back the refreshed user for it to merge in.
    res.json({ message: "Password updated successfully", user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
