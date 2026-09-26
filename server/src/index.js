// Must be the FIRST import: ES module imports are hoisted and evaluated before
// any statement in this file, so a plain `dotenv.config()` call further down
// would run too late for every module that reads process.env at load time.
import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/messages.js";
import memberRoutes from "./routes/members.js";
import postRoutes from "./routes/posts.js";
import testimonialRoutes from "./routes/testimonials.js";
import uploadRoutes from "./routes/upload.js";
import intakeRoutes from "./routes/intakes.js";
import applicationRoutes from "./routes/applications.js";
import studentRoutes from "./routes/students.js";
import userRoutes from "./routes/users.js";
import trainerRoutes from "./routes/trainer.js";
import trainerAdminRoutes from "./routes/trainerAdmin.js";
import financeRoutes from "./routes/finance.js";
import statsRoutes from "./routes/stats.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.get("/assets/Logo.png", (req, res) => {
  const logoPath = path.join(__dirname, "../../client/public/Logo.png");
  if (!fs.existsSync(logoPath)) return res.status(404).end();
  const buffer = fs.readFileSync(logoPath);
  const signature = buffer.subarray(0, 3).toString("hex");
  const contentType =
    signature === "ffd8ff" ? "image/jpeg" : signature === "89504e" ? "image/png" : "application/octet-stream";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(buffer);
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/intakes", intakeRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/trainer", trainerRoutes);
app.use("/api/trainers", trainerAdminRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/stats", statsRoutes);

app.get("/api/status", async (req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbState = dbStates[mongoose.connection.readyState] || "unknown";
  res.json({
    ok: dbState === "connected",
    service: "dts-api",
    version: "student-registry-v2",
    db: dbState,
    time: new Date().toISOString(),
  });
});

const distDir = path.join(__dirname, "../../client/dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.json({ message: "DTS API is running" });
  });
}

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
