const { createRequire } = require("module");

const require = createRequire(__filename);

let pdfParseFn = null;

async function resolvePdfParse() {
  if (pdfParseFn) return pdfParseFn;

  // Try CommonJS require
  try {
    const mod = require("pdf-parse");
    if (typeof mod === "function") {
      pdfParseFn = mod;
      return pdfParseFn;
    }
    if (mod && typeof mod.default === "function") {
      pdfParseFn = mod.default;
      return pdfParseFn;
    }
  } catch (err) {
    // fall through to ESM import
  }

  // Try dynamic ESM import
  const mod = await import("pdf-parse");
  if (mod && typeof mod.default === "function") {
    pdfParseFn = mod.default;
    return pdfParseFn;
  }
  if (typeof mod === "function") {
    pdfParseFn = mod;
    return pdfParseFn;
  }

  throw new Error("pdf-parse export not found");
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

