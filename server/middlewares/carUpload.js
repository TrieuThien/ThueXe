import multer from "multer";
import AppError from "../utils/appError.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            cb(new AppError("Only jpeg, png, webp, and gif images are allowed", 400, "INVALID_IMAGE_TYPE"));
            return;
        }

        cb(null, true);
    },
});

export function uploadCarImage(fieldName) {
    return (req, res, next) => {
        upload.single(fieldName)(req, res, (error) => {
            if (error instanceof multer.MulterError) {
                if (error.code === "LIMIT_FILE_SIZE") {
                    return next(new AppError("Image size must not exceed 2MB", 400, "IMAGE_TOO_LARGE"));
                }

                return next(new AppError(error.message, 400, "UPLOAD_ERROR"));
            }

            if (error) {
                return next(error);
            }
            return next();
        });
    };
}
