import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createRateLimiter } from "./rateLimit.js";
import { isDriveConfigured, uploadToDrive } from "./googleDrive.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Certificates are the one upload on the site that a stranger can trigger, so
// this endpoint is deliberately narrow: three formats, one size, and the
// leading bytes of the file are checked before the bytes are trusted.
export const CERTIFICATE_MAX_BYTES = 5 * 1024 * 1024;
export const CERTIFICATE_MAX_MB = CERTIFICATE_MAX_BYTES / 1024 / 1024;

// The local-disk fallback for when Drive credentials are absent. Once Drive is
// configured nothing new is written here; see storeCertificate below.
export const CERTIFICATES_DIR = path.join(__dirname, "../../uploads/certificates");

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

// Reads the signature out of the uploaded bytes. The buffer is already in memory
// (multer keeps it there for the Drive upload), so nothing is read back off disk.
const sniff = (buffer) => {
  const head = buffer.subarray(0, 8);
  // JPEG and PNG both start at byte 0. PDF is allowed a short preamble: some
  // scanners and download managers prepend a BOM or stray bytes before "%PDF",
  // and the header itself is still the only thing that matters.
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return SIGNATURES[0];
  if (head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return SIGNATURES[1];
  if (buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"))) return SIGNATURES[2];
  return null;
};

// Memory, not disk. The bytes have to be in hand to be pushed to Drive, and the
// 5 MB ceiling above means the buffer is bounded - a candidate for a disk write
// would only leave a second copy to clean up when the upload is rejected.
const storage = multer.memoryStorage();

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
// trace. Nothing is persisted here any more: this only validates the bytes and
// hands the buffer on, so a rejected submission cannot leave an orphan behind.
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
      const real = sniff(req.file.buffer);
      if (!real) {
        return res.status(400).json({
          message:
            "That file is not a readable JPG, PNG or PDF. If it opens as an image on your phone, try taking a photo of the certificate again or exporting it as a PDF.",
        });
      }
      req.certificate = {
        buffer: req.file.buffer,
        name: path.basename(req.file.originalname || "").slice(0, 120) || real.ext.slice(1),
        mimeType: real.mime,
        ext: real.ext,
      };
    }
    next();
  });
};

// Where a validated certificate actually gets stored.
//
// Drive is the destination when it is configured, because the certificates are
// the applicant's own personal documents and the office needs to reach them
// without a server login. Local disk remains the fallback so a deploy that has
// not been given credentials yet still accepts applications rather than
// rejecting every Advanced applicant with a server error.
//
// Returns the record the Application stores: `url` is what the browser opens
// (an API route that streams from Drive, so the Drive file id never reaches the
// client as a bare Drive link), `fileId` is the handle needed to delete it.
export const storeCertificate = async (uploaded, { hint = "" } = {}) => {
  if (!uploaded) return null;

  if (isDriveConfigured()) {
    const extension = uploaded.ext;
    const originalName = uploaded.name.includes(extension) ? uploaded.name : `${uploaded.name}${extension}`;
    const { id } = await uploadToDrive({
      buffer: uploaded.buffer,
      mimeType: uploaded.mimeType,
      originalName: originalName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80),
      hint,
    });
    return { url: `/api/certificates/${id}`, name: uploaded.name, fileId: id };
  }

  // The applicant's own filename is never reused on disk: it is attacker
  // controlled, and a traversal or double-extension in it would be a problem
  // for whoever later downloads the file. The extension comes from the sniffed
  // bytes, so the stored extension always describes the real content.
  const storedName = `${crypto.randomBytes(16).toString("hex")}${uploaded.ext}`;
  await fs.promises.writeFile(path.join(CERTIFICATES_DIR, storedName), uploaded.buffer);
  return { url: `/uploads/certificates/${storedName}`, name: uploaded.name, fileId: "" };
};

// An applicant's certificate is personal data, so it is removed when the
// application is deleted rather than left behind. Both stores are covered:
// `fileId` for Drive, and the /uploads prefix for anything written before Drive
// was configured. Fire-and-forget on purpose - a delete failure must not block
// the application delete the admin actually asked for.
export const removeCertificate = (url, fileId) => {
  if (fileId) {
    import("./googleDrive.js")
      .then(({ deleteFromDrive }) => deleteFromDrive(fileId))
      .catch(() => {});
    return;
  }
  if (!url || !url.startsWith("/uploads/certificates/")) return;
  const target = path.join(__dirname, "../..", url);
  // Confine the delete to the certificates directory even if the stored value
  // is somehow absolute or contains traversal.
  if (path.resolve(path.dirname(target)) === path.resolve(CERTIFICATES_DIR)) {
    fs.unlink(target, () => {});
  }
};