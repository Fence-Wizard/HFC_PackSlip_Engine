/**
 * PDF text extraction with OCR fallback for scanned PDFs.
 * Uses pdf-parse v2.x for both text extraction AND page rendering.
 */

const logger = require("../config/logger");

let PDFParseClass = null;

/**
 * Load the PDFParse class from pdf-parse v2.x
 */
function loadPdfParse() {
  if (PDFParseClass) return PDFParseClass;
  try {
    const mod = require("pdf-parse");
    if (mod.PDFParse) {
      PDFParseClass = mod.PDFParse;
      logger.info("pdf-parse v2.x PDFParse class loaded");
      return PDFParseClass;
    }
    logger.error("pdf-parse PDFParse class not found");
  } catch (err) {
    logger.error("pdf-parse load failed:", err?.message);
  }
  return null;
}

/**
 * Extract text from a PDF buffer.
 * First tries native text extraction, then falls back to OCR if needed.
 * @param {Buffer} buffer - Node.js Buffer containing PDF data
 * @returns {Promise<{text: string, pageCount: number, method: string}>}
 */
async function extractPdfText(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("extractPdfText expected a Node Buffer");
  }

  const PDFParse = loadPdfParse();
  if (!PDFParse) {
    return { text: "", pageCount: 0, method: "none" };
  }

  let parser = null;
  try {
    parser = new PDFParse({ data: buffer });
    
    // First, try native text extraction
    const textResult = await parser.getText();
    const pageCount = textResult?.total || 0;
    
    // Check if we got meaningful text (not just page markers)
    const rawText = textResult?.text || "";
    const meaningfulText = rawText.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "").trim();
    
    logger.info(`pdf-parse getText: ${meaningfulText.length} chars from ${pageCount} pages`);
    
    // If we have substantial text (more than 50 chars), use it
    if (meaningfulText.length > 50) {
      await parser.destroy();
      return { text: meaningfulText, pageCount, method: "pdf-text" };
    }
    
    // Fall back to OCR for scanned PDFs
    logger.info("PDF appears to be scanned, falling back to OCR...");
    
    // Render pages as images at higher resolution for better OCR
    // Scale 4 = 288 DPI equivalent (better for table columns)
    const screenshotResult = await parser.getScreenshot({ scale: 4, format: "png" });
    await parser.destroy();
    parser = null;
    
    if (!screenshotResult?.pages?.length) {
      logger.warn("No page images generated for OCR");
      return { text: "", pageCount, method: "ocr-failed" };
    }
    
    logger.info(`Generated ${screenshotResult.pages.length} page images for OCR`);
    
    // OCR each page with optimized settings
    const Tesseract = require("tesseract.js");
    const textParts = [];
    
    for (let i = 0; i < screenshotResult.pages.length; i++) {
      const pageData = screenshotResult.pages[i].data;
      if (!pageData) {
        logger.warn(`Page ${i + 1} has no image data`);
        continue;
      }
      
      // Log image size for debugging
      const imgSize = pageData.length || pageData.byteLength || 0;
      logger.info(`OCR page ${i + 1}: image size ${Math.round(imgSize / 1024)} KB`);
      
      try {
        const { data: { text } } = await Tesseract.recognize(
          pageData,
          'eng',
          { 
            logger: () => {},
            // Tesseract parameters for better table/document recognition
            tessedit_pageseg_mode: '6', // Assume uniform block of text
          }
        );
        if (text?.trim()) {
          textParts.push(text.trim());
          // Log first 500 chars of each page for debugging
          logger.info(`OCR page ${i + 1}: ${text.length} chars. Preview: ${text.substring(0, 300).replace(/\n/g, ' | ')}`);
        } else {
          logger.warn(`OCR page ${i + 1}: no text extracted`);
        }
      } catch (ocrErr) {
        logger.warn(`OCR failed on page ${i + 1}:`, ocrErr?.message);
      }
    }
    
    const ocrText = textParts.join("\n\n").trim();
    logger.info(`OCR complete: ${ocrText.length} total chars from ${screenshotResult.pages.length} pages`);
    
    // Check if we found line items header (for SPS pack slips)
    if (/ordered.*shipped/i.test(ocrText)) {
      logger.info("OCR captured line items header - table data should be present");
    } else {
      logger.warn("OCR did NOT capture 'Ordered/Shipped' header - line items table may be missing");
    }
    
    return {
      text: ocrText || "(No text could be extracted)",
      pageCount: screenshotResult.pages.length,
      method: ocrText ? "ocr" : "ocr-empty"
    };
    
  } catch (err) {
    logger.error("PDF extraction failed:", err?.message);
    if (parser) {
      try { await parser.destroy(); } catch {}
    }
    return { text: "", pageCount: 0, method: "error" };
  }
}

module.exports = {
  extractPdfText,
};
