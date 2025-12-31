/**
 * PDF processing service.
 * Uses pdfText.js which handles both native text extraction and OCR fallback.
 */

const logger = require("../config/logger");
const { extractPdfText } = require("./pdfText");

/**
 * Parse text from a PDF buffer.
 * Automatically falls back to OCR for scanned PDFs.
 * @param {Buffer} buffer - PDF file buffer
 * @param {string} reqId - Request ID for logging
 * @returns {Promise<{text: string, pageCount: number, method: string}>}
 */
async function parsePdfText(buffer, reqId) {
  logger.info("Starting PDF text extraction", { reqId });
  const result = await extractPdfText(buffer);
  logger.info(`PDF extraction complete: ${result.text.length} chars via ${result.method}`, { reqId });
  return result;
}

module.exports = {
  parsePdfText,
};
