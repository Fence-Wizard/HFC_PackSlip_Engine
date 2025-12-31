/**
 * Multi-format pack slip parser with OCR text support.
 * Supports multiple supplier formats and auto-detects based on document content.
 * 
 * Uses modular vendor-specific parsers from ./parsers/
 */

const logger = require("../config/logger");
const { parseWithProfile, getParser } = require("./parsers");

function toNum(val) {
  if (val == null) return null;
  const cleaned = String(val).replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Clean OCR artifacts from text.
 * OCR often produces | ] [ characters in table-like documents.
 */
function cleanOcrText(text) {
  if (!text) return "";
  
  return text
    // Replace common OCR table artifacts
    .replace(/\|/g, " ")
    .replace(/\[/g, " ")
    .replace(/\]/g, " ")
    .replace(/\{/g, " ")
    .replace(/\}/g, " ")
    // Fix common OCR errors
    .replace(/\bolpc\b/gi, "0 pc")
    .replace(/\bO\|/g, "0 ")
    .replace(/\bole\b/gi, "0 ea")
    .replace(/\boft\b/gi, "0 ft")
    .replace(/\bOft\b/g, "0 ft")
    .replace(/\bl\b/g, "1") // lone 'l' often is '1'
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean a single line from OCR artifacts
 */
function cleanOcrLine(line) {
  if (!line) return "";
  
  return line
    // Remove brackets that OCR adds after numbers: "200]" -> "200"
    .replace(/(\d+)\]/g, "$1")
    .replace(/\|/g, " ")
    .replace(/\[/g, " ")
    .replace(/\]/g, " ")
    .replace(/—/g, " ")
    .replace(/~/g, " ")
    .replace(/\{/g, " ")
    .replace(/\}/g, " ")
    // Fix OCR unit errors - "0Olpc", "00lpc", "Olpc" etc -> " pc "
    .replace(/\b[oO0]+l?(pc|ft|ea|rl)\b/gi, " $1 ")
    // "Ofea", "0fea" -> " ea "
    .replace(/\b[oO0]f?(ea|pc|ft)\b/gi, " $1 ")
    .replace(/\bo\s*ft\b/gi, " ft ")
    .replace(/\bo\s*pc\b/gi, " pc ")
    .replace(/\bo\s*ea\b/gi, " ea ")
    // "IE", "IEE", "BE", "BEE" are OCR errors - remove them
    .replace(/\b[IB]E{1,2}\b/gi, " ")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize unit string
 */
function normalizeUnit(unit) {
  if (!unit) return "ea";
  let u = unit.toLowerCase().trim();
  
  // Remove leading zeros/O's that OCR adds: "001pc" -> "pc", "olpc" -> "pc"
  u = u.replace(/^[0oO]+/, "");
  
  // Common OCR errors and variations
  if (/^(pc|pcs|piece|pieces|lpc)$/i.test(u)) return "pc";
  if (/^(ft|feet|foot|lf|lft)$/i.test(u)) return "ft";
  if (/^(ea|each|iee|bee)$/i.test(u)) return "ea";  // IEE/BEE are OCR errors
  if (/^(rl|rll|roll|r11)$/i.test(u)) return "rl";  // r11 is OCR for rll
  if (/^(bag|bags)$/i.test(u)) return "bag";
  if (/^(set|sets)$/i.test(u)) return "set";
  if (/^(o|0)$/i.test(u)) return "ea";
  
  return u.substring(0, 4); // Max 4 chars
}

/**
 * Clean description of trailing OCR artifacts
 */
function cleanDescription(desc) {
  if (!desc) return "";
  let cleaned = desc.trim();
  
  // Apply multiple times to catch nested artifacts
  for (let i = 0; i < 3; i++) {
    // Remove trailing OCR artifacts (single/double letters, punctuation)
    cleaned = cleaned.replace(/\s+[IiEe]{1,3}\s*$/, "");
    cleaned = cleaned.replace(/\s+[Ee]s\s*$/i, "");
    cleaned = cleaned.replace(/\s+EE+\s*$/i, "");
    cleaned = cleaned.replace(/\s+I\s*$/i, "");
    cleaned = cleaned.replace(/\s+[—\-~]+\s*$/, "");
    cleaned = cleaned.replace(/\s+\d{1,2}\s*$/, ""); // trailing 1-2 digit numbers
    cleaned = cleaned.trim();
  }
  
  return cleaned;
}

// ============================================================================
// FORMAT: SPS Stephens Pipe & Steel (OCR-friendly)
// Columns: Ordered | Shipped | BackOrder | Unit | Description
// ============================================================================
function parseSpsOcr(lines) {
  const items = [];
  
  // Find header row - look for "ordered" and "shipped" 
  const headerIdx = lines.findIndex(
    (l) => /ordered/i.test(l) && /shipped/i.test(l),
  );
  
  // Stop markers - ONLY stop at signature/received sections
  const stopRe = /(signature acknowledges|review all items|print name.*date|received by:|convenience fee|restock fee)/i;
  
  // Skip patterns - addresses, metadata, headers (more comprehensive)
  const skipRe = new RegExp([
    /^\*+/.source,
    /your signature/i.source,
    /items accurately/i.source,
    /at the time/i.source,
    /verify selvage/i.source,
    /customer acct/i.source,
    /payment terms/i.source,
    /customer po/i.source,
    /visit our website/i.source,
    /sales person/i.source,
    /sales fax/i.source,
    /sales phone/i.source,
    /contact name/i.source,
    /fax number/i.source,
    /shipped via/i.source,
    /quote valid/i.source,
    /sold to:/i.source,
    /ship to:/i.source,
    /^po box/i.source,
    /\d+(st|nd|rd|th)\s+street/i.source,  // "46th Street" - no space before suffix
    /russell springs/i.source,
    /bladensburg/i.source,
    /richmond/i.source,
    /email only/i.source,
    /not responsible/i.source,
    /verify all materials/i.source,
    /remit payment/i.source,
    /billing date/i.source,
    /stephens pipe/i.source,
    /pipessteel/i.source,
    /spsfence/i.source,
    /hurricane fence/i.source,
    /pack slip/i.source,
  ].join('|'), 'i');
  
  // Only match lines with fence-related keywords (no word boundaries for embedded keywords like "BLKVNL")
  const fenceKeywords = /(blk|vnl|galv|vinyl|black|green|white|grn|wht|chain|mesh|fabric|tension|brace|post|rail|cap|gate|slat|tie|wire|ext|sp\d|core|ft\/|rl|roll|hot\s*dip|clamp|barb|fitting|bracket|hinge|latch|bolt|nut|washer)/i;

  const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
  
  for (let i = startIdx; i < lines.length; i++) {
    let line = cleanOcrLine(lines[i]);
    if (stopRe.test(line)) break;
    if (skipRe.test(line) || line.length < 10) continue;
    
    // Must contain fence product keywords to be considered
    if (!fenceKeywords.test(line)) continue;
    
    // OCR Pattern 1: qty qty qty unit description
    // Example: "144 144 0 ft BLKVNL 4 x18 x SP40x8pc"
    let m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s*([a-zA-Z]{1,4})\s+(.+)$/);
    if (m) {
      const shipped = toNum(m[2]) || toNum(m[1]) || 0;
      const unit = normalizeUnit(m[4]);
      const desc = cleanDescription(m[5]);
      
      if (desc && desc.length > 3 && shipped > 0) {
        items.push({ sku: "", description: desc, quantity: shipped, unit, price: 0, notes: "" });
        continue;
      }
    }
    
    // OCR Pattern 2: qty qty unit description (missing backorder)
    m = line.match(/^\s*(\d+)\s+(\d+)\s*([a-zA-Z]{1,4})\s+(.+)$/);
    if (m) {
      const shipped = toNum(m[2]) || toNum(m[1]) || 0;
      const unit = normalizeUnit(m[3]);
      const desc = cleanDescription(m[4]);
      
      if (desc && desc.length > 3 && shipped > 0) {
        items.push({ sku: "", description: desc, quantity: shipped, unit, price: 0, notes: "" });
        continue;
      }
    }
    
    // OCR Pattern 3: qty unit description (simplified)
    m = line.match(/^\s*(\d+)\s*([a-zA-Z]{1,4})\s+([A-Z].+)$/);
    if (m) {
      const qty = toNum(m[1]) || 0;
      const unit = normalizeUnit(m[2]);
      const desc = cleanDescription(m[3]);
      
      if (desc && desc.length > 3 && qty > 0) {
        items.push({ sku: "", description: desc, quantity: qty, unit, price: 0, notes: "" });
        continue;
      }
    }
    
    // OCR Pattern 4: Look for VNL/GALV products specifically
    // "BLKVNL 4 x18 x SP40" with qty somewhere nearby
    m = line.match(/(\d+)\s*(?:pc|ft|ea)?\s*((?:BLK|GRN|WHT|GALV|VNL|BLACK|GREEN|WHITE).+)/i);
    if (m) {
      const qty = toNum(m[1]) || 0;
      const desc = cleanDescription(m[2]);
      
      // Try to extract unit from description
      const unitMatch = desc.match(/\b(pc|ft|ea|lf|each)\b/i);
      const unit = normalizeUnit(unitMatch ? unitMatch[1] : "pc");
      
      if (desc && desc.length > 5 && qty > 0) {
        items.push({ sku: "", description: desc, quantity: qty, unit, price: 0, notes: "" });
        continue;
      }
    }

    if (items.length >= 200) break;
  }

  return items;
}

// ============================================================================
// FORMAT: Generic OCR parser for any pack slip
// ============================================================================
function parseGenericOcr(lines) {
  const items = [];
  
  // Stop markers
  const stopRe = /(signature acknowledges|received by:|convenience fee|restock fee)/i;
  
  // Skip patterns - headers, metadata, AND addresses
  const skipRe = new RegExp([
    /^(ordered|shipped|description|item|product|qty|quantity|unit|price|amount|total|page|date|order|customer|ship|sold|bill|invoice|pack|delivery|your signature|verify)/i.source,
    /customer acct/i.source,
    /payment terms/i.source,
    /customer po/i.source,
    /sales person/i.source,
    /sold to:/i.source,
    /ship to:/i.source,
    /^po box/i.source,
    /\d+(st|nd|rd|th)\s+street/i.source,  // "46th Street"
    /russell springs/i.source,
    /bladensburg/i.source,
    /richmond/i.source,
    /email only/i.source,
    /not responsible/i.source,
    /remit payment/i.source,
    /billing date/i.source,
    /pack slip/i.source,
    /hurricane fence/i.source,
  ].join('|'), 'i');
  
  // Only match lines with product-related keywords (no word boundaries for embedded keywords)
  const productKeywords = /(blk|vnl|galv|vinyl|black|green|white|chain|mesh|fabric|tension|brace|post|rail|cap|gate|slat|tie|wire|sp\d|core|hot\s*dip|clamp|barb|bolt|nut|bracket|hinge|latch)/i;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = cleanOcrLine(rawLine);
    
    if (stopRe.test(line)) break;
    if (skipRe.test(line.trim())) continue;
    if (line.length < 8) continue;
    
    // Must contain product keywords
    if (!productKeywords.test(line)) continue;
    
    // Pattern: number(s) at start, unit, then description
    let m = line.match(/^\s*(\d+)\s+(?:\d+\s+)*(\d+)?\s*([a-zA-Z]{1,4})\s+([A-Za-z].{4,})$/);
    if (m) {
      const qty = toNum(m[2]) || toNum(m[1]) || 0;
      const unit = normalizeUnit(m[3]);
      let desc = (m[4] || "").trim();
      desc = desc.replace(/\s+[IiEe\-]+\s*$/, "").trim();
      
      if (desc && qty > 0 && !skipRe.test(desc)) {
        items.push({ sku: "", description: desc, quantity: qty, unit, price: 0, notes: "" });
        continue;
      }
    }

    // Pattern: description followed by qty
    m = line.match(/^([A-Za-z].{4,}?)\s+(\d+)\s*(EA|PC|FT|LF|LB|KG|GAL|BOX|BAG|PKG|RLL|EACH|PCS)?\s*$/i);
    if (m) {
      let desc = (m[1] || "").trim();
      const qty = toNum(m[2]) || 0;
      const unit = normalizeUnit(m[3] || "ea");
      
      if (desc && qty > 0 && !skipRe.test(desc)) {
        items.push({ sku: "", description: desc, quantity: qty, unit, price: 0, notes: "" });
        continue;
      }
    }
    
    // Pattern: Look for product keywords with quantities
    m = line.match(/(\d+)\s*(?:pc|ft|ea)?\s*((?:GALV|VNL|VINYL|BLACK|TENSION|BRACE|POST|RAIL|CAP|TOP|BOTTOM|GATE|HINGE|LATCH|TIE|WIRE|FABRIC|MESH|SLAT).+)/i);
    if (m) {
      const qty = toNum(m[1]) || 0;
      let desc = (m[2] || "").trim();
      desc = desc.replace(/\s+[IiEe\-]+\s*$/, "").trim();
      
      if (desc && desc.length > 5 && qty > 0) {
        const unitMatch = desc.match(/\b(pc|ft|ea|lf)\b/i);
        const unit = normalizeUnit(unitMatch ? unitMatch[1] : "pc");
        items.push({ sku: "", description: desc, quantity: qty, unit, price: 0, notes: "" });
      }
    }

    if (items.length >= 200) break;
  }

  return items;
}

