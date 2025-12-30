const express = require("express");
const multer = require("multer");
const logger = require("../config/logger");
const { createPackSlip, STATUSES, now } = require("../models/PackSlip");
const { toFileRecord, readFileBuffer } = require("../storage/files");
const db = require("../storage/db");
const { extractText } = require("../services/extractText");
const { parsePackSlip } = require("../services/parsePackSlip");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    const isImage = file.mimetype.startsWith("image/");
    if (isPdf || isImage) return cb(null, true);
    return cb(new Error("Only PDF or image files are supported"));
  },
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post("/upload", upload.single("file"), async (req, res, next) => {
  const reqId = req.id;
  if (!req.file) {
    return res
      .status(400)
      .json({ error: "No file uploaded. Expected multipart field name 'file'." });
  }

  const fileRecord = toFileRecord(req.file);
  const packSlip = createPackSlip(fileRecord);
  db.createPackSlip(packSlip);

  try {
    const buffer = readFileBuffer(fileRecord);
    let extraction = {
      text: "",
      method: "skip",
      pages: 0,
    };
    try {
      extraction = await extractText(
        { buffer, mimeType: fileRecord.mimeType, fileName: fileRecord.originalName },
        reqId,
      );
    } catch (err) {
      logger.error("Extraction failed, continuing without text", {
        reqId,
        message: err?.message,
        stack: err?.stack,
      });
      extraction = {
        text: "(extraction failed)",
        method: "failed",
        pages: 0,
      };
    }

    db.updatePackSlip(packSlip.id, {
      status: STATUSES.EXTRACTED,
      extractedText: extraction.text,
      extractMeta: {
        method: extraction.method,
        pages: extraction.pages,
      },
      errors: [],
      updatedAt: now(),
    });

    const lineItems = parsePackSlip(extraction.text);
    const ready = db.updatePackSlip(packSlip.id, {
      status: STATUSES.REVIEW,
      lineItems,
    });

    return res.json({
      id: ready.id,
      status: ready.status,
      reviewUrl: `/review.html?id=${ready.id}`,
    });
  } catch (err) {
    logger.error("Upload processing failed", {
      reqId,
      message: err?.message,
      stack: err?.stack,
    });
    db.updatePackSlip(packSlip.id, {
      status: STATUSES.FAILED,
      errors: [err?.message || "Processing failed"],
    });
    return res.status(500).json({ error: err?.message || "Processing failed" });
  }
});

module.exports = router;

