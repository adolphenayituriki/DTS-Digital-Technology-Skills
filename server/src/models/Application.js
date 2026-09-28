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
  // Only applicants who already hold DTS Basic certification enter Advanced, so
  // they quote the number on the certificate they are uploading. Optional:
  // a first-time applicant has none.
  regNumber: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 20,
    default: "",
  },
  levelOfStudy: {
    type: String,
    trim: true,
    default: "",
  },
  department: {
    type: String,
    trim: true,
    default: "",
  },
  gender: {
    type: String,
    trim: true,
    default: "",
  },
  certificate: {
    type: String,
    trim: true,
    default: "",
  },
  certificateName: {
    type: String,
    trim: true,
    default: "",
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
