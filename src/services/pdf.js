const fs = require("fs");
const os = require("os");
const path = require("path");
const pdfParseLib = require("pdf-parse");
const { fromBuffer } = require("pdf2pic");
const logger = require("../config/logger");

const pdfParse = typeof pdfParseLib === "function" ? pdfParseLib : pdfParseLib.default;

async function parsePdfText(buffer, reqId) {
  const data = await pdfParse(buffer);
  const text = data?.text || "";
  return { text, pageCount: data?.numpages || 0 };
}

async function pdfToImages(buffer, reqId) {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-ocr-"));
    const converter = fromBuffer(buffer, {
      density: 200,
      format: "png",
      saveFilename: "page",
      savePath: tmpDir,
    });

    const result = [];
    // Convert sequentially to keep memory bounded
    let page = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const pageResult = await converter(page);
      if (!pageResult || (!pageResult.path && !pageResult.base64)) break;
      const buf = pageResult.base64
        ? Buffer.from(pageResult.base64, "base64")
        : fs.readFileSync(pageResult.path);
      result.push(buf);
      page += 1;
      // pdf2pic stops when it cannot render more pages, so we rely on that
      if (page > 50) break; // safety guard
    }
    return result;
  } catch (err) {
    logger.error("Failed converting PDF to images", { reqId, message: err?.message });
    throw err;
  }
}

module.exports = {
  parsePdfText,
  pdfToImages,
};

