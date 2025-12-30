const path = require("path");
const fs = require("fs");
const { config } = require("../config/env");

function toFileRecord(file) {
  const fileName = file.filename || path.basename(file.path);
  const storedPath = file.path;
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

