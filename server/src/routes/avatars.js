import { Router } from "express";
import { getDriveFileMeta, downloadFromDrive } from "../utils/googleDrive.js";

const router = Router();

// Serves an avatar out of Drive.
//
// Deliberately shaped differently from routes/certificates.js. A certificate is
// a private document someone opens deliberately, so it is uncacheable-by-design
// and gated behind an unguessable id. An avatar is a public image rendered on
// every page - the navbar, three dashboard layouts and the public Team page - so
// it needs to be cached hard, and needs no gate. Drive file ids are unguessable
// and no route lists them, which is the same exposure /uploads already had.
//
// The bytes still come from our server rather than a Drive CDN link, which would
// mean marking every photo "anyone with the link can view" and making staff
// pictures world-readable. One server-to-Drive hop, paid once, then the browser
// caches it for a year.
const FILE_ID = /^[A-Za-z0-9_-]{10,128}$/;

// Only real image types are served, decided by Drive's own metadata rather than
// the request, and always as an image content type. Nothing a client posts can
// change that, so an upload cannot be replayed back as something a browser runs.
const INLINE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

router.get("/:fileId", async (req, res) => {
  const { fileId } = req.params;
  if (!FILE_ID.test(fileId)) {
    return res.status(400).json({ message: "Invalid photo reference" });
  }
  try {
    const meta = await getDriveFileMeta(fileId);
    if (!meta) return res.status(404).json({ message: "Photo not found" });
    if (!INLINE_TYPES.has(meta.mimeType)) {
      return res.status(415).json({ message: "Unsupported image type" });
    }

    const stream = await downloadFromDrive(fileId);
    if (!stream) return res.status(404).json({ message: "Photo not found" });

    res.setHeader("Content-Type", meta.mimeType);
    res.setHeader("Content-Length", String(meta.size || 0));
    res.setHeader("X-Content-Type-Options", "nosniff");
    // A new upload creates a new file id rather than overwriting in place, so a
    // given id never changes content and this can safely be immutable. Avatar.jsx
    // swaps the src when the user picks a new photo, which busts the old entry.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    // Vercel does not cache anything under /api, and this route is behind it.
    res.setHeader("CDN-Cache-Control", "public, max-age=31536000, immutable");

    const { Readable } = await import("stream");
    Readable.fromWeb(stream).pipe(res);
  } catch (error) {
    console.error("[avatars] Serve failed:", error.message);
    res.status(502).json({ message: "The photo could not be loaded" });
  }
});

export default router;