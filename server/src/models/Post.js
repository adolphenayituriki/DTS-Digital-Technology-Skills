import mongoose from "mongoose";

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
  },
  content: {
    type: String,
    required: [true, "Content is required"],
  },
  excerpt: {
    type: String,
    trim: true,
  },
  featuredImage: {
    type: String,
  },
  category: {
    type: String,
    enum: ["news", "announcement", "event"],
    default: "news",
  },
  steps: [
    {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
    },
  ],
  isPublished: {
    type: Boolean,
    default: false,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

postSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  if (this.isModified("title") && !this.slug) {
    this.slug = generateSlug(this.title);
  }
  next();
});

postSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: Date.now() });
  if (this._update.title && !this._update.slug) {
    this.set({ slug: generateSlug(this._update.title) });
  }
  next();
});

export default mongoose.model("Post", postSchema);
