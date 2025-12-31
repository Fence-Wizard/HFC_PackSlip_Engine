/**
 * Generic Pack Slip Parser
 * 
 * Attempts to parse any pack slip format by looking for common patterns:
 * - Quantity + Unit + Description
 * - Description + Quantity + Unit
 * - Tabular data with numbers
 */

const logger = require("../../config/logger");

/**
 * Convert value to number
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
  if (/^(lb|lbs|pound)$/i.test(u)) return "lb";
  if (/^(gal|gallon)$/i.test(u)) return "gal";
  if (/^(box|bx)$/i.test(u)) return "box";
  if (/^(bag)$/i.test(u)) return "bag";
  if (/^(pkg|package)$/i.test(u)) return "pkg";
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
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse generic pack slip format
 * @param {string[]} lines - Array of text lines
 * @param {Object|null} profile - Vendor profile (unused)
 * @returns {Array} Parsed line items
 */
function parse(lines, profile = null) {
  const items = [];
  
  // Stop markers - only stop at actual footer/signature sections
  const stopRe = /(signature acknowledges|received by:|convenience fee|restock fee|lbs:\s*\d+\s*p\/d)/i;
  
  // Skip markers - headers, metadata, and addresses
  const skipRe = new RegExp([
    /^(ordered|shipped|description|item|product|qty|quantity|unit|price|amount|total|page|date|order|customer|ship|sold|bill|invoice|pack|delivery|your signature|verify|po\s*#|invoice\s*#)/i.source,
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
    /sold to/i.source,
    /ship to/i.source,
    /po box/i.source,
    /\d+\s*(st|nd|rd|th)\s+street/i.source,  // "46th Street"
    /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|way|court|ct)/i.source,
    /^\d{5}(-\d{4})?$/.source,               // ZIP codes
    /email only/i.source,
    /not responsible/i.source,
    /verify all materials/i.source,
    /remit payment/i.source,
    /billing date/i.source,
  ].join('|'), 'i');
  
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = cleanLine(rawLine);
    
    if (stopRe.test(line)) break;
    if (skipRe.test(line.trim())) continue;
    if (line.length < 8) continue;
    
    // Pattern 1: Numbers at start, unit, then description
    // "12 14 0 pc Widget Assembly"
    let m = line.match(/^\s*(\d+)\s+(?:\d+\s+)*(\d+)?\s*([a-zA-Z]{1,5})\s+([A-Za-z].{4,})$/);
    if (m) {
      const qty = toNum(m[2]) || toNum(m[1]) || 0;
      const unit = normalizeUnit(m[3]);
      let desc = (m[4] || "").trim();
      desc = desc.replace(/\s+[IiEe\-]+\s*$/, "").trim();
      
      if (desc && qty > 0 && !skipRe.test(desc)) {
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
    
    // Pattern 2: Qty + unit + description
    // "24 pc Galvanized Post Cap 2-3/8"
    m = line.match(/^\s*(\d+)\s+([a-zA-Z]{1,5})\s+(.{5,})$/);
    if (m) {
      const qty = toNum(m[1]) || 0;
      const unit = normalizeUnit(m[2]);
      const desc = (m[3] || "").trim();
      
      if (desc && qty > 0 && !skipRe.test(desc)) {
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
    
    // Pattern 3: Description followed by qty and optional unit
    // "Galvanized Post Cap 2-3/8 24 EA"
    m = line.match(/^([A-Za-z].{4,}?)\s+(\d+)\s*(EA|PC|FT|LF|LB|KG|GAL|BOX|BAG|PKG|RLL|EACH|PCS)?\s*$/i);
    if (m) {
      let desc = (m[1] || "").trim();
      const qty = toNum(m[2]) || 0;
      const unit = normalizeUnit(m[3] || "ea");
      
      if (desc && qty > 0 && !skipRe.test(desc)) {
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
    
    // Pattern 4: Look for product keywords with quantities anywhere in line
    // Catches fence/construction related products
    m = line.match(/(\d+)\s*(?:pc|ft|ea)?\s*((?:GALV|VNL|VINYL|BLACK|TENSION|BRACE|POST|RAIL|CAP|TOP|BOTTOM|GATE|HINGE|LATCH|TIE|WIRE|FABRIC|MESH|SLAT|BOLT|NUT|WASHER|SCREW|BRACKET|CLAMP|CONCRETE|CEMENT|LUMBER|BOARD|PIPE|TUBE|STEEL|ALUMINUM|WOOD).+)/i);
    if (m) {
      const qty = toNum(m[1]) || 0;
      let desc = (m[2] || "").trim();
      desc = desc.replace(/\s+[IiEe\-]+\s*$/, "").trim();
      
      if (desc && desc.length > 5 && qty > 0) {
        const unitMatch = desc.match(/\b(pc|ft|ea|lf)\b/i);
        const unit = normalizeUnit(unitMatch ? unitMatch[1] : "ea");
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
    
    // Pattern 5: SKU/Item# pattern - "ABC123 Widget Description 12 EA"
    m = line.match(/^([A-Z0-9\-]{3,15})\s+(.{5,}?)\s+(\d+)\s*([A-Z]{1,5})?\s*$/i);
    if (m) {
      const sku = m[1].trim();
      const desc = (m[2] || "").trim();
      const qty = toNum(m[3]) || 0;
      const unit = normalizeUnit(m[4] || "ea");
      
      if (desc && qty > 0) {
        items.push({ 
          sku, 
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
  
  logger.info(`Generic parser found ${items.length} items`);
  return items;
}

module.exports = { parse };

