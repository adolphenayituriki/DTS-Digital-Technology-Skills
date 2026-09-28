import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import auth from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads"),
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

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Admins and editors post news hero images, so they keep the full 5 MB. Every
// other signed-in user is only uploading their own avatar, which is capped
// hard - otherwise this endpoint becomes free bulk image hosting.
const SELF_SERVICE_MAX = 2 * 1024 * 1024;
const isPublisher = (user) => user?.role === "admin" || user?.role === "editor";

const router = Router();

router.post("/", auth, (req, res) => {
  const max = isPublisher(req.user) ? 5 * 1024 * 1024 : SELF_SERVICE_MAX;
  upload.limits = { fileSize: max };
  upload.single("file")(req, res, (err) => {
    if (err) {
      // multer surfaces its own size error; make it readable and say the limit.
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `Image is too large. Maximum size is ${Math.round(max / 1024 / 1024)} MB.`,
        });
      }
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

export default router;
