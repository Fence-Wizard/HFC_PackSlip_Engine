const path = require("path");
const logger = require("../config/logger");
const { looksLikeScannedPdf } = require("../utils/pdf");
const { ocrImage } = require("./ocr");
const { parsePdfText, pdfToImages } = require("./pdf");

async function extractText({ buffer, mimeType, fileName }, reqId) {
  const lowerName = (fileName || "").toLowerCase();
  const isPdf = mimeType === "application/pdf" || lowerName.endsWith(".pdf");
  const isImage = mimeType?.startsWith("image/");

  if (!isPdf && !isImage) {
    throw new Error(`Unsupported file type: ${mimeType || path.extname(fileName) || "unknown"}`);
  }

  // Image -> OCR
  if (isImage) {
    const text = await ocrImage(buffer, reqId);
    return { text, method: "ocr-image", pages: 1 };
  }

  // PDF
  const { text: pdfText, pageCount } = await parsePdfText(buffer, reqId);
  if (!looksLikeScannedPdf(pdfText)) {
    return { text: pdfText, method: "pdf-text", pages: pageCount };
  }

  // Scanned PDF fallback: render pages and OCR
  logger.info("PDF appears scanned; performing OCR on pages", { reqId, fileName });
  const images = await pdfToImages(buffer, reqId);
  const parts = [];
  for (const img of images) {
    // eslint-disable-next-line no-await-in-loop
    const t = await ocrImage(img, reqId);
    parts.push(t);
  }
  const ocrText = parts.join("\n").trim();
  return { text: ocrText, method: "pdf-ocr", pages: images.length || pageCount };
}

module.exports = { extractText };

