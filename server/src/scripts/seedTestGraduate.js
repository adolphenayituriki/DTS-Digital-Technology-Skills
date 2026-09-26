import mongoose from "mongoose";
import dotenv from "dotenv";
import Application from "../models/Application.js";
import Intake from "../models/Intake.js";
import Student from "../models/Student.js";
import { createStudentForApplication } from "../services/studentService.js";
import { gradeForScore } from "../utils/grade.js";

dotenv.config();

// Creates a test student who has COMPLETED every course on their intake, so the
// downloadable achievement cards can be exercised end to end.
//
//   node src/scripts/seedTestGraduate.js          create or reset the test student
//   node src/scripts/seedTestGraduate.js --clean  delete the test student again
//
// Refuses to run against production unless --force is passed, because it writes
// real documents to whatever MONGODB_URI points at.
const TEST_EMAIL = "test.graduate@dts.test";
const TEST_NAME = "TESTGRADUATE Sample";

const isProd = () => /prod|production/i.test(process.env.NODE_ENV || "");

const coursesFor = (intake) => {
  const courses = Array.isArray(intake.courses) ? intake.courses.filter(Boolean) : [];
  if (courses.length > 0) return courses;
  return ["Photo & Video Editing", "Computer Maintenance", "Computer Graphics", "Online Marketing"];
};

const pickIntake = async () => {
  const existing = await Intake.findOne({ courses: { $exists: true, $ne: [] } })
    .sort({ createdAt: -1 })
    .lean();
  if (existing) return existing;

  console.log("No intake with courses found - creating one for the test data.");
  return Intake.create({
    title: "Advanced Level · Intake 2026–2027",
    program: "Advanced Level",
    description: "Auto-created by seedTestGraduate.js so the achievement cards have courses to complete.",
    courses: coursesFor(null),
    status: "open",
    capacity: 50,
    tuitionFee: 6000,
    currency: "RWF",
  });
};

const clean = async () => {
  const result = await Student.deleteMany({ email: TEST_EMAIL });
  await Application.deleteMany({ email: TEST_EMAIL });
  console.log(`Removed ${result.deletedCount} test student(s) and their application(s).`);
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  if (process.argv.includes("--clean")) {
    await clean();
    await mongoose.disconnect();
    process.exit(0);
  }

  if (isProd() && !process.argv.includes("--force")) {
    console.error("Refusing to seed test data with NODE_ENV=production. Re-run with --force if intended.");
    await mongoose.disconnect();
    process.exit(1);
  }

  // Idempotent: wipe any previous run so re-running does not pile up duplicates
  // or fight over the registration number sequence.
  await clean();

  const intake = await pickIntake();
  const courses = coursesFor(intake);

  const application = await Application.create({
    intakeId: intake._id,
    intakeTitle: intake.title,
    name: TEST_NAME,
    email: TEST_EMAIL,
    phone: "+250788000000",
    campus: "UR-Huye Campus",
    program: intake.program || "Advanced Level",
    preferredCourses: courses,
    motivation: "Automated test record for verifying the achievement card download.",
    status: "accepted",
  });

  const { student, pin } = await createStudentForApplication(application);

  // Every course completed, with a staggered completion date and a plausible
  // score so the card renders its score line too. Grades are derived from the
  // score via the shared scale so they cannot drift from the real rules.
  const base = Date.now();
  const scores = [92, 85, 78, 88, 57, 52, 45];
  student.marks = courses.map((course, i) => ({
    course,
    score: scores[i % scores.length],
    grade: gradeForScore(scores[i % scores.length]),
    remarks: "Test record",
    recordedBy: "seedTestGraduate.js",
    completed: true,
    completedAt: new Date(base - (courses.length - i) * 7 * 24 * 60 * 60 * 1000),
  }));
  student.status = "active";
  student.remarks = "Automated test record - safe to delete.";
  await student.save();

  console.log("");
  console.log("Test student created with every course completed.");
  console.log("------------------------------------------------");
  console.log(`  Registration : ${student.regNumber}`);
  console.log(`  PIN          : ${pin}`);
  console.log(`  Email        : ${student.email}`);
  console.log(`  Status       : ${student.status}`);
  console.log(`  Intake       : ${intake.title}`);
  console.log(`  Completed    : ${courses.length} course(s)`);
  for (const m of student.marks) {
    console.log(`    - ${m.course}  ${m.score}%  ${m.grade}  completed ${m.completedAt.toISOString().slice(0, 10)}`);
  }
  console.log("------------------------------------------------");
  console.log("Sign in at /profile with the registration number and PIN above.");
  console.log("Remove with: node src/scripts/seedTestGraduate.js --clean");

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("Seed error:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* already closed */
  }
  process.exit(1);
});
