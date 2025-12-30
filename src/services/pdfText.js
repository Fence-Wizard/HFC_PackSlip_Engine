/**
 * PDF text extraction using pdfjs-dist directly.
 * This avoids pdf-parse v2.x constructor issues.
 * Preserves line breaks based on Y-coordinates for table extraction.
 */

let pdfjsLib = null;
let loadPromise = null;

async function loadPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Try ESM import of pdfjs-dist (works in Node 22)
    try {
      const mod = await import("pdfjs-dist");
      if (mod?.getDocument) {
        pdfjsLib = mod;
        // eslint-disable-next-line no-console
        console.log("pdfjs-dist loaded successfully (ESM)");
        return pdfjsLib;
      }
      if (mod?.default?.getDocument) {
        pdfjsLib = mod.default;
        // eslint-disable-next-line no-console
        console.log("pdfjs-dist loaded successfully (ESM default)");
        return pdfjsLib;
      }
      // eslint-disable-next-line no-console
      console.error("pdfjs-dist loaded but getDocument not found:", Object.keys(mod || {}));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("pdfjs-dist ESM import failed:", err?.message);
    }

    // Try legacy CJS paths as fallback
    const legacyPaths = [
      "pdfjs-dist/legacy/build/pdf.js",
      "pdfjs-dist/legacy/build/pdf",
      "pdfjs-dist/build/pdf",
    ];
    for (const p of legacyPaths) {
      try {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        const mod = require(p);
        if (mod?.getDocument) {
          pdfjsLib = mod;
          // eslint-disable-next-line no-console
          console.log(`pdfjs-dist loaded successfully (CJS: ${p})`);
          return pdfjsLib;
        }
      } catch {
        // try next
      }
    }

    // eslint-disable-next-line no-console
    console.error("pdfjs-dist could not be loaded from any path");
    return null;
  })();

  return loadPromise;
}

/**
 * Extract text from a single page, preserving line structure.
 * Groups text items by Y-coordinate to maintain rows.
 */
function extractPageTextWithLines(content) {
  if (!content.items || content.items.length === 0) return "";

  // Group items by their Y-coordinate (with tolerance for slight variations)
  const LINE_TOLERANCE = 3; // pixels
  const lines = [];

  for (const item of content.items) {
    if (!item.str || !item.str.trim()) continue;

    // Get Y coordinate from transform matrix [a, b, c, d, e, f] where f is Y
    const y = item.transform ? item.transform[5] : 0;
    const x = item.transform ? item.transform[4] : 0;

    // Find existing line with similar Y
    let foundLine = null;
    for (const line of lines) {
      if (Math.abs(line.y - y) <= LINE_TOLERANCE) {
        foundLine = line;
        break;
      }
    }

    if (foundLine) {
      foundLine.items.push({ x, text: item.str });
    } else {
      lines.push({ y, items: [{ x, text: item.str }] });
    }
  }

  // Sort lines by Y (descending - PDF coordinates have origin at bottom)
  lines.sort((a, b) => b.y - a.y);

  // For each line, sort items by X (left to right) and join
  const textLines = lines.map((line) => {
    line.items.sort((a, b) => a.x - b.x);
    return line.items.map((i) => i.text).join(" ").trim();
  });

  return textLines.filter(Boolean).join("\n");
}

/**
 * Extract text from a PDF buffer using pdfjs-dist directly.
 * Preserves line breaks based on Y-coordinates for better table extraction.
 * @param {Buffer} buffer - Node.js Buffer containing PDF data
 * @returns {Promise<{text: string, pageCount: number}>}
 */
async function extractPdfText(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("extractPdfText expected a Node Buffer");
  }

  const pdfjs = await loadPdfjs();
  if (!pdfjs || typeof pdfjs.getDocument !== "function") {
    throw new Error("pdfjs-dist unavailable - cannot extract PDF text");
  }

  // Convert Node Buffer to Uint8Array (required by pdfjs)
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Load the PDF document
  const loadingTask = pdfjs.getDocument({
    data,
    // Disable workers in Node.js environment
    disableFontFace: true,
    isEvalSupported: false,
  });

  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  const textParts = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum += 1) {
    // eslint-disable-next-line no-await-in-loop
    const page = await doc.getPage(pageNum);
    // eslint-disable-next-line no-await-in-loop
    const content = await page.getTextContent();

    // Extract text with line preservation
    const pageText = extractPageTextWithLines(content);

    if (pageText) {
      textParts.push(pageText);
    }
  }

  return {
    text: textParts.join("\n\n").trim(),
    pageCount: numPages,
  };
}

module.exports = {
  extractPdfText,
};
