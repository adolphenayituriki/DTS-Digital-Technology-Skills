import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createRateLimiter } from "./rateLimit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Certificates are the one upload on the site that a stranger can trigger, so
// this endpoint is deliberately narrow: three formats, one size, and the
// leading bytes of the file are checked before the bytes are trusted.
export const CERTIFICATE_MAX_BYTES = 5 * 1024 * 1024;
export const CERTIFICATE_MAX_MB = CERTIFICATE_MAX_BYTES / 1024 / 1024;

const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

export const CERTIFICATES_DIR = path.join(__dirname, "../../uploads/certificates");

// multer does not create the destination for you, and a fresh deploy (or a new
// contributor's first run) will not have it.
fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });

// Header signature per extension. A browser-supplied Content-Type is a hint,
// not evidence: without this, renaming a script to .pdf passes a mime check and
// lands in the folder that is served back to staff.
const SIGNATURES = [
  { ext: ".jpg", bytes: [0xff, 0xd8, 0xff] },
  { ext: ".png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: ".pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
];

const sniff = (filePath) => {
  let handle;
  try {
    handle = fs.openSync(filePath, "r");
    const head = Buffer.alloc(8);
    const read = fs.readSync(handle, head, 0, 8, 0);
    return SIGNATURES.find((sig) => sig.bytes.every((b, i) => head[i] === b))?.ext || null;
  } catch {
    return null;
  } finally {
    if (handle !== undefined) fs.closeSync(handle);
  }
};

const storage = multer.diskStorage({
  destination: CERTIFICATES_DIR,
  // The applicant's own filename is never reused on disk: it is attacker
  // controlled, and a traversal or double-extension in it would be a problem
  // for whoever later downloads the file.
  filename: (req, file, cb) => {
    const ext = EXTENSIONS[file.mimetype] || ".bin";
    cb(null, `${crypto.randomBytes(16).toString("hex")}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!EXTENSIONS[file.mimetype]) {
    return cb(new Error("Certificate must be a JPG, PNG or PDF file"));
  }
  cb(null, true);
};

const uploadCertificate = multer({
  storage,
  fileFilter,
  limits: { fileSize: CERTIFICATE_MAX_BYTES, files: 1 },
});

export const certificateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many applications submitted from this network. Please try again later.",
});

// Wraps multer so a rejection arrives as a readable 400 instead of a stack
// trace, and so a file whose real contents disagree with its extension is
// deleted rather than left on disk.
export const parseCertificateUpload = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();
  uploadCertificate.single("certificate")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `Certificate is too large. Maximum size is ${CERTIFICATE_MAX_MB} MB.`,
        });
      }
      return res.status(400).json({ message: err.message });
    }
    if (req.file) {
      const real = sniff(req.file.path);
      if (!real || real !== EXTENSIONS[req.file.mimetype]) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          message: "That file is not a valid JPG, PNG or PDF",
        });
      }
      req.certificate = {
        url: `/uploads/certificates/${req.file.filename}`,
        name: path.basename(req.file.originalname).slice(0, 120),
      };
    }
    next();
  });
};

export const removeCertificate = (url) => {
  if (!url || !url.startsWith("/uploads/certificates/")) return;
  const target = path.join(__dirname, "../..", url);
  // Confine the delete to the certificates directory even if the stored value
  // is somehow absolute or contains traversal.
  if (path.resolve(path.dirname(target)) === path.resolve(CERTIFICATES_DIR)) {
    fs.unlink(target, () => {});
  }
};
