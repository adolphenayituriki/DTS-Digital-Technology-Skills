import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Application from "../models/Application.js";
import { uploadToDrive, isDriveConfigured, driveStatus } from "../utils/googleDrive.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERTIFICATES_DIR = path.join(__dirname, "../../uploads/certificates");

// Moves every certificate that is still sitting on local disk into the Drive
// folder, and repoints the application at its new home.
//
// Run once, after GOOGLE_DRIVE_FOLDER_ID and the service-account key are in
// server/.env. It is safe to run more than once: an application that already
// carries a Drive file id is skipped, so a second run moves nothing.
//
// The local copy is left in place by default. That is deliberate - if Drive
// turns out to be misconfigured, or the office finds the folder hard to work
// with, the original file is still on the server and nothing is lost. Pass
// --delete-local once the migration has been verified from the admin panel.
//
// Usage: node src/scripts/migrateCertificatesToDrive.js [--delete-local]
const run = async () => {
  const status = driveStatus();
  if (!status.configured) {
    console.error("Drive is not configured. Set these first:");
    console.error("  GOOGLE_DRIVE_FOLDER_ID");
    console.error("  GOOGLE_SERVICE_ACCOUNT_JSON  (or GOOGLE_SERVICE_ACCOUNT_FILE)");
    if (status.problem) console.error(`  ${status.problem}`);
    process.exit(1);
  }
  // Read the flag before connecting so a missing config costs nothing.
  const deleteLocal = process.argv.includes("--delete-local");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Uploading to Drive folder ${status.folderId}\n`);

  // Only local paths need migrating: `certificateFileId` marks a file that is
  // already in Drive, and an empty `certificate` means there is nothing to move.
  const applications = await Application.find({
    certificate: /^\/uploads\/certificates\//,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!applications.length) {
    console.log("No local certificates to migrate.");
    await mongoose.disconnect();
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const application of applications) {
    const fileName = path.basename(application.certificate);
    // path.basename is the traversal guard: the stored value must resolve to a
    // plain file inside the certificates directory and nothing else.
    const source = path.join(CERTIFICATES_DIR, fileName);
    if (path.dirname(source) !== path.resolve(CERTIFICATES_DIR) || !fs.existsSync(source)) {
      console.error(`Missing local file for ${application.email}: ${fileName} - skipped`);
      skipped += 1;
      continue;
    }
    try {
      const buffer = fs.readFileSync(source);
      const ext = path.extname(fileName).toLowerCase();
      const mimeType =
        ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg";
      const { id } = await uploadToDrive({
        buffer,
        mimeType,
        originalName: fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80),
        hint: application.regNumber || "",
      });
      // Only repoint the application once Drive has confirmed the upload, so an
      // interrupted run can never leave a document pointing at a missing file.
      await Application.updateOne(
        { _id: application._id },
        { certificate: `/api/certificates/${id}`, certificateFileId: id }
      );
      if (deleteLocal) fs.unlinkSync(source);
      migrated += 1;
      console.log(`OK   ${application.email} -> ${id}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${application.email} - ${error.message}`);
    }
  }

  console.log(`\nMigrated ${migrated}, skipped ${skipped}, failed ${failed}.`);
  if (!deleteLocal) {
    console.log("Local copies kept. Re-run with --delete-local once verified.");
  }
  await mongoose.disconnect();
  if (failed) process.exit(1);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});