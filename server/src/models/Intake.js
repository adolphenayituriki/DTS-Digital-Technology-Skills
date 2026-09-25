import mongoose from "mongoose";

const intakeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
  },
  program: {
    type: String,
    required: [true, "Program is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  courses: {
    type: [String],
    default: [],
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  deadline: {
    type: Date,
  },
  capacity: {
    type: Number,
    default: 50,
  },
  enrolled: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["open", "closed", "full"],
    default: "open",
  },
  tuitionFee: {
    type: Number,
    min: 0,
    default: 0,
  },
  currency: {
    type: String,
    enum: ["RWF", "USD", "EUR", "GBP"],
    default: "RWF",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Intake", intakeSchema);
