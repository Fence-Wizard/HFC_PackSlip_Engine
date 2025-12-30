const Tesseract = require("tesseract.js");
const logger = require("../config/logger");

async function ocrImage(buffer, reqId) {
  try {
    const result = await Tesseract.recognize(buffer, "eng");
    return result?.data?.text || "";
  } catch (err) {
    logger.error("OCR failed", { reqId, message: err?.message });
    throw err;
  }
}

module.exports = { ocrImage };

