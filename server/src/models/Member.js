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
  // The Drive file id behind `photo`, kept so a replaced photo can be deleted.
  photoFileId: {
    type: String,
    trim: true,
    default: "",
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

// The team page lists members by explicit order, newest breaking ties.
memberSchema.index({ order: 1, createdAt: -1 });

export default mongoose.model("Member", memberSchema);
