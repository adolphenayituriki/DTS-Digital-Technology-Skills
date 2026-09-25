import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    intakeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Intake",
      required: true,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionDate: {
      type: Date,
      required: true,
    },
    course: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused"],
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    recordedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

attendanceSchema.index(
  { studentId: 1, intakeId: 1, sessionDate: 1, course: 1 },
  { unique: true }
);

export default mongoose.model("Attendance", attendanceSchema);
