const { createRequire } = require("module");

// Avoid shadowing the global require to prevent TDZ issues
const req = typeof createRequire === "function" ? createRequire(__filename) : require;

let pdfParseFn = null;

async function resolvePdfParse() {
  if (pdfParseFn) return pdfParseFn;

  // Try CommonJS require
  try {
    const mod = req("pdf-parse");
    const candidates = [mod, mod?.default, mod?.default?.default];
    const found = candidates.find((fn) => typeof fn === "function");
    if (found) {
      pdfParseFn = found;
      return pdfParseFn;
    }
    // eslint-disable-next-line no-console
    console.error("pdf-parse export shape (cjs):", Object.keys(mod || {}));
  } catch (err) {
    // fall through to ESM import
  }

  // Try dynamic ESM import
  try {
    const mod = await import("pdf-parse");
    if (typeof mod === "function") {
      pdfParseFn = mod;
      return pdfParseFn;
    }
    if (mod && typeof mod.default === "function") {
      pdfParseFn = mod.default;
      return pdfParseFn;
    }
    if (mod && typeof mod.default?.default === "function") {
      pdfParseFn = mod.default.default;
      return pdfParseFn;
    }
    // eslint-disable-next-line no-console
    console.error("pdf-parse export shape (esm):", Object.keys(mod || {}));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("pdf-parse dynamic import failed:", err?.message);
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

