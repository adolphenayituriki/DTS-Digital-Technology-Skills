import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import Member from "../models/Member.js";
import { uploadToDrive } from "../utils/googleDrive.js";
import { AVATARS_FOLDER_ID, sniffImage } from "../utils/imageUpload.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../../uploads");

// Moves profile pictures that are still on local disk into Drive, and repoints
// the row at the new home.
//
// This matters more than a tidy-up: the API runs on Render, whose filesystem is
// wiped on every redeploy. Every avatar in /uploads is already unreachable there
// - Avatar.jsx catches the 404 and silently falls back to initials, so the loss
// is invisible. Drive persists.
//
// Only rows whose photo is a local /uploads path are touched. Seeded rows point
// at client assets like "/Teams/..." and are left alone.
//
// Local copies are kept by default, since deleting them before the new URLs are
// verified would remove the only remaining copy. Pass --delete-local once the
// photos have been checked in the admin panel and on the public Team page.
//
// Usage: node src/scripts/migrateAvatarsToDrive.js [--delete-local]
const run = async () => {
  const folderId = AVATARS_FOLDER_ID();
  if (!folderId) {
    console.error("Set GOOGLE_DRIVE_AVATARS_FOLDER_ID (or GOOGLE_DRIVE_FOLDER_ID) first.");
    process.exit(1);
  }
  const deleteLocal = process.argv.includes("--delete-local");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Uploading avatars to Drive folder ${folderId}\n`);

  const targets = [
    { model: User, label: "user" },
    { model: Member, label: "member" },
  ];
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const { model, label } of targets) {
    const rows = await model.find({ photo: /^\/uploads\// }).lean();
    if (!rows.length) continue;

    for (const row of rows) {
      const fileName = path.basename(row.photo);
      // path.basename is the traversal guard: the stored value must resolve to a
      // plain file inside the uploads directory and nothing else.
      const source = path.join(UPLOADS_DIR, fileName);
      if (path.dirname(source) !== path.resolve(UPLOADS_DIR) || !fs.existsSync(source)) {
        console.error(`Missing local file for ${label} ${row.name}: ${fileName} - skipped`);
        skipped += 1;
        continue;
      }
      try {
        const buffer = fs.readFileSync(source);
        // The extension in the stored path came from the client, so decide the
        // real type from the bytes as the upload route itself does.
        const real = sniffImage(buffer);
        if (!real) {
          console.error(`${label} ${row.name}: ${fileName} is not a readable image - skipped`);
          skipped += 1;
          continue;
        }
        const { id } = await uploadToDrive({
          buffer,
          mimeType: real.mime,
          originalName: `${row.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 40)}-avatar${real.ext}`,
          folderId,
        });
        // Repoint only after Drive confirms the upload, so an interrupted run can
        // never leave a row pointing at a file that was never stored.
        await model.updateOne(
          { _id: row._id },
          { photo: `/api/avatars/${id}`, photoFileId: id }
        );
        if (deleteLocal) fs.unlinkSync(source);
        migrated += 1;
        console.log(`OK   ${label} ${row.name} -> ${id}`);
      } catch (error) {
        failed += 1;
        console.error(`FAIL ${label} ${row.name} - ${error.message}`);
      }
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