let pdfParseFn = null;

async function resolvePdfParse() {
  if (pdfParseFn) return pdfParseFn;

  // Try pdf-parse first
  try {
    const mod = require("pdf-parse");
    
    // Check for v1.x style callable
    const candidates = [mod, mod?.default, mod?.default?.default];
    const found = candidates.find((fn) => typeof fn === "function");
    if (found) {
      // eslint-disable-next-line no-console
      console.log("✓ Using pdf-parse (v1 style)");
      pdfParseFn = found;
      return pdfParseFn;
    }
    
    // Check for v2.x PDFParse class
    if (mod?.PDFParse && typeof mod.PDFParse === "function") {
      // eslint-disable-next-line no-console
      console.log("✓ Using pdf-parse v2 PDFParse class");
      const PDFParseClass = mod.PDFParse;
      pdfParseFn = async (buffer) => {
        const parser = new PDFParseClass();
        const result = await parser.parse(buffer);
        return {
          text: result?.text || "",
          numpages: result?.numPages || result?.numpages || result?.pages || 0,
        };
      };
      return pdfParseFn;
    }
    
    // eslint-disable-next-line no-console
    console.log("pdf-parse exports:", Object.keys(mod || {}));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log("pdf-parse not available:", err?.message);
  }

  // Fallback to pdfjs-dist using dynamic import (ESM)
  // eslint-disable-next-line no-console
  console.log("Using pdfjs-dist fallback...");
  
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfParseFn = async (buffer) => {
      const data = new Uint8Array(buffer);
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdfDoc = await loadingTask.promise;
      let fullText = "";
      for (let i = 1; i <= pdfDoc.numPages; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const page = await pdfDoc.getPage(i);
        // eslint-disable-next-line no-await-in-loop
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += `${pageText}\n`;
      }
      return { text: fullText.trim(), numpages: pdfDoc.numPages };
    };
    // eslint-disable-next-line no-console
    console.log("✓ pdfjs-dist loaded successfully");
    return pdfParseFn;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("pdfjs-dist fallback failed:", err?.message);
    throw new Error("No PDF parser available");
  }
}

async function extractPdfText(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("extractPdfText expected a Node Buffer");
  }
  const parse = await resolvePdfParse();
  const data = await parse(buffer);
  return {
    text: (data?.text || "").trim(),
    pageCount: data?.numpages || 0,
  };
}

module.exports = {
  extractPdfText,
};

