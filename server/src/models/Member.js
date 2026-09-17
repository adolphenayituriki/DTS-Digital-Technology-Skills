import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  role: {
    type: String,
    required: [true, "Role is required"],
    trim: true,
  },
  bio: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  photo: {
    type: String,
  },
  isLeadership: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Member", memberSchema);
