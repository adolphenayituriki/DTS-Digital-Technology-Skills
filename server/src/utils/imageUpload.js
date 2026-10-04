// Storage for profile pictures (avatars).
//
// Why this exists rather than reusing /uploads: the API runs on Render, whose
// filesystem is wiped on every redeploy, so a photo written to local disk is
// silently gone after the next deploy - Avatar.jsx catches the 404 and falls back
// to initials, so the loss is invisible. Drive persists.
//
// The shape mirrors utils/certificateUpload.js: Drive when it is configured,
// local disk when it is not, so a deploy without credentials still works.
//
// Avatars are resized in the browser before they are ever sent (see
// client/src/utils/imageResize.js), so what arrives here is already small. The
// bytes are still sniffed, because a client-supplied extension and Content-Type
// are attacker-controlled and this endpoint is reachable by any signed-in user.
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { isDriveConfigured, uploadToDrive } from "./googleDrive.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The client already downscales, so this ceiling only has to catch a client that
// skipped that step. It stays low because a real avatar is far under it.
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const AVATARS_DIR = path.join(__dirname, "../../uploads/avatars");

fs.mkdirSync(AVATARS_DIR, { recursive: true });

// Header signature per extension. The stored extension always describes the real
// content rather than whatever the client called it.
const SIGNATURES = [
  { ext: ".jpg", mime: "image/jpeg", head: [0xff, 0xd8, 0xff] },
  { ext: ".png", mime: "image/png", head: [0x89, 0x50, 0x4e, 0x47] },
  { ext: ".gif", mime: "image/gif", head: [0x47, 0x49, 0x46, 0x38] },
  // RIFF....WEBP - the format tag is at byte 8, not byte 0.
  { ext: ".webp", mime: "image/webp", head: [0x52, 0x49, 0x46, 0x46], tagAt: 8, tag: [0x57, 0x45, 0x42, 0x50] },
];

// Windows and some Android galleries send these for a file whose extension they
// do not recognise. The signature check decides, so they are let through to it.
const AMBIGUOUS_MIMES = new Set(["", "application/octet-stream", "binary/octet-stream"]);

const matches = (buffer, bytes, at = 0) =>
  bytes.every((byte, i) => buffer[at + i] === byte);

export const sniffImage = (buffer) => {
  if (!buffer || !buffer.length) return null;
  for (const signature of SIGNATURES) {
    if (matches(buffer, signature.head) && (!signature.tag || matches(buffer, signature.tag, signature.tagAt))) {
      return signature;
    }
  }
  return null;
};

// Memory rather than disk: the bytes are needed to push to Drive, and the
// ceiling above bounds the buffer.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const mime = String(file.mimetype || "").toLowerCase();
  const known = SIGNATURES.some((signature) => signature.mime === mime);
  if (!known && !AMBIGUOUS_MIMES.has(mime)) {
    return cb(new Error("Photo must be a JPG, PNG, GIF or WebP image"));
  }
  cb(null, true);
};

const avatarUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
});

// Validates the bytes and hands the buffer on. Nothing is persisted here, so a
// rejected upload cannot leave an orphan behind.
export const parseAvatarUpload = (req, res, next) => {
  avatarUpload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "That photo is too large. Maximum size is 2 MB." });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ message: 'Send the photo as a file field named "file"' });
      }
      return res.status(400).json({ message: err.message });
    }
    if (req.file) {
      const real = sniffImage(req.file.buffer);
      if (!real) {
        return res.status(400).json({
          message: "That file is not a readable image. Try choosing the photo again from your gallery.",
        });
      }
      req.avatar = { buffer: req.file.buffer, mimeType: real.mime, ext: real.ext };
    }
    next();
  });
};

// Avatars live in their own folder so the certificates folder stays a clean
// archive of documents. Falls back to the certificates folder when unset, which
// is tidier than putting photos somewhere unrelated.
export const AVATARS_FOLDER_ID = () =>
  (process.env.GOOGLE_DRIVE_AVATARS_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID || "").trim();

export const isAvatarDriveConfigured = () => Boolean(AVATARS_FOLDER_ID());

// `url` is what the client stores and later puts in an <img src>. For Drive that
// is an API route keyed by file id; for the local fallback it is the static path.
export const storeAvatar = async (uploaded, { hint = "" } = {}) => {
  if (!uploaded) return null;

  if (isDriveConfigured() && AVATARS_FOLDER_ID()) {
    const label = String(hint || "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 40);
    // No timestamp here: uploadToDrive already appends a random suffix, and
    // adding one twice produced names like "avatar.png-abc123-abc123-def456".
    const { id } = await uploadToDrive({
      buffer: uploaded.buffer,
      mimeType: uploaded.mimeType,
      originalName: `${label ? `${label}-` : ""}avatar${uploaded.ext}`,
      folderId: AVATARS_FOLDER_ID(),
    });
    return { url: `/api/avatars/${id}`, fileId: id };
  }

  const storedName = `${crypto.randomBytes(16).toString("hex")}${uploaded.ext}`;
  await fs.promises.writeFile(path.join(AVATARS_DIR, storedName), uploaded.buffer);
  return { url: `/uploads/avatars/${storedName}`, fileId: "" };
};

// Replaced photos are deleted rather than left behind. Nothing did this before:
// every re-upload overwrote the database string and orphaned the old file, which
// is invisible on Render because the container is wiped anyway, but would grow
// without bound on any persistent store.
export const removeAvatar = (url, fileId) => {
  if (fileId) {
    import("./googleDrive.js")
      .then(({ deleteFromDrive }) => deleteFromDrive(fileId))
      .catch(() => {});
    return;
  }
  if (!url || !url.startsWith("/uploads/avatars/")) return;
  const target = path.join(__dirname, "../..", url);
  // Confine the delete to the avatars directory even if the stored value is
  // somehow absolute or contains traversal.
  if (path.resolve(path.dirname(target)) === path.resolve(AVATARS_DIR)) {
    fs.unlink(target, () => {});
  }
};