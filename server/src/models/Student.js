import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const markSchema = new mongoose.Schema(
  {
    course: {
      type: String,
      required: [true, "Course is required"],
      trim: true,
    },
    score: {
      type: Number,
      required: [true, "Score is required"],
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    // A course counts as completed once staff tick this. It drives the
    // downloadable achievement card, so it is tracked per course rather than
    // per student: finishing one course does not mean finishing the intake.
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    recordedBy: {
      type: String,
      trim: true,
    },
    recordedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const studentSchema = new mongoose.Schema(
  {
    regNumber: {
      type: String,
      required: [true, "Registration number is required"],
      unique: true,
      trim: true,
    },
    pinHash: {
      type: String,
      required: true,
      select: false,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true,
    },
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
      enum: ["applicant", "active", "rejected"],
      default: "applicant",
    },
    marks: {
      type: [markSchema],
      default: [],
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

studentSchema.methods.comparePin = function (candidatePin) {
  return bcrypt.compare(candidatePin, this.pinHash);
};

export default mongoose.model("Student", studentSchema);