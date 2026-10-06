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

// The unique index above can find a student's attendance by `studentId` but
// cannot use it for the sort: `intakeId` and `course` sit between `studentId`
// and `sessionDate` in that key, so ordering still had to happen in memory over
// every record for the student. Both read paths - the trainer dashboard and the
// student's own history - filter on `studentId` alone and sort by
// `{ sessionDate: -1, createdAt: -1 }`, which this index serves directly.
attendanceSchema.index({ studentId: 1, sessionDate: -1, createdAt: -1 });

// Clearing a session deletes by intake, course and date.
attendanceSchema.index({ intakeId: 1, course: 1, sessionDate: -1 });

export default mongoose.model("Attendance", attendanceSchema);
