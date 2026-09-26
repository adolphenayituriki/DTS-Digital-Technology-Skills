// Repairs malformed email addresses stored before the stricter validation.
//
//   node src/scripts/fixStudentEmails.js              dry run, changes nothing
//   node src/scripts/fixStudentEmails.js --to a@b.com  rewrite every bad record
//   node src/scripts/fixStudentEmails.js --auto        apply repairEmail() guesses
//
// The default is a dry run on purpose. Rewriting somebody's email address can
// silently break the PIN and status emails they rely on, so the intended value
// should be stated explicitly wherever possible.
import "dotenv/config";
import mongoose from "mongoose";
import Application from "../models/Application.js";
import Student from "../models/Student.js";
import connectDB from "../config/db.js";
import { isValidEmail, normalizeEmail, repairEmail } from "../utils/email.js";

const MODELS = [
  ["Student", Student],
  ["Application", Application],
];

const run = async () => {
  await connectDB();

  const applyTo = (() => {
    const i = process.argv.indexOf("--to");
    return i !== -1 ? process.argv[i + 1] : null;
  })();
  const auto = process.argv.includes("--auto");

  if (applyTo && !isValidEmail(applyTo)) {
    console.error(`--to value is not a valid email: ${applyTo}`);
    await mongoose.disconnect();
    process.exit(1);
  }
  if (!applyTo && !auto) {
    console.log("Dry run. Pass --to <email> to set one address everywhere, or --auto to apply guesses.\n");
  }

  for (const [label, Model] of MODELS) {
    const docs = await Model.find({}, { email: 1, name: 1, regNumber: 1 }).lean();
    const bad = docs.filter((d) => !isValidEmail(d.email));
    console.log(`${label}: ${bad.length} malformed of ${docs.length}`);

    for (const doc of bad) {
      const suggestion = repairEmail(doc.email);
      console.log(`  ${doc.name || ""} ${doc.regNumber || ""}`);
      console.log(`    current : ${doc.email}`);
      console.log(`    suggested: ${suggestion || "(cannot be repaired automatically)"}`);

      if (applyTo) {
        await Model.updateOne({ _id: doc._id }, { $set: { email: normalizeEmail(applyTo) } });
        console.log(`    -> set to ${normalizeEmail(applyTo)}`);
      } else if (auto && suggestion) {
        await Model.updateOne({ _id: doc._id }, { $set: { email: suggestion } });
        console.log(`    -> set to ${suggestion}`);
      } else if (auto && !suggestion) {
        console.log("    -> left unchanged, pass --to to set it manually");
      }
    }
  }

  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error("FAILED:", e.message);
  await mongoose.disconnect();
  process.exit(1);
});
