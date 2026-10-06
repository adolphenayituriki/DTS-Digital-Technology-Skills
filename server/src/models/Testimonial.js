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

// The public carousel reads approved testimonials newest-first; the admin list
// reads all of them. Neither filter-and-sort pair had an index, so both sorted
// the whole collection in memory on every request.
testimonialSchema.index({ isApproved: 1, createdAt: -1 });
testimonialSchema.index({ createdAt: -1 });

export default mongoose.model("Testimonial", testimonialSchema);
