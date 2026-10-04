import { Router } from "express";
import { getDriveFileMeta, downloadFromDrive } from "../utils/googleDrive.js";

const router = Router();

// Certificates live in a Drive folder the office browses directly, so the admin
// panel opens one from the site rather than from Drive.
//
// Access is by file id only, and a Drive file id is the same unguessable
// capability-style handle the old on-disk filename was: it is not sequential and
// nothing that lists ids is public. That is deliberately the same exposure the
// previous /uploads/certificates route had, rather than a new one - tightening
// it to admins would need an authenticated fetch in the panel instead of a plain
// link, which is a larger change than this migration needs.
const FILE_ID = /^[A-Za-z0-9_-]{10,128}$/;

// Only these are ever served, and only as an inline render or a download. The
// type comes from Drive's own metadata rather than from the request, so a
// certificate cannot be replayed back as something a browser will execute.
const INLINE_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

router.get("/:fileId", async (req, res) => {
  const { fileId } = req.params;
  if (!FILE_ID.test(fileId)) {
    return res.status(400).json({ message: "Invalid certificate reference" });
  }
  try {
    const meta = await getDriveFileMeta(fileId);
    if (!meta) return res.status(404).json({ message: "Certificate not found" });
    if (!INLINE_TYPES.has(meta.mimeType)) {
      return res.status(415).json({ message: "Unsupported certificate type" });
    }

    const stream = await downloadFromDrive(fileId);
    if (!stream) return res.status(404).json({ message: "Certificate not found" });

    res.setHeader("Content-Type", meta.mimeType);
    res.setHeader("Content-Length", String(meta.size || 0));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=3600");
    // A PDF renders in the browser; ?download=1 forces a save. The filename is
    // the one the applicant uploaded, sanitised of quotes so it cannot break out
    // of the header value.
    const filename = String(meta.name || "certificate").replace(/["\\\r\n]/g, "");
    res.setHeader(
      "Content-Disposition",
      `${req.query.download === "1" ? "attachment" : "inline"}; filename="${filename}"`
    );

    const { Readable } = await import("stream");
    Readable.fromWeb(stream).pipe(res);
  } catch (error) {
    console.error("[certificates] Serve failed:", error.message);
    res.status(502).json({ message: "The certificate could not be loaded from storage" });
  }
});

export default router;