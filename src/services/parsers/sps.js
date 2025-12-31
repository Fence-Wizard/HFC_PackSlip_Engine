/**
 * SPS (Stephens Pipe & Steel) Parser
 * 
 * Pack slip format:
 * Columns: Ordered | Shipped | BackOrder | Unit | Description | Packing | Price | Amount
 * 
 * OCR often produces: qty qty qty unit description
 * Example: "144 144 0 ft BLKVNL 4 x18 x SP40x8pc"
 */

const logger = require("../../config/logger");
const { containsFenceProduct, inferUnit } = require("../../config/productLibrary");

/**
 * Convert value to number, handling common OCR errors
 */
function toNum(val) {
  if (val == null) return null;
  const cleaned = String(val).replace(/,/g, "").replace(/[oO]/g, "0").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Normalize unit string
 */
function normalizeUnit(unit) {
  if (!unit) return "ea";
  let u = unit.toLowerCase().trim();
  
  // Remove leading zeros/O's that OCR adds: "001pc" -> "pc", "olpc" -> "pc"
  u = u.replace(/^[0oO]+/, "");
  
  if (/^(pc|pcs|piece|pieces|lpc)$/i.test(u)) return "pc";
  if (/^(ft|feet|foot|lf|lft)$/i.test(u)) return "ft";
  if (/^(ea|each|iee|bee)$/i.test(u)) return "ea";  // IEE/BEE are OCR errors
  if (/^(rl|rll|roll|r11)$/i.test(u)) return "rl";  // r11 is OCR for rll
  if (/^(bag|bags)$/i.test(u)) return "bag";
  if (/^(set|sets)$/i.test(u)) return "set";
  if (/^(box|bx)$/i.test(u)) return "box";
  if (/^(pk|pkg|pack)$/i.test(u)) return "pk";
  if (/^(o|0)$/i.test(u)) return "ea";
  
  return u.substring(0, 4);
}

/**
 * Clean OCR artifacts from a line
 */
function cleanLine(line) {
  if (!line) return "";
  
  return line
    // Remove brackets that OCR adds after numbers: "200]" -> "200"
    .replace(/(\d+)\]/g, "$1")
    // Replace pipe/bracket combos with space
    .replace(/[|\[\]{}—~]/g, " ")
    // OCR reads "0|ft" or "O|ft" as unit - normalize
    .replace(/\b[oO0]\s*\|\s*ft\b/gi, " ft ")
    .replace(/\b[oO0]\s*\|\s*pc\b/gi, " pc ")
    .replace(/\b[oO0]\s*\|\s*ea\b/gi, " ea ")
    // "0Olpc", "00lpc", "Olpc", "0lpc", "olpc" etc -> " pc "
    .replace(/\b[oO0]+l?(pc|ft|ea|rl)\b/gi, " $1 ")
    // "Ofea", "0fea" -> " ea " (OCR adds O/0 and f before ea)
    .replace(/\b[oO0]f?(ea|pc|ft)\b/gi, " $1 ")
    // "IE", "IEE", "BE", "BEE" are OCR errors for numbers - remove them
    .replace(/\b[IB]E{1,2}\b/gi, " ")
    // Clean up underscores used as placeholders
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean description of trailing OCR junk
 */
function cleanDescription(desc) {
  if (!desc) return "";
  let cleaned = desc.trim();
  
  for (let i = 0; i < 3; i++) {
    cleaned = cleaned.replace(/\s+[IiEe]{1,3}\s*$/, "");
    cleaned = cleaned.replace(/\s+[Ee]s\s*$/i, "");
    cleaned = cleaned.replace(/\s+EE+\s*$/i, "");
    cleaned = cleaned.replace(/\s+I\s*$/i, "");
    cleaned = cleaned.replace(/\s+[—\-~]+\s*$/, "");
    cleaned = cleaned.replace(/\s+\d{1,2}\s*$/, "");
    cleaned = cleaned.trim();
  }
  
  return cleaned;
}

/**
 * Parse SPS pack slip format
 * @param {string[]} lines - Array of cleaned text lines
 * @param {Object|null} profile - Vendor profile (unused for now)
 * @returns {Array} Parsed line items
 */
function parse(lines, profile = null) {
  const items = [];
  
  // Try to find header row (optional - OCR often misses it)
  const headerIdx = lines.findIndex(
    (l) => /ordered/i.test(l) && /shipped/i.test(l)
  );
  
  if (headerIdx >= 0) {
    logger.info(`SPS parser: Found header at line ${headerIdx}`);
  } else {
    logger.info("SPS parser: No header found, will scan for fence product patterns");
  }
  
  // Stop markers - only stop at actual footer/signature sections
  // Note: "materials received" often appears mid-page in SPS documents, so don't stop there
  const stopRe = /(signature acknowledges|received by:|convenience fee|restock fee|lbs:\s*\d+\s*p\/d)/i;
  
  // Skip patterns - addresses, metadata, headers (NOT line items)
  const skipPatterns = [
    /^\*+/,                          // Lines starting with asterisks
    /your signature/i,
    /items accurately/i,
    /at the time/i,
    /verify selvage/i,
    /customer acct/i,
    /payment terms/i,
    /customer po/i,
    /visit our website/i,
    /sales person/i,
    /sales fax/i,
    /sales phone/i,
    /contact name/i,
    /fax number/i,
    /shipped via/i,
    /quote valid/i,
    /sold to:/i,
    /ship to:/i,
    /^po box/i,
    /\d+\s*(st|nd|rd|th)\s+street/i,  // "46th Street"
    /^\d{5}(-\d{4})?$/,               // ZIP codes
    /^[A-Z]{2}\s+\d{5}/,              // State ZIP
    /richmond|bladensburg|maryland|virginia/i,
    /hurricane fence/i,
    /email only/i,
    /not responsible/i,
    /verify all materials/i,
    /remit payment/i,
    /billing date/i,
    /stephens pipe/i,
    /pipessteel/i,
    /spsfence\.com/i,
    /sps order/i,
    /expires:/i,
    /send invoice/i,
  ];
  
  function shouldSkip(line) {
    return skipPatterns.some(re => re.test(line));
  }
  
  // Use product library for fence product detection
  const isFenceProduct = (line) => containsFenceProduct(line);
  
  // Start after header if found, otherwise from beginning
  const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
  
  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i];
    let line = cleanLine(rawLine);
    
    // Stop at footer markers
    if (stopRe.test(line)) {
      logger.debug(`SPS parser: stopping at line ${i}: "${line.substring(0, 50)}..."`);
      break;
    }
    
    // Skip metadata and address lines
    if (shouldSkip(line) || line.length < 8) continue;
    
    // Must contain fence-related keywords to be a valid line item
    if (!isFenceProduct(line)) continue;
    
    logger.debug(`SPS parser: checking line ${i}: "${line}"`);
    
    // Common units including OCR variations
    const unitPattern = /^(ft|pc|ea|rl|rll|bag|set|box|pk|pkg|pcs|lf|each)$/i;
    
    // Pattern 1: qty qty qty unit description (full SPS format with backorder)
    // Example: "144 144 0 ft BLKVNL 4 x18 x SP40x8pc"
    let m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+([a-z]{2,4})\s+(.+)$/i);
    if (m && unitPattern.test(m[4])) {
      const shipped = toNum(m[2]) || toNum(m[1]) || 0;
      const unit = normalizeUnit(m[4]);
      const desc = cleanDescription(m[5]);
      
      if (desc && desc.length > 3 && shipped > 0) {
        logger.info(`SPS Pattern 1: ${shipped} ${unit} - ${desc}`);
        items.push({ sku: "", description: desc, quantity: shipped, unit, price: 0, notes: "" });
        continue;
      }
    }
    
    // Pattern 2: qty qty unit description (2 numbers then unit then desc)
    // Example: "200 200 ft BLK VNL Ext 2x9" or "6 6 0 bag BLACK SLATS"
    m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d*)\s*([a-z]{2,4})\s+(.+)$/i);
    if (m && unitPattern.test(m[4])) {
      const shipped = toNum(m[2]) || toNum(m[1]) || 0;
      const unit = normalizeUnit(m[4]);
      const desc = cleanDescription(m[5]);
      
      if (desc && desc.length > 3 && shipped > 0) {
        logger.info(`SPS Pattern 2: ${shipped} ${unit} - ${desc}`);
        items.push({ sku: "", description: desc, quantity: shipped, unit, price: 0, notes: "" });
        continue;
      }
    }
    
    // Pattern 3: qty unit description (single number)
    // Example: "15 pc BLKVNL 2-1/2 x 6"
    m = line.match(/^\s*(\d+)\s+([a-z]{2,4})\s+(.+)$/i);
    if (m && unitPattern.test(m[2])) {
      const qty = toNum(m[1]) || 0;
      const unit = normalizeUnit(m[2]);
      const desc = cleanDescription(m[3]);
      
      if (desc && desc.length > 3 && qty > 0) {
        logger.info(`SPS Pattern 3: ${qty} ${unit} - ${desc}`);
        items.push({ sku: "", description: desc, quantity: qty, unit, price: 0, notes: "" });
        continue;
      }
    }
    
    // Pattern 4: Fence product with qty anywhere in line
    // Example: "BLK VNL Ext 2x9(13core)x36in KK 50ft/rl 7 ri1" with leading "200 200"
    m = line.match(/(\d+)\s+\d*\s*(ft|pc|ea|rl)?\s*((?:BLK|GRN|WHT|GALV|VNL|BLACK|GREEN|WHITE).+)/i);
    if (m) {
      const qty = toNum(m[1]) || 0;
      let desc = cleanDescription(m[3]);
      
      // Try to find unit in description
      const unitMatch = desc.match(/\b(\d+)(ft|pc|ea)\/?(rl|cl)?\b/i);
      const unit = unitMatch ? normalizeUnit(unitMatch[2]) : normalizeUnit(m[2] || "ea");
      
      if (desc && desc.length > 5 && qty > 0) {
        logger.info(`SPS Pattern 4: ${qty} ${unit} - ${desc}`);
        items.push({ sku: "", description: desc, quantity: qty, unit, price: 0, notes: "" });
        continue;
      }
    }
    
    // Pattern 5: Generic fence products with quantities
    m = line.match(/(\d+)\s+(\d+)?\s*((?:CHAIN|MESH|FABRIC|TENSION|BRACE|POST|RAIL|CAP|GATE|SLAT|TIE|WIRE).+)/i);
    if (m) {
      const qty = toNum(m[2]) || toNum(m[1]) || 0;
      const desc = cleanDescription(m[3]);
      
      const unitMatch = desc.match(/\b(ft|pc|ea|rl)\b/i);
      const unit = normalizeUnit(unitMatch ? unitMatch[1] : "ea");
      
      if (desc && desc.length > 5 && qty > 0) {
        logger.info(`SPS Pattern 5: ${qty} ${unit} - ${desc}`);
        items.push({ sku: "", description: desc, quantity: qty, unit, price: 0, notes: "" });
        continue;
      }
    }
    
    if (items.length >= 200) break;
  }
  
  logger.info(`SPS parser found ${items.length} items`);
  return items;
}

module.exports = { parse };

