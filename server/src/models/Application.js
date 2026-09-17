import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  intakeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Intake",
    required: true,
  },
  intakeTitle: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  campus: {
    type: String,
    trim: true,
  },
  program: {
    type: String,
    trim: true,
  },
  preferredCourses: {
    type: [String],
    default: [],
  },
  motivation: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["pending", "reviewed", "accepted", "rejected"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Application", applicationSchema);
