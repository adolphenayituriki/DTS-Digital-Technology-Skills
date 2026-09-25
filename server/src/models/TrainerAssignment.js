import mongoose from "mongoose";

const trainerAssignmentSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    intakeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Intake",
      required: true,
    },
    course: {
      type: String,
      trim: true,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

trainerAssignmentSchema.index(
  { trainerId: 1, intakeId: 1, course: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

export default mongoose.model("TrainerAssignment", trainerAssignmentSchema);
