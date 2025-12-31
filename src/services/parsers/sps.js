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
  const u = unit.toLowerCase().trim();
  
  if (/^(pc|pcs|piece|pieces)$/i.test(u)) return "pc";
  if (/^(ft|feet|foot|lf)$/i.test(u)) return "ft";
  if (/^(ea|each)$/i.test(u)) return "ea";
  if (/^(rll|roll)$/i.test(u)) return "rll";
  if (/^(o|0)$/i.test(u)) return "ea";
  
  return u.substring(0, 4);
}

/**
 * Clean OCR artifacts from a line
 */
function cleanLine(line) {
  if (!line) return "";
  
  return line
    .replace(/[|\[\]{}—~]/g, " ")
    .replace(/\bolpc\b/gi, "0 pc")
    .replace(/\bOlpc\b/g, "0 pc")
    .replace(/\bo\s*ft\b/gi, "0 ft")
    .replace(/\bo\s*pc\b/gi, "0 pc")
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
  
  // Find header row
  const headerIdx = lines.findIndex(
    (l) => /ordered/i.test(l) && /shipped/i.test(l)
  );
  
  // Stop markers
  const stopRe = /(materials received|signature acknowledges|review all items|print name|date:|received by|ask me about)/i;
  const skipRe = /^\*+|your signature|items accurately|at the time|verify selvage|colanna/i;
  
  const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
  
  for (let i = startIdx; i < lines.length; i++) {
    let line = cleanLine(lines[i]);
    if (stopRe.test(line)) break;
    if (skipRe.test(line) || line.length < 10) continue;
    
    // Pattern 1: qty qty qty unit description (full SPS format)
    // Example: "144 144 0 ft BLKVNL 4 x18 x SP40x8pc"
    let m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s*([a-zA-Z]{1,4})\s+(.+)$/);
    if (m) {
      const shipped = toNum(m[2]) || toNum(m[1]) || 0;
      const unit = normalizeUnit(m[4]);
      const desc = cleanDescription(m[5]);
      
      if (desc && desc.length > 3 && shipped > 0) {
        items.push({ 
          sku: "", 
          description: desc, 
          quantity: shipped, 
          unit, 
          price: 0, 
          notes: "" 
        });
        continue;
      }
    }
    
    // Pattern 2: qty qty unit description (missing backorder column)
    m = line.match(/^\s*(\d+)\s+(\d+)\s*([a-zA-Z]{1,4})\s+(.+)$/);
    if (m) {
      const shipped = toNum(m[2]) || toNum(m[1]) || 0;
      const unit = normalizeUnit(m[3]);
      const desc = cleanDescription(m[4]);
      
      if (desc && desc.length > 3 && shipped > 0) {
        items.push({ 
          sku: "", 
          description: desc, 
          quantity: shipped, 
          unit, 
          price: 0, 
          notes: "" 
        });
        continue;
      }
    }
    
    // Pattern 3: qty unit description (simplified)
    m = line.match(/^\s*(\d+)\s*([a-zA-Z]{1,4})\s+([A-Z].+)$/);
    if (m) {
      const qty = toNum(m[1]) || 0;
      const unit = normalizeUnit(m[2]);
      const desc = cleanDescription(m[3]);
      
      if (desc && desc.length > 3 && qty > 0) {
        items.push({ 
          sku: "", 
          description: desc, 
          quantity: qty, 
          unit, 
          price: 0, 
          notes: "" 
        });
        continue;
      }
    }
    
    // Pattern 4: Fence-specific product patterns
    // Look for BLKVNL, GALV, VNL, etc. with quantities
    m = line.match(/(\d+)\s*(?:pc|ft|ea)?\s*((?:BLK|GRN|WHT|GALV|VNL|BLACK|GREEN|WHITE|CHAIN|MESH|FABRIC|TENSION|BRACE|POST|RAIL|CAP|TOP|BOTTOM|GATE|SLAT|TIE).+)/i);
    if (m) {
      const qty = toNum(m[1]) || 0;
      const desc = cleanDescription(m[2]);
      
      const unitMatch = desc.match(/\b(pc|ft|ea|lf|each)\b/i);
      const unit = normalizeUnit(unitMatch ? unitMatch[1] : "pc");
      
      if (desc && desc.length > 5 && qty > 0) {
        items.push({ 
          sku: "", 
          description: desc, 
          quantity: qty, 
          unit, 
          price: 0, 
          notes: "" 
        });
        continue;
      }
    }
    
    // Pattern 5: Wire/mesh pattern (specific to fencing)
    // "6ga 2x9 Galv Fabric 50ft rolls" 
    m = line.match(/(\d+)\s*(rolls?|pcs?|ea|ft)?\s*((?:\d+ga|galv|vinyl|fabric|mesh|wire).+)/i);
    if (m) {
      const qty = toNum(m[1]) || 0;
      const unit = normalizeUnit(m[2] || "ea");
      const desc = cleanDescription(m[3]);
      
      if (desc && desc.length > 5 && qty > 0) {
        items.push({ 
          sku: "", 
          description: desc, 
          quantity: qty, 
          unit, 
          price: 0, 
          notes: "" 
        });
      }
    }
    
    if (items.length >= 200) break;
  }
  
  logger.info(`SPS parser found ${items.length} items`);
  return items;
}

module.exports = { parse };

