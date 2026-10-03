import mongoose from "mongoose";
import dotenv from "dotenv";
import Application from "../models/Application.js";
import Student from "../models/Student.js";

dotenv.config();

// Copies learningPlace from each application onto the student profile created
// from it. The field was added to Student so the downloadable achievement card
// can state how the training was actually delivered; student records created
// before that change have no value for it, and an online learner would
// otherwise be credited with the UR-Huye campus.
//
// Safe to re-run: only records with a missing value are touched.
// Usage: node src/scripts/backfillLearningPlace.js
const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const students = await Student.find({
    $or: [{ learningPlace: { $exists: false } }, { learningPlace: "" }],
  })
    .select("regNumber name applicationId")
    .lean();

  let updated = 0;
  let unresolved = 0;

  for (const student of students) {
    if (!student.applicationId) {
      unresolved += 1;
      console.log(`  ${student.regNumber}  ${student.name}  - no application link`);
      continue;
    }
    const application = await Application.findById(student.applicationId)
      .select("learningPlace")
      .lean();
    if (!application?.learningPlace) {
      unresolved += 1;
      console.log(`  ${student.regNumber}  ${student.name}  - application has no learning place`);
      continue;
    }
    await Student.updateOne({ _id: student._id }, { $set: { learningPlace: application.learningPlace } });
    updated += 1;
    console.log(`  ${student.regNumber}  ${student.name}  -> ${application.learningPlace}`);
  }

  console.log(`Backfill complete: ${updated} updated, ${unresolved} left unchanged.`);
  process.exit(0);
};

run().catch((error) => {
  console.error("Backfill error:", error.message);
  process.exit(1);
});
