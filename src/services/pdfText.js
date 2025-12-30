const pdfjsLegacy = require("pdfjs-dist/legacy/build/pdf.js");

let pdfParseFn = null;

function logShape(label, mod) {
  try {
    // eslint-disable-next-line no-console
    console.error(`pdf-parse export shape (${label}):`, mod ? Object.keys(mod) : "null");
  } catch {
    // ignore
  }
}

function tryLoadPdfParse() {
  // Try main entry
  try {
    const mod = require("pdf-parse");
    const candidates = [mod, mod?.default, mod?.default?.default];
    const found = candidates.find((fn) => typeof fn === "function");
    if (found) return found;
    logShape("cjs-main", mod);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("pdf-parse main require failed:", err?.message);
  }

  return null;
}

async function resolvePdfParse() {
  if (pdfParseFn) return pdfParseFn;
  const loaded = tryLoadPdfParse();
  if (loaded) {
    pdfParseFn = loaded;
    return pdfParseFn;
  }

  // Fallback: minimal text extractor using pdfjs-dist legacy build
  pdfParseFn = async (buffer) => {
    const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const doc = await pdfjsLegacy.getDocument({ data }).promise;
    let text = "";
    for (let i = 1; i <= doc.numPages; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const page = await doc.getPage(i);
      // eslint-disable-next-line no-await-in-loop
      const content = await page.getTextContent();
      const str = content.items.map((it) => it.str || "").join(" ");
      text += `${str}\n`;
    }
    return { text, numpages: doc.numPages };
  };
  // eslint-disable-next-line no-console
  console.error("pdf-parse not callable; using pdfjs-dist legacy fallback");
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

