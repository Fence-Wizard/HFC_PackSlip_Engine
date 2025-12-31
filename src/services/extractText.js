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

  // PDF - first try text extraction
  const { text: pdfText, pageCount } = await parsePdfText(buffer, reqId);
  
  // If we got meaningful text, return it
  if (!looksLikeScannedPdf(pdfText)) {
    logger.info("PDF text extraction successful", { 
      reqId, 
      fileName, 
      textLength: pdfText.length,
      pageCount 
    });
    return { text: pdfText, method: "pdf-text", pages: pageCount };
  }

  // PDF appears to be scanned or image-based
  logger.info("PDF appears scanned or has minimal text; attempting OCR fallback", { 
    reqId, 
    fileName,
    extractedTextLength: pdfText.length 
  });
  
  // Try to convert PDF to images for OCR
  let images = [];
  try {
    images = await pdfToImages(buffer, reqId);
  } catch (imgErr) {
    logger.warn("PDF-to-image conversion failed", { 
      reqId, 
      message: imgErr?.message 
    });
  }
  
  // If we got images, OCR them
  if (images.length > 0) {
    const parts = [];
    for (const img of images) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const t = await ocrImage(img, reqId);
        parts.push(t);
      } catch (ocrErr) {
        logger.warn("OCR failed for page", { reqId, message: ocrErr?.message });
      }
    }
    const ocrText = parts.join("\n").trim();
    
    if (ocrText.length > pdfText.length) {
      // OCR produced more text, use it
      logger.info("OCR extraction produced more text", { 
        reqId, 
        ocrTextLength: ocrText.length 
      });
      return { text: ocrText, method: "pdf-ocr", pages: images.length };
    }
  }
  
  // OCR fallback unavailable or produced less text - return original extraction
  // This is better than returning nothing
  if (pdfText.trim()) {
    logger.info("Using original PDF text extraction (OCR fallback unavailable or less effective)", { 
      reqId,
      textLength: pdfText.length 
    });
    return { text: pdfText, method: "pdf-text-partial", pages: pageCount };
  }
  
  // No text could be extracted
  logger.warn("Could not extract text from PDF - may need GraphicsMagick for OCR", { 
    reqId, 
    fileName 
  });
  return { 
    text: "(No text could be extracted. This PDF may be scanned/image-based. Install GraphicsMagick for OCR support.)", 
    method: "none", 
    pages: pageCount 
  };
}

module.exports = { extractText };
