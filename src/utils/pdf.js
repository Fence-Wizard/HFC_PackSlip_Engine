function looksLikeScannedPdf(text) {
  const cleaned = (text || "").replace(/\s+/g, "");
  return cleaned.length < 30;
}

module.exports = { looksLikeScannedPdf };

