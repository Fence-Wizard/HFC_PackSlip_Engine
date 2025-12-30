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
  // Try main entry - pdf-parse v2.x exports PDFParse class
  try {
    const mod = require("pdf-parse");
    
    // Check if it's a function directly (v1.x style)
    if (typeof mod === "function") return mod;
    if (typeof mod?.default === "function") return mod.default;
    
    // pdf-parse v2.x: use PDFParse class
    if (mod?.PDFParse) {
      const PDFParse = mod.PDFParse;
      // eslint-disable-next-line no-console
      console.error("pdf-parse v2 detected; using PDFParse class");
      return async (buffer) => {
        const parser = new PDFParse();
        const result = await parser.parse(buffer);
        return { text: result?.text || "", numpages: result?.numPages || result?.numpages || 0 };
      };
    }
    
    logShape("cjs-main", mod);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("pdf-parse main require failed:", err?.message);
  }

  return null;
}

async function loadPdfjs() {
  // pdfjs-dist modern versions are ESM; use dynamic import
  try {
    const mod = await import("pdfjs-dist");
    if (mod?.getDocument) return mod;
    if (mod?.default?.getDocument) return mod.default;
    // eslint-disable-next-line no-console
    console.error("pdfjs-dist loaded but getDocument not found:", Object.keys(mod));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("pdfjs-dist import failed:", err?.message);
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

  // Fallback: minimal text extractor using pdfjs-dist
  pdfParseFn = async (buffer) => {
    const pdfjs = await loadPdfjs();
    if (!pdfjs || !pdfjs.getDocument) {
      throw new Error("pdfjs-dist unavailable");
    }
    // Convert Buffer to Uint8Array for pdfjs
    const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const doc = await pdfjs.getDocument({ data }).promise;
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
  console.error("pdf-parse not callable; using pdfjs-dist fallback");
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
