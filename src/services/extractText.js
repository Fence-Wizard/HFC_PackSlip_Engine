/**
 * Text extraction orchestrator.
 * Handles both PDFs and images.
 */

const path = require("path");
const logger = require("../config/logger");
const { ocrImage } = require("./ocr");
const { parsePdfText } = require("./pdf");

/**
 * Extract text from a file buffer.
 * @param {Object} params
 * @param {Buffer} params.buffer - File buffer
 * @param {string} params.mimeType - MIME type
 * @param {string} params.fileName - Original file name
 * @param {string} reqId - Request ID for logging
 * @returns {Promise<{text: string, method: string, pages: number}>}
 */
async function extractText({ buffer, mimeType, fileName }, reqId) {
  const lowerName = (fileName || "").toLowerCase();
  const isPdf = mimeType === "application/pdf" || lowerName.endsWith(".pdf");
  const isImage = mimeType?.startsWith("image/");

  if (!isPdf && !isImage) {
    throw new Error(`Unsupported file type: ${mimeType || path.extname(fileName) || "unknown"}`);
  }

  // Image -> OCR directly
  if (isImage) {
    logger.info("Processing image file via OCR", { reqId, fileName });
    const text = await ocrImage(buffer, reqId);
    return { text, method: "ocr-image", pages: 1 };
  }

  // PDF -> Use pdf service (which now handles OCR fallback internally)
  logger.info("Processing PDF file", { reqId, fileName });
  const result = await parsePdfText(buffer, reqId);
  
  // Log the extraction result
  if (result.text && result.text.length > 50) {
    logger.info("Text extraction successful", { 
      reqId, 
      fileName,
      method: result.method,
      textLength: result.text.length,
      pageCount: result.pageCount
    });
  } else {
    logger.warn("Limited text extraction", { 
      reqId, 
      fileName,
      method: result.method,
      textLength: result.text?.length || 0
    });
  }
  
  return { 
    text: result.text || "(No text could be extracted)", 
    method: result.method || "unknown", 
    pages: result.pageCount || 0 
  };
}

module.exports = { extractText };
