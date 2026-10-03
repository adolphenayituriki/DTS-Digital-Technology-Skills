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

export const CERTIFICATES_DIR = path.join(__dirname, "../../uploads/certificates");

// multer does not create the destination for you, and a fresh deploy (or a new
// contributor's first run) will not have it.
fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });

// Header signature per extension. A browser-supplied Content-Type is a hint,
// not evidence: without this, renaming a script to .pdf passes a mime check and
// lands in the folder that is served back to staff.
const SIGNATURES = [
  { ext: ".jpg", mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { ext: ".png", mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: ".pdf", mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
];

// Declared types we will accept the *bytes* of. `application/octet-stream` and
// the empty string are what Windows and some Android galleries send for a file
// whose extension they do not recognise; the signature check below is what
// actually decides, so these are let through to it rather than refused here.
const AMBIGUOUS_MIMES = new Set(["", "application/octet-stream", "binary/octet-stream"]);

const sniff = (filePath) => {
  let handle;
  try {
    handle = fs.openSync(filePath, "r");
    const head = Buffer.alloc(8);
    fs.readSync(handle, head, 0, 8, 0);
    // JPEG and PNG both start at byte 0. PDF is allowed a short preamble: some
    // scanners and download managers prepend a BOM or stray bytes before
    // "%PDF", and the header itself is still the only thing that matters.
    if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return SIGNATURES[0];
    if (head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return SIGNATURES[1];
    const preamble = Buffer.alloc(1024);
    const read = fs.readSync(handle, preamble, 0, 1024, 0);
    if (preamble.subarray(0, read).includes(Buffer.from("%PDF-"))) return SIGNATURES[2];
    return null;
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
  // for whoever later downloads the file. The extension is decided from the
  // sniffed bytes after the fact, so it is written as .bin here and renamed
  // below - the stored extension always describes the real content.
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomBytes(16).toString("hex")}.bin`);
  },
});

const fileFilter = (req, file, cb) => {
  const mime = String(file.mimetype || "").toLowerCase();
  const known = SIGNATURES.some((sig) => sig.mime === mime);
  if (!known && !AMBIGUOUS_MIMES.has(mime)) {
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
      // The bytes decide, never the declared Content-Type. A real JPEG that the
      // applicant (or their OS) called .png is a valid certificate; refusing it
      // because the label disagreed with the content rejected honest uploads.
      const real = sniff(req.file.path);
      if (!real) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          message:
            "That file is not a readable JPG, PNG or PDF. If it opens as an image on your phone, try taking a photo of the certificate again or exporting it as a PDF.",
        });
      }
      const finalName = `${path.parse(req.file.filename).name}${real.ext}`;
      const finalPath = path.join(CERTIFICATES_DIR, finalName);
      fs.rename(req.file.path, finalPath, (renameErr) => {
        if (renameErr) {
          fs.unlink(req.file.path, () => {});
          return res.status(400).json({
            message: "The certificate could not be saved. Please try again.",
          });
        }
        req.file.path = finalPath;
        req.file.filename = finalName;
        req.file.mimetype = real.mime;
        req.certificate = {
          url: `/uploads/certificates/${finalName}`,
          name: path.basename(req.file.originalname).slice(0, 120),
        };
        next();
      });
      return;
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