// ============================================================================
// Auto-detect format and parse
// ============================================================================
function detectFormat(text) {
  const lowerText = text.toLowerCase();
  
  // SPS Stephens Pipe & Steel
  if (/stephens pipe|sps\s*fence|spsfence\.com|pipe.?steel/i.test(text)) {
    return "sps";
  }
  
  // Master Halco
  if (/master\s*halco/i.test(text)) {
    return "masterhalco";
  }
  
  // Oldcastle APG
  if (/oldcastle|apg.*company/i.test(text)) {
    return "oldcastle";
  }
  
  // Detect by column headers
  if (/ordered.*shipped/i.test(text)) {
    return "sps";
  }
  
  return "generic";
}

/**
 * Main entry point: parse extracted text into line items.
 * Handles OCR text with cleanup and flexible parsing.
 * @param {string} text - Extracted text from pack slip
 * @param {Object|null} vendorProfile - Vendor profile with parser info
 */
function parsePackSlip(text, vendorProfile = null) {
  if (!text || !text.trim()) {
    logger.warn("parsePackSlip: empty text provided");
    return [];
  }
  
  // Split into lines first, then clean each line individually
  const lines = text
    .split(/\r?\n/)
    .map((l) => cleanOcrLine(l))
    .filter((l) => l.length > 0);

  // Determine parser to use
  let parserName = "generic";
  
  if (vendorProfile?.parser) {
    // Use vendor-specified parser
    parserName = vendorProfile.parser;
    logger.info(`Using vendor-specified parser: ${parserName} for ${vendorProfile.name}`);
  } else {
    // Auto-detect format from text
    parserName = detectFormat(text);
    logger.info(`Auto-detected format: ${parserName}, ${lines.length} lines`);
  }

  let items = [];

  // Use modular parser system
  try {
    const parser = getParser(parserName);
    items = parser.parse(lines, vendorProfile);
  } catch (err) {
    logger.error("Parser error, falling back to legacy", { parser: parserName, error: err?.message });
    // Fall back to legacy parsers if modular system fails
    if (parserName === "sps" || parserName === "masterhalco") {
      items = parseSpsOcr(lines);
    } else {
      items = parseGenericOcr(lines);
    }
  }

  // If primary parser found nothing, try other approaches
  if (items.length === 0) {
    logger.info("Primary parser found no items, trying legacy generic OCR parser");
    items = parseGenericOcr(lines);
  }
  
  // Still nothing? Try SPS parser as last resort
  if (items.length === 0) {
    logger.info("Generic parser found no items, trying legacy SPS OCR parser");
    items = parseSpsOcr(lines);
  }

  logger.info(`parsePackSlip: found ${items.length} line items (vendor: ${vendorProfile?.name || "auto-detect"})`);
  return items;
}

module.exports = { parsePackSlip, detectFormat, cleanOcrText };
