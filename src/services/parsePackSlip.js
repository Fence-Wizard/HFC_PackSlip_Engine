/**
 * Multi-format pack slip parser with OCR text support.
 * Supports multiple supplier formats and auto-detects based on document content.
 */

const logger = require("../config/logger");

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
    .replace(/\|/g, " ")
    .replace(/\[/g, " ")
    .replace(/\]/g, " ")
    .replace(/—/g, " ")
    .replace(/~/g, " ")
    .replace(/\{/g, " ")
    .replace(/\}/g, " ")
    // Fix OCR unit errors
    .replace(/\bolpc\b/gi, "0 pc")
    .replace(/\bOlpc\b/g, "0 pc")
    .replace(/\bo\s*ft\b/gi, "0 ft")
    .replace(/\bo\s*pc\b/gi, "0 pc")
    .replace(/\bo\s*ea\b/gi, "0 ea")
    .replace(/\bope\b/gi, "0 pc")
    .replace(/\bO\s*lpc\b/g, "0 pc")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize unit string
 */
function normalizeUnit(unit) {
  if (!unit) return "ea";
  const u = unit.toLowerCase().trim();
  
  // Common OCR errors and variations
  if (/^(pc|pcs|piece|pieces)$/i.test(u)) return "pc";
  if (/^(ft|feet|foot|lf)$/i.test(u)) return "ft";
  if (/^(ea|each)$/i.test(u)) return "ea";
  if (/^(o|0)$/i.test(u)) return "ea"; // OCR often reads unit as '0' or 'o'
  
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
  
  // Stop markers
  const stopRe = /(materials received|signature acknowledges|review all items|print name|date:|received by)/i;
  const skipRe = /^\*+|your signature|items accurately|at the time|verify selvage/i;

  const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
  
  for (let i = startIdx; i < lines.length; i++) {
    let line = cleanOcrLine(lines[i]);
    if (stopRe.test(line)) break;
    if (skipRe.test(line) || line.length < 10) continue;
    
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
  const stopRe = /(signature|received by|total order|terms|conditions|materials received|print name)/i;
  const skipRe = /^(ordered|shipped|description|item|product|qty|quantity|unit|price|amount|total|page|date|order|customer|ship|sold|bill|invoice|pack|delivery|your signature|verify)/i;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = cleanOcrLine(rawLine);
    
    if (stopRe.test(line)) break;
    if (skipRe.test(line.trim())) continue;
    if (line.length < 8) continue;
    
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
 */
function parsePackSlip(text) {
  if (!text || !text.trim()) {
    logger.warn("parsePackSlip: empty text provided");
    return [];
  }
  
  // Split into lines first, then clean each line individually
  const lines = text
    .split(/\r?\n/)
    .map((l) => cleanOcrLine(l))
    .filter((l) => l.length > 0);

  const format = detectFormat(text);
  logger.info(`Pack slip format detected: ${format}, ${lines.length} lines`);

  let items = [];

  // Try format-specific parser first
  switch (format) {
    case "sps":
    case "masterhalco":
      items = parseSpsOcr(lines);
      break;
    default:
      items = parseGenericOcr(lines);
  }

  // If primary parser found nothing, try generic
  if (items.length === 0) {
    logger.info("Primary parser found no items, trying generic OCR parser");
    items = parseGenericOcr(lines);
  }
  
  // Still nothing? Try SPS parser as last resort
  if (items.length === 0) {
    logger.info("Generic parser found no items, trying SPS OCR parser");
    items = parseSpsOcr(lines);
  }

  logger.info(`parsePackSlip: found ${items.length} line items`);
  return items;
}

module.exports = { parsePackSlip, detectFormat, cleanOcrText };
