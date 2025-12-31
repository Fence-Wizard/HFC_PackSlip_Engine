/**
 * Normalize text input to string
 */
function toStringText(text) {
  if (!text) return "";
  if (typeof text === "string") return text;
  if (Array.isArray(text)) return text.join("\n");
  if (typeof text === "object" && text.text) return toStringText(text.text);
  return String(text);
}

/**
 * Determines if a PDF appears to be scanned (image-based rather than text-based).
 * @param {string|Array|any} text - The extracted text from the PDF
 * @returns {boolean} - True if the PDF appears to be scanned
 */
function looksLikeScannedPdf(text) {
  // Normalize input to string
  const textStr = toStringText(text);
  
  // More lenient threshold - only consider "scanned" if very little text
  // and text doesn't contain common document keywords
  const cleaned = textStr.replace(/\s+/g, "");
  
  // If we have more than 100 characters, it's likely a text PDF
  if (cleaned.length > 100) {
    return false;
  }
  
  // If we have some text with common document keywords, not scanned
  const lowerText = textStr.toLowerCase();
  const documentKeywords = [
    "order", "ship", "deliver", "item", "qty", "quantity",
    "description", "total", "invoice", "pack slip", "customer",
    "date", "po", "unit", "price", "amount"
  ];
  
  const hasKeywords = documentKeywords.some(kw => lowerText.includes(kw));
  if (hasKeywords && cleaned.length > 30) {
    return false;
  }
  
  // Very little text and no keywords - likely scanned
  return cleaned.length < 50;
}

module.exports = { looksLikeScannedPdf };
