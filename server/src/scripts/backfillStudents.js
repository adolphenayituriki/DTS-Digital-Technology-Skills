import mongoose from "mongoose";
import dotenv from "dotenv";
import Application from "../models/Application.js";
import Student from "../models/Student.js";
import { createStudentForApplication } from "../services/studentService.js";
import { sendStudentCredentials } from "../utils/mailer.js";

dotenv.config();

// Creates a Student profile for every existing application that does not have one yet.
// Run with --email to also send the registration number and PIN to each student.
// Usage: node src/scripts/backfillStudents.js [--email]
const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const sendCredentials = process.argv.includes("--email");

  const applications = await Application.find({}).sort({ createdAt: -1 }).lean();
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const createdList = [];

  for (const application of applications) {
    const existing = await Student.findOne({ applicationId: application._id }).lean();
    if (existing) {
      skipped += 1;
      continue;
    }
    try {
      const { student, pin } = await createStudentForApplication(application);
      created += 1;
      createdList.push({
        name: application.name,
        email: application.email,
        regNumber: student.regNumber,
        status: student.status,
      });
      if (sendCredentials) {
        await sendStudentCredentials(student, { pin });
      }
    } catch (error) {
      failed += 1;
      console.error("Failed for", application.email, "-", error.message);
    }
  }

  console.log(
    `Backfill complete: ${created} created, ${skipped} already existed, ${failed} failed${sendCredentials ? " (credentials emailed)" : " (no emails sent — run with --email to send credentials)"}`
  );
  for (const entry of createdList) {
    console.log(`  ${entry.regNumber}  ${entry.name}  <${entry.email}>  [${entry.status}]`);
  }
  process.exit(0);
};

run().catch((error) => {
  console.error("Backfill error:", error.message);
  process.exit(1);
});