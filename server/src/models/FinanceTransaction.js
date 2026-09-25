import mongoose from "mongoose";

const financeTransactionSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["payment", "income", "expense"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      enum: ["RWF", "USD", "EUR", "GBP"],
      default: "RWF",
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
    intakeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Intake",
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
    method: {
      type: String,
      enum: ["cash", "mobile_money", "bank", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["completed", "pending", "voided"],
      default: "completed",
    },
    occurredAt: {
      type: Date,
      default: Date.now,
    },
    reference: {
      type: String,
      trim: true,
      default: "",
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

financeTransactionSchema.index({ studentId: 1, status: 1, occurredAt: -1 });
financeTransactionSchema.index({ intakeId: 1, status: 1, occurredAt: -1 });

export default mongoose.model("FinanceTransaction", financeTransactionSchema);
