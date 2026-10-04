import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ApiError } from '#utils/ApiError.js';

const uploadPath = path.resolve('public/images');

/* =========================================================
   CREATE DIRECTORY IF NOT EXISTS
========================================================= */

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

/* =========================================================
   STORAGE CONFIG
========================================================= */

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadPath);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname);

    const uniqueName = `${crypto.randomUUID()}${ext}`;

    cb(null, uniqueName);
  },
});

/* =========================================================
   FILE FILTER
========================================================= */

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    // Must be a client error (400), not a 500.
    return cb(
      new ApiError(
        400,
        'Only jpeg, jpg, png and webp images are allowed'
      ),
      false
    );
  }

  cb(null, true);
};

/* =========================================================
   MULTER INSTANCE
========================================================= */

export const upload = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB
  },
});