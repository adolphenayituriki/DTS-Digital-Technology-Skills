import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/intakes", intakeRoutes);
app.use("/api/applications", applicationRoutes);

app.get("/", (req, res) => {
  res.json({ message: "DTS API is running" });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
