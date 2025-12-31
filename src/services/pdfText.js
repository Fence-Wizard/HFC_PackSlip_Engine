/**
 * PDF text extraction with multiple fallback strategies.
 * Tries unpdf first (modern library), then pdf-parse, then pdfjs-dist.
 */

const logger = require("../config/logger");

let extractorFn = null;

/**
 * Try to set up unpdf extractor (modern, reliable library)
 */
async function tryUnpdf() {
  try {
    const { extractText } = await import("unpdf");
    logger.info("Using unpdf for PDF extraction");
    
    return async (buffer) => {
      // unpdf expects Uint8Array
      const uint8 = new Uint8Array(buffer);
      const result = await extractText(uint8);
      
      // unpdf returns { text, totalPages }
      return {
        text: result?.text || "",
        pageCount: result?.totalPages || 0,
      };
    };
  } catch (err) {
    logger.warn("unpdf not available:", err?.message);
  }
  
  return null;
}

/**
 * Try to set up pdfjs-dist extractor as fallback
 */
async function tryPdfjsDist() {
  try {
    const pdfjs = await import("pdfjs-dist");
    const getDocument = pdfjs.getDocument || pdfjs.default?.getDocument;
    
    if (!getDocument) {
      logger.warn("pdfjs-dist loaded but getDocument not found");
      return null;
    }
    
    logger.info("Using pdfjs-dist for PDF extraction");
    
    return async (buffer) => {
      const uint8Array = new Uint8Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        uint8Array[i] = buffer[i];
      }
      
      const loadingTask = getDocument({
        data: uint8Array,
        disableFontFace: true,
        isEvalSupported: false,
      });
      
      const doc = await loadingTask.promise;
      const numPages = doc.numPages;
      const textParts = [];
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const page = await doc.getPage(pageNum);
          const content = await page.getTextContent();
          
          if (content.items && content.items.length > 0) {
            const lines = {};
            for (const item of content.items) {
              if (!item.str) continue;
              const y = Math.round(item.transform?.[5] || 0);
              if (!lines[y]) lines[y] = [];
              lines[y].push({ x: item.transform?.[4] || 0, text: item.str });
            }
            
            const sortedYs = Object.keys(lines).map(Number).sort((a, b) => b - a);
            for (const y of sortedYs) {
              lines[y].sort((a, b) => a.x - b.x);
              const lineText = lines[y].map(i => i.text).join(" ").trim();
              if (lineText) textParts.push(lineText);
            }
          }
        } catch (pageErr) {
          logger.warn(`Error on page ${pageNum}:`, pageErr?.message);
        }
      }
      
      return {
        text: textParts.join("\n").trim(),
        pageCount: numPages,
      };
    };
  } catch (err) {
    logger.warn("pdfjs-dist not available:", err?.message);
  }
  
  return null;
}

/**
 * Initialize the PDF extractor (tries multiple strategies)
 */
async function initExtractor() {
  if (extractorFn) return extractorFn;
  
  // Try unpdf first (modern, reliable)
  extractorFn = await tryUnpdf();
  if (extractorFn) return extractorFn;
  
  // Fall back to pdfjs-dist
  extractorFn = await tryPdfjsDist();
  if (extractorFn) return extractorFn;
  
  // Last resort: return empty text
  logger.error("No PDF extraction method available!");
  extractorFn = async () => ({ text: "", pageCount: 0 });
  return extractorFn;
}

/**
 * Extract text from a PDF buffer.
 * @param {Buffer} buffer - Node.js Buffer containing PDF data
 * @returns {Promise<{text: string, pageCount: number}>}
 */
async function extractPdfText(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("extractPdfText expected a Node Buffer");
  }
  
  const extractor = await initExtractor();
  
  try {
    const result = await extractor(buffer);
    logger.info(`Extracted ${result.text.length} chars from ${result.pageCount} pages`);
    return result;
  } catch (err) {
    logger.error("PDF extraction failed:", err?.message);
    return { text: "", pageCount: 0 };
  }
}

module.exports = {
  extractPdfText,
};
