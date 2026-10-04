import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import auth from "../middleware/auth.js";
import { parseAvatarUpload, storeAvatar, removeAvatar } from "../utils/imageUpload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "../../uploads");

// On a fresh container the uploads folder is not in the image, and multer fails
// the request with a bare ENOENT that reads to the user as "Request failed".
// Creating it up front turns a confusing 500 into a working upload.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, jpeg, png, gif, webp) are allowed"));
  }
};

// Admins and editors post news hero images, so they keep the full 5 MB. Every
// other signed-in user is only uploading their own avatar, which is capped
// hard - otherwise this endpoint becomes free bulk image hosting.
const PUBLISHER_MAX = 5 * 1024 * 1024;
const SELF_SERVICE_MAX = 2 * 1024 * 1024;
const isPublisher = (user) => user?.role === "admin" || user?.role === "editor";

// Two instances rather than one with a mutable `limits`. Multer copies its
// options when the middleware is built, so reassigning `upload.limits` at
// request time was silently doing nothing and every uploader got 5 MB.
const makeUploader = (maxBytes) =>
  multer({ storage, fileFilter, limits: { fileSize: maxBytes } });

const publisherUpload = makeUploader(PUBLISHER_MAX);
const selfServiceUpload = makeUploader(SELF_SERVICE_MAX);

const router = Router();

router.post("/", auth, (req, res) => {
  const publisher = isPublisher(req.user);
  const max = publisher ? PUBLISHER_MAX : SELF_SERVICE_MAX;
  const upload = publisher ? publisherUpload : selfServiceUpload;

  upload.single("file")(req, res, (err) => {
    if (err) {
      // multer surfaces its own size error; make it readable and say the limit.
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `Image is too large. Maximum size is ${Math.round(max / 1024 / 1024)} MB.`,
        });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ message: "Send the image as a file field named \"file\"" });
      }
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // `path` is the origin-relative URL for a client served by this same API,
    // `url` is that prefixed with the API origin for a client hosted elsewhere.
    res.json({
      url: `/uploads/${req.file.filename}`,
      path: `/uploads/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

// Profile pictures, as opposed to news hero images on the route above.
//
// Separate endpoint rather than a flag on the same one because the two want
// opposite treatment: avatars are resized in the browser and belong in Drive,
// while news banners are full-size 16:9 images with no business being squashed
// into a square thumbnail. Both accept the same `file` field so the client change
// is a different URL, nothing more.
router.post("/avatar", auth, parseAvatarUpload, async (req, res) => {
  if (!req.avatar) return res.status(400).json({ message: "No file uploaded" });
  try {
    const stored = await storeAvatar(req.avatar, { hint: req.user?.regNumber || "" });
    // The file id is returned separately so the caller can delete the Drive copy
    // when the photo is replaced. Existing rows have no id and fall back to url.
    res.json({
      url: stored.url,
      path: stored.url,
      fileId: stored.fileId,
      size: req.avatar.buffer.length,
      mimetype: req.avatar.mimeType,
    });
  } catch (error) {
    console.error("[upload] Failed to store avatar:", error.message);
    res.status(500).json({ message: "The photo could not be saved. Please try again." });
  }
});

// Removes a Drive copy that has already been replaced on the profile.
//
// Called by the client only after the new photo is saved, so the live avatar is
// never the one being deleted. Answering 200 even on failure is deliberate: the
// row already points at the new photo, and an orphan in Drive is a far smaller
// problem than a failed save that the user sees as an error.
router.delete("/avatar", auth, (req, res) => {
  const { fileId, url } = req.body || {};
  if (!fileId && !url) {
    return res.status(400).json({ message: "fileId or url is required" });
  }
  removeAvatar(url, fileId);
  res.json({ ok: true });
});

export default router;
