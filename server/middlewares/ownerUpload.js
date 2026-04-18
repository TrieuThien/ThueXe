import multer from "multer";
import AppError from "../utils/appError.js";

const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
]);

const buildUpload = (maxFileSize) =>
    multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: maxFileSize },
        fileFilter: (req, file, cb) => {
            if (!allowedMimeTypes.has(file.mimetype)) {
                return cb(new AppError("Unsupported file type.", 422, "INVALID_DOCUMENT_MIME"));
            }
            return cb(null, true);
        },
    });

const makeCallback = (next) => (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("File exceeds max size 10MB.", 422, "DOCUMENT_TOO_LARGE"));
    }
    if (err) return next(err);
    return next();
};

export const ownerDocUploadSingle = (fieldName = "file", maxFileSize = 10 * 1024 * 1024) => {
    const upload = buildUpload(maxFileSize);
    return (req, res, next) => upload.single(fieldName)(req, res, makeCallback(next));
};

export const ownerDocUploadAny = (maxFileSize = 10 * 1024 * 1024) => {
    const upload = buildUpload(maxFileSize);
    return (req, res, next) => upload.any()(req, res, makeCallback(next));
};
