/**
 * PDF text extraction with OCR fallback for scanned PDFs.
 * Uses pdf-parse v2.x for both text extraction AND page rendering.
 * 
 * Includes image preprocessing for better OCR accuracy:
 * - Contrast enhancement
 * - Noise reduction
 * - Sharpening for text clarity
 */

const logger = require("../config/logger");
const sharp = require("sharp");

let PDFParseClass = null;

/**
 * Preprocess image for better OCR accuracy
 * Uses gentle enhancements that don't destroy thin characters like numbers
 * @param {Buffer} imageBuffer - PNG image buffer
 * @returns {Promise<Buffer>} - Processed image buffer
 */
async function preprocessImage(imageBuffer) {
  try {
    const processed = await sharp(imageBuffer)
      // Convert to grayscale for better OCR
      .grayscale()
      // Gentle contrast enhancement (NOT normalize which can be too aggressive)
      .linear(1.2, -20)  // Slightly increase contrast, darken midtones
      // Gentle sharpen to improve text edges without destroying thin lines
      .sharpen({ sigma: 0.8 })
      // NO threshold - it destroys thin numerical characters!
      // Output as high-quality PNG
      .png({ compressionLevel: 1 })
      .toBuffer();
    
    logger.debug(`Image preprocessed: ${imageBuffer.length} -> ${processed.length} bytes`);
    return processed;
  } catch (err) {
    logger.warn("Image preprocessing failed, using original:", err?.message);
    return imageBuffer;
  }
}

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
 * @param {Object} options - Optional settings
 * @param {Function} options.onPreviewImage - Callback with preview image buffer
 * @returns {Promise<{text: string, pageCount: number, method: string, previewImage?: Buffer}>}
 */
async function extractPdfText(buffer, options = {}) {
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
    
    // Save the first page as preview image (before preprocessing for cleaner display)
    let previewImage = null;
    if (screenshotResult.pages[0]?.data) {
      previewImage = Buffer.from(screenshotResult.pages[0].data);
      logger.info(`Preview image captured: ${Math.round(previewImage.length / 1024)} KB`);
    }
    
    // OCR each page with optimized settings for table extraction
    const Tesseract = require("tesseract.js");
    const textParts = [];
    
    for (let i = 0; i < screenshotResult.pages.length; i++) {
      let pageData = screenshotResult.pages[i].data;
      if (!pageData) {
        logger.warn(`Page ${i + 1} has no image data`);
        continue;
      }
      
      // Log original image size
      const origSize = pageData.length || pageData.byteLength || 0;
      logger.info(`OCR page ${i + 1}: original image size ${Math.round(origSize / 1024)} KB`);
      
      // Preprocess image for better OCR accuracy
      try {
        pageData = await preprocessImage(Buffer.from(pageData));
        logger.info(`OCR page ${i + 1}: preprocessed image size ${Math.round(pageData.length / 1024)} KB`);
      } catch (prepErr) {
        logger.warn(`Image preprocessing failed for page ${i + 1}:`, prepErr?.message);
      }
      
      try {
        // Create worker with optimized settings for tables
        const worker = await Tesseract.createWorker('eng', 1, {
          logger: () => {},
        });
        
        // Set parameters for better table/column recognition
        await worker.setParameters({
          tessedit_pageseg_mode: '6',           // Assume uniform block of text
          preserve_interword_spaces: '1',        // Keep spacing between columns
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-/\'\"()[]|.,#:;@ ',
        });
        
        const { data: { text } } = await worker.recognize(pageData);
        await worker.terminate();
        
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
      method: ocrText ? "ocr" : "ocr-empty",
      previewImage  // Include the rendered page image for display
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
