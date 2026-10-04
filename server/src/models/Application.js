import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  intakeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Intake",
    required: true,
  },
  intakeTitle: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  // Only applicants who already hold DTS Basic certification enter Advanced, so
  // they quote the number on the certificate they are uploading. Optional:
  // a first-time applicant has none.
  regNumber: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 20,
    default: "",
  },
  levelOfStudy: {
    type: String,
    trim: true,
    default: "",
  },
  department: {
    type: String,
    trim: true,
    default: "",
  },
  gender: {
    type: String,
    trim: true,
    default: "",
  },
  // Where the certificate can be opened from. A Drive-hosted certificate is an
  // API route keyed by file id (see routes/certificates.js); anything written
  // before Drive was configured keeps the local /uploads path.
  certificate: {
    type: String,
    trim: true,
    default: "",
  },
  // The Drive file id, kept separately because it is the handle a delete needs.
  // Empty for locally-stored certificates and for applications with none.
  certificateFileId: {
    type: String,
    trim: true,
    default: "",
  },
  certificateName: {
    type: String,
    trim: true,
    default: "",
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  campus: {
    type: String,
    trim: true,
  },
  // Where this applicant wants to train: on campus at UR-Huye, or online over
  // Zoom / Google Meet. Validated against LEARNING_PLACES at the route, so it is
  // always one of the values the form could have produced.
  learningPlace: {
    type: String,
    trim: true,
    default: "",
  },
  program: {
    type: String,
    trim: true,
  },
  preferredCourses: {
    type: [String],
    default: [],
  },
  motivation: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["pending", "reviewed", "accepted", "rejected"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Application", applicationSchema);
