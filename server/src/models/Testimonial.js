import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  role: {
    type: String,
    trim: true,
  },
  content: {
    type: String,
    required: [true, "Content is required"],
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5,
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Testimonial", testimonialSchema);
