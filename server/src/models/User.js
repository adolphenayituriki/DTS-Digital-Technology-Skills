import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ["admin", "editor", "trainer", "finance", "secretary", "user"],
    default: "user",
  },
  // Self-service profile fields. The photo is an absolute URL returned by
  // POST /api/upload/avatar, or a seeded client path like "/Teams/..." - both
  // are stored verbatim so the client can drop it straight into <img src>.
  phone: {
    type: String,
    trim: true,
    default: "",
  },
  photo: {
    type: String,
    trim: true,
    default: "",
  },
  // The Drive file id behind `photo`. Held separately because it is the handle a
  // delete needs - the URL alone cannot identify the file to remove. Empty for
  // seeded paths and for photos uploaded before Drive was configured.
  photoFileId: {
    type: String,
    trim: true,
    default: "",
  },
  active: {
    type: Boolean,
    default: true,
  },
  // Set whenever an admin issues a password on this user's behalf. The account
  // still signs in normally, but every dashboard is blocked behind the
  // change-password form until the user picks their own - which is the only
  // point where the temporary password stops being the real one.
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
  // Last time the user chose their own password, for the "last changed" hint.
  passwordUpdatedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
