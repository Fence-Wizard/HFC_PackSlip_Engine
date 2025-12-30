let pdfParseFn = null;

async function resolvePdfParse() {
  if (pdfParseFn) return pdfParseFn;

  try {
    const mod = require("pdf-parse");
    const candidates = [mod, mod?.default, mod?.default?.default];
    const found = candidates.find((fn) => typeof fn === "function");
    if (found) {
      pdfParseFn = found;
      return pdfParseFn;
    }
    // eslint-disable-next-line no-console
    console.error("pdf-parse export shape (cjs):", Object.keys(mod || {}));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("pdf-parse require failed:", err?.message);
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

