let pdfParseFn = null;

function logShape(label, mod) {
  try {
    // eslint-disable-next-line no-console
    console.error(`pdf-parse export shape (${label}):`, mod ? Object.keys(mod) : "null");
  } catch {
    // ignore
  }
}

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
    logShape("cjs", mod);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("pdf-parse require failed:", err?.message);
  }

  // Fallback: no-op parser so uploads do not crash
  pdfParseFn = async () => ({ text: "(extraction unavailable)", numpages: 0 });
  return pdfParseFn;
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

