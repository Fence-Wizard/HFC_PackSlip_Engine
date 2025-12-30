const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");
const { config } = require("../config/env");

function ensureUploadDir() {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

function persistUploadedFile(file) {
  ensureUploadDir();

  // If multer used diskStorage, it already has a path.
  if (file.path) {
    return {
      storedPath: file.path,
      fileName: file.filename || path.basename(file.path),
    };
  }

  // For memoryStorage, write the buffer to disk.
  const ext = path.extname(file.originalname || "") || "";
  const safeExt = ext.slice(0, 10);
  const fileName = `${Date.now()}-${randomUUID()}${safeExt}`;
  const storedPath = path.join(config.uploadDir, fileName);
  fs.writeFileSync(storedPath, file.buffer);
  return { storedPath, fileName };
}

function toFileRecord(file) {
  const { storedPath, fileName } = persistUploadedFile(file);
  const publicUrl = `${config.baseUrl}/files/${fileName}`;
  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    storedPath,
    fileName,
    publicUrl,
  };
}

function readFileBuffer(fileRecord) {
  return fs.readFileSync(fileRecord.storedPath);
}

module.exports = {
  toFileRecord,
  readFileBuffer,
};

