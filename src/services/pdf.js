const fs = require("fs");
const os = require("os");
const path = require("path");
const logger = require("../config/logger");
const { extractPdfText } = require("./pdfText");

async function parsePdfText(buffer, reqId) {
  const data = await extractPdfText(buffer);
  return { text: data.text, pageCount: data.pageCount };
}

/**
 * Convert PDF pages to images for OCR.
 * Uses pdf2pic which requires GraphicsMagick/ImageMagick.
 * If not available, returns empty array and logs warning.
 */
async function pdfToImages(buffer, reqId) {
  try {
    // Try to load pdf2pic dynamically
    let fromBuffer;
    try {
      const pdf2pic = require("pdf2pic");
      fromBuffer = pdf2pic.fromBuffer;
    } catch (loadErr) {
      logger.warn("pdf2pic not available for PDF-to-image conversion", { reqId });
      return [];
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-ocr-"));
    const converter = fromBuffer(buffer, {
      density: 200,
      format: "png",
      saveFilename: "page",
      savePath: tmpDir,
    });

    const result = [];
    let page = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const pageResult = await converter(page);
        if (!pageResult || (!pageResult.path && !pageResult.base64)) break;

        const buf = pageResult.base64
          ? Buffer.from(pageResult.base64, "base64")
          : fs.readFileSync(pageResult.path);
        result.push(buf);
        page += 1;

        if (page > 50) break; // safety guard
      } catch (pageErr) {
        // Check if it's the GraphicsMagick/ImageMagick error
        if (pageErr?.message?.includes("GraphicsMagick") || 
            pageErr?.message?.includes("ImageMagick") ||
            pageErr?.message?.includes("gm/convert")) {
          logger.warn(
            "GraphicsMagick/ImageMagick not installed - OCR fallback unavailable. " +
            "Install GraphicsMagick or use text-based PDFs.",
            { reqId }
          );
          
          // Clean up temp dir
          try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          } catch {
            // ignore cleanup errors
          }
          
          return [];
        }
        
        // For other errors, might just mean no more pages
        break;
      }
    }

    // Clean up temp dir
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }

    return result;
  } catch (err) {
    // Handle missing GraphicsMagick/ImageMagick gracefully
    if (err?.message?.includes("GraphicsMagick") || 
        err?.message?.includes("ImageMagick") ||
        err?.message?.includes("gm/convert")) {
      logger.warn(
        "GraphicsMagick/ImageMagick not installed - OCR fallback unavailable",
        { reqId }
      );
      return [];
    }

    logger.error("Failed converting PDF to images", { reqId, message: err?.message });
    throw err;
  }
}

module.exports = {
  parsePdfText,
  pdfToImages,
};
