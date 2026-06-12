import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed."), false);
  }
};

/** Helper – check the first bytes of a Buffer against known signatures */
const isValidSignature = (buffer, mime) => {
  if (!buffer || buffer.length < 4) return false;
  // JPEG
  if (mime === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  // PNG
  if (mime === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  // WEBP – RIFF....WEBP
  if (mime === "image/webp") {
    const riff = buffer.toString("utf8", 0, 4) === "RIFF";
    const webp = buffer.toString("utf8", 8, 12) === "WEBP";
    return riff && webp;
  }
  // PDF – %PDF-
  if (mime === "application/pdf") {
    return buffer.toString("utf8", 0, 5) === "%PDF-";
  }
  return false;
};

/** Middleware – run after Multer to ensure magic-byte safety */
export const validateKycMagicBytes = (req, res, next) => {
  const files = req.files || [];
  for (const f of files) {
    // `f.buffer` exists because we use memoryStorage
    if (!isValidSignature(f.buffer, f.mimetype)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid file type – signature mismatch.",
        });
    }
  }
  next();
};

export const uploadPublicSupport = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // Max 5 files
  }
});
