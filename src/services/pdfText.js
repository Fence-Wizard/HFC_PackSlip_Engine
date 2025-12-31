/**
 * PDF text extraction with multiple fallback strategies.
 * Tries pdf-parse v2.x first, then falls back to pdfjs-dist.
 */

const logger = require("../config/logger");

let extractorFn = null;

/**
 * Try to set up pdf-parse v2.x extractor
 */
function tryPdfParseV2() {
  try {
    const pdfParse = require("pdf-parse");
    
    // Check if it's v2.x with PDFParse class
    if (pdfParse.PDFParse) {
      const PDFParse = pdfParse.PDFParse;
      logger.info("Using pdf-parse v2.x with PDFParse class");
      
      return async (buffer) => {
        // PDFParse v2.x requires options with verbosity
        const parser = new PDFParse({
          verbosity: 0, // Suppress warnings
          max: 0, // No page limit
        });
        
        const result = await parser.parse(buffer);
        return {
          text: result?.text || "",
          pageCount: result?.numPages || result?.numpages || 0,
        };
      };
    }
    
    // Check if it's v1.x style (function directly)
    if (typeof pdfParse === "function") {
      logger.info("Using pdf-parse v1.x style");
      return async (buffer) => {
        const result = await pdfParse(buffer);
        return {
          text: result?.text || "",
          pageCount: result?.numpages || 0,
        };
      };
    }
    
    // Check for default export
    if (typeof pdfParse.default === "function") {
      logger.info("Using pdf-parse default export");
      return async (buffer) => {
        const result = await pdfParse.default(buffer);
        return {
          text: result?.text || "",
          pageCount: result?.numpages || 0,
        };
      };
    }
    
    logger.warn("pdf-parse found but no usable export:", Object.keys(pdfParse));
  } catch (err) {
    logger.warn("pdf-parse not available:", err?.message);
  }
  
  return null;
}

/**
 * Set up pdfjs-dist extractor as fallback
 */
async function tryPdfjsDist() {
  try {
    // Try ESM import
    const pdfjs = await import("pdfjs-dist");
    const getDocument = pdfjs.getDocument || pdfjs.default?.getDocument;
    
    if (!getDocument) {
      logger.warn("pdfjs-dist loaded but getDocument not found");
      return null;
    }
    
    logger.info("Using pdfjs-dist for PDF extraction");
    
    return async (buffer) => {
      // Convert Buffer to Uint8Array
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
            // Group by Y coordinate for line preservation
            const lines = {};
            for (const item of content.items) {
              if (!item.str) continue;
              const y = Math.round(item.transform?.[5] || 0);
              if (!lines[y]) lines[y] = [];
              lines[y].push({ x: item.transform?.[4] || 0, text: item.str });
            }
            
            // Sort by Y (descending) and X (ascending)
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
  
  // Try pdf-parse v2.x first (it uses a newer pdfjs-dist internally)
  extractorFn = tryPdfParseV2();
  if (extractorFn) return extractorFn;
  
  // Fall back to direct pdfjs-dist
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
    // Return empty result instead of throwing
    return { text: "", pageCount: 0 };
  }
}

module.exports = {
  extractPdfText,
};
