import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const markSchema = new mongoose.Schema(
  {
    course: {
      type: String,
      required: [true, "Course is required"],
      trim: true,
    },
    // A mark is one assessment of one course, not one course. Quiz 1, Quiz 2
    // and Exam 1 are three marks on the same course, identified by
    // course + assessmentType + assessmentNo. Both new fields are optional so
    // marks recorded before this existed keep loading; they read as a single
    // unnamed assessment on the course.
    assessmentType: {
      type: String,
      trim: true,
      default: "",
    },
    assessmentNo: {
      type: Number,
      default: 1,
      min: 1,
      max: 50,
    },
    // The day the assessment was given, which is not necessarily the day the
    // mark was typed up.
    assessmentDate: {
      type: Date,
      default: Date.now,
    },
    score: {
      type: Number,
      required: [true, "Score is required"],
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    // A course counts as completed once staff tick this. It drives the
    // downloadable achievement card, so it is tracked per course rather than
    // per student: finishing one course does not mean finishing the intake.
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    recordedBy: {
      type: String,
      trim: true,
    },
    recordedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const studentSchema = new mongoose.Schema(
  {
    regNumber: {
      type: String,
      required: [true, "Registration number is required"],
      unique: true,
      trim: true,
    },
    pinHash: {
      type: String,
      required: true,
      select: false,
    },
    // Set whenever the PIN was generated on this student's behalf - at
    // registration, by an admin reset, or by the forgot-PIN recovery. The
    // profile stays reachable, but the security panel takes over until the
    // student picks a PIN of their own.
    mustChangePin: {
      type: Boolean,
      default: false,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true,
    },
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
    // How the student was taught, copied from the application. Needed because
    // the downloadable achievement card has to name the right delivery mode:
    // an online learner must not be credited with the UR-Huye campus.
    learningPlace: {
      type: String,
      trim: true,
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
    // The student's own profile photo, set from their profile page. An absolute
    // URL (or an origin-relative /api/avatars/... path), stored verbatim so the
    // client can hand it straight to <img src>. Empty means initials.
    photo: {
      type: String,
      trim: true,
      default: "",
    },
    // The Drive file id behind `photo`, held because it is the handle a delete
    // needs - the URL alone cannot identify the file to remove.
    photoFileId: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["applicant", "active", "rejected"],
      default: "applicant",
    },
    marks: {
      type: [markSchema],
      default: [],
    },
    // Which courses this student has finished, as judged by the trainer who
    // taught them. This is what unlocks the Course Appreciation card.
    //
    // It is deliberately separate from `marks[].completed`. That flag hangs off a
    // single assessment, so tying completion to it meant a course with no exam
    // could never be completed, and one mark stood in for a whole course. A
    // course is finished when a trainer says so; the assessments recorded against
    // it are evidence, not the decision.
    completedCourses: {
      type: [
        new mongoose.Schema(
          {
            course: { type: String, required: true, trim: true },
            completedAt: { type: Date, default: Date.now },
            // Who signed it off. Kept as a name as well as an id because the
            // card reads better with a person's name than an ObjectId.
            recordedBy: { type: String, trim: true },
            recordedById: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          },
          { timestamps: true }
        ),
      ],
      default: [],
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

studentSchema.methods.comparePin = function (candidatePin) {
  return bcrypt.compare(candidatePin, this.pinHash);
};

// This is the biggest collection in the database and it had no index at all on
// any field the app actually reads, so every lookup below was a full collection
// scan. Student documents are also large - `marks` and `completedCourses` are
// embedded arrays - so each scan moves a lot of data to answer a question about
// one field.
//
// Each index here matches a query that exists in the code:
//
//   { userId }              students.js /students/mine, PUT /mine/*, the
//                           student-session middleware
//   { intakeId, status }    every roster and intake-filtered list, plus the
//                           enrollment count grouped by intake
//   { intakeId, name }      the roster queries, which sort by name
//   { status, createdAt }   the admin students list and dashboard counters
//   { email }               finance and admin lookups by email
//
// `regNumber` and `applicationId` are already unique from the field definitions
// above, which builds their indexes too.
studentSchema.index({ userId: 1 });
studentSchema.index({ intakeId: 1, status: 1 });
studentSchema.index({ intakeId: 1, name: 1 });
studentSchema.index({ status: 1, createdAt: -1 });
studentSchema.index({ email: 1 });

// Multikey over `marks.course`, for the per-course assessment aggregate the
// trainer marks page runs.
studentSchema.index({ 'marks.course': 1 });

// These two exist for the search boxes, and they are the reason search on this
// collection is fast at all.
//
// A regex like /^abc/i can only be answered from an index if the indexed field
// leads with the text being matched. `name` was previously only the second half
// of { intakeId, name }, so an unfiltered search ("all intakes", no intakeId) had
// nothing to match against and scanned every student. `regNumber` already has a
// unique index from its field definition.
studentSchema.index({ name: 1 });

export default mongoose.model("Student", studentSchema);