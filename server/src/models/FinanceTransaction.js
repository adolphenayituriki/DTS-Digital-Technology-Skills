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

// Nearly every finance query filters on `kind` as well as `status` - "payments
// only", "expenses only" - but `kind` was missing from both indexes, so the
// server could only use them on their `studentId`/`intakeId` prefix and had to
// filter the rest itself. The `occurredAt` tiebreak that most of those queries
// also sort on is now part of the key rather than an in-memory sort.
financeTransactionSchema.index({ studentId: 1, kind: 1, status: 1, occurredAt: -1 });
financeTransactionSchema.index({ intakeId: 1, kind: 1, status: 1, occurredAt: -1 });

// The unfiltered ledger list, which sorts on occurredAt then createdAt.
financeTransactionSchema.index({ occurredAt: -1, createdAt: -1 });
financeTransactionSchema.index({ kind: 1, occurredAt: -1 });

// The ledger's search box. It is an $or across three fields, and MongoDB answers
// an $or by unioning one index per branch, so each field needs its own index for
// the search to be answered from indexes at all - with none of them, one search
// keystroke walked the whole ledger.
//
// `notes` is deliberately included even though it is free text and costs the most
// to index: without it, that branch alone degrades the whole $or back to a scan,
// which defeats the other two.
financeTransactionSchema.index({ reference: 1 });
financeTransactionSchema.index({ category: 1 });
financeTransactionSchema.index({ notes: 1 });

export default mongoose.model("FinanceTransaction", financeTransactionSchema);
