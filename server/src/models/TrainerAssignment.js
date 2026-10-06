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

// The index above cannot serve the admin assignments list. MongoDB will only use
// a partial index when it can prove the query satisfies the partial filter, and
// that list filters on nothing at all - it shows deactivated rows too - so it was
// scanning the collection and sorting it in memory. This one is unfiltered and
// matches that list's `{ active: -1, createdAt: -1 }` sort directly.
trainerAssignmentSchema.index({ active: -1, createdAt: -1 });

// The per-trainer lookup behind the roster on every trainer page.
trainerAssignmentSchema.index({ trainerId: 1, active: 1 });

export default mongoose.model("TrainerAssignment", trainerAssignmentSchema);
