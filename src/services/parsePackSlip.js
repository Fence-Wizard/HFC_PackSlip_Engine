/**
 * Multi-format pack slip parser.
 * Supports multiple supplier formats and auto-detects based on document content.
 */

function toNum(val) {
  if (val == null) return null;
  const cleaned = String(val).replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Extract quantity and unit from strings like "32 Each", "784.00 EA", "6 rll", "14PAL"
 */
function parseQtyUnit(str) {
  if (!str) return { qty: 0, unit: "" };
  const cleaned = String(str).trim();

  // Pattern: number followed by unit (e.g., "32 Each", "784.00 EA", "6 rll")
  const match = cleaned.match(/^([\d,.]+)\s*([a-zA-Z]+)?/);
  if (match) {
    return {
      qty: toNum(match[1]) || 0,
      unit: (match[2] || "").toLowerCase().replace(/each/i, "ea"),
    };
  }
  return { qty: 0, unit: "" };
}

// ============================================================================
// FORMAT 1: SPS Stephens Pipe & Steel
// Columns: Ordered | Shipped | BackOrder | Unit | Description | Packing | Price | Amount
// ============================================================================
function parseSpsFormat(lines) {
  const items = [];

  // Find header row
  const headerIdx = lines.findIndex(
    (l) => /ordered/i.test(l) && /shipped/i.test(l) && /unit/i.test(l),
  );
  if (headerIdx === -1) return items;

  // Stop markers
  const stopRe = /(materials received by|signature acknowledges|review all items|total order|ask me about)/i;
  const skipRe = /^\*+\s*(your signature|items accurately|at the time|verify selvage|colannas)/i;

  // SPS row: qty qty backorder unit [price amount] description [packing]
  // Examples: "300 300 0 ft GRN VNL 2B 2x8..." or "16 16 0 ea 5.35 85.60 TENSION BAR"
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (stopRe.test(line)) break;
    if (skipRe.test(line) || /^\*+$/.test(line)) continue;

    // Try pattern: qty qty backorder unit description [packing]
    // Where description starts with letters
    let m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+([a-zA-Z]{1,5})\s+([A-Za-z].+)$/);
    if (m) {
      const shipped = toNum(m[2]) || toNum(m[1]) || 0;
      const unit = (m[4] || "").toLowerCase();
      let desc = (m[5] || "").trim();
      // Remove trailing packing info like "6 rll", "3 pkg"
      desc = desc.replace(/\s+\d+\s*(rll|pkg|box|bag|pal)s?\s*$/i, "").trim();

      if (desc && shipped > 0) {
        items.push({ sku: "", description: desc, quantity: shipped, unit, price: 0, notes: "" });
      }
      continue;
    }

    // Try pattern with price/amount before description
    m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+([a-zA-Z]{1,5})\s+([\d.]+)\s+([\d.]+)\s+(.+)$/);
    if (m) {
      const shipped = toNum(m[2]) || toNum(m[1]) || 0;
      const unit = (m[4] || "").toLowerCase();
      const price = toNum(m[5]) || 0;
      let desc = (m[7] || "").trim();
      desc = desc.replace(/\s+\d+\s*(rll|pkg|box|bag|pal)s?\s*$/i, "").trim();

      if (desc && shipped > 0) {
        items.push({ sku: "", description: desc, quantity: shipped, unit, price, notes: "" });
      }
    }

    if (items.length >= 200) break;
  }

  return items;
}

// ============================================================================
// FORMAT 2: Docks & Docks Lumber / Generic Delivery Ticket
// Columns: Item | Description | Qty Delivered | BackOrdered | Received
// ============================================================================
function parseDocksFormat(lines) {
  const items = [];

  // Find header row
  const headerIdx = lines.findIndex(
    (l) => /description/i.test(l) && /qty\s*delivered/i.test(l),
  );
  if (headerIdx === -1) return items;

  const stopRe = /(all items listed|received in good condition|subject to our terms)/i;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (stopRe.test(line)) break;
    if (!line.trim()) continue;

    // Pattern: item# description qty [unit]
    // Example: "1 24M16P - 2x4x16 #1 Prime MCA - GC 32 Each"
    const m = line.match(/^\s*(\d+)\s+(.+?)\s+(\d+)\s*(Each|EA|PC|LF|SF|BF|CY|GAL|LB|TON|BAG|BOX|PKG|PCS|FT|IN)?\s*$/i);
    if (m) {
      const desc = (m[2] || "").trim();
      const qty = toNum(m[3]) || 0;
      const unit = (m[4] || "ea").toLowerCase();

      if (desc && qty > 0) {
        items.push({ sku: "", description: desc, quantity: qty, unit, price: 0, notes: "" });
      }
    }

    if (items.length >= 200) break;
  }

  return items;
}

// ============================================================================
// FORMAT 3: Oldcastle APG / Shipping Ticket
// Columns: ITEM #/PART # | DESCRIPTION | PKG/PART LOAD | TOTAL ORDER
// ============================================================================
function parseOldcastleFormat(lines) {
  const items = [];

  // Find header row
  const headerIdx = lines.findIndex(
    (l) => /item\s*#/i.test(l) && /description/i.test(l) && /total\s*order/i.test(l),
  );
  if (headerIdx === -1) return items;

  const stopRe = /(driver'?s signature|received by name|total pkg qty)/i;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (stopRe.test(line)) break;
    if (!line.trim()) continue;

    // Pattern: item#/part# barcode description location qty unit
    // Example: "65200940 / 293316 764661103608 Sakrete Concrete 60lb Location YARD 14PAL/0.00EA 784.00 EA"
    // Simpler: look for description followed by quantity
    const m = line.match(/^[\d\s\/]+\s+\d+\s+(.+?)\s+Location\s+\w+\s+[\d.\/]+\w+\s+([\d.]+)\s*([A-Za-z]+)/i);
    if (m) {
      const desc = (m[1] || "").trim();
      const qty = toNum(m[2]) || 0;
      const unit = (m[3] || "ea").toLowerCase();

      if (desc && qty > 0) {
        items.push({ sku: "", description: desc, quantity: qty, unit, price: 0, notes: "" });
      }
      continue;
    }

    // Fallback: look for product name with qty at end
    const m2 = line.match(/(.+?)\s+([\d.]+)\s*(EA|PC|LB|KG|PAL|BAG|BOX|PKG)\b/i);
    if (m2) {
      let desc = (m2[1] || "").trim();
      // Clean up leading numbers/barcodes
      desc = desc.replace(/^[\d\s\/]+/, "").trim();
      const qty = toNum(m2[2]) || 0;
      const unit = (m2[3] || "ea").toLowerCase();

      if (desc && desc.length > 3 && qty > 0) {
        items.push({ sku: "", description: desc, quantity: qty, unit, price: 0, notes: "" });
      }
    }

    if (items.length >= 200) break;
  }

  return items;
}

// ============================================================================
// FORMAT 4: Generic table parser (fallback)
// Tries to find any tabular data with quantities
// ============================================================================
function parseGenericTable(lines) {
  const items = [];
  
  // Skip header-like lines
  const skipWords = /^(ordered|shipped|description|item|product|qty|quantity|unit|price|amount|total|page|date|order|customer|ship|sold|bill|invoice|pack|delivery)/i;
  const stopRe = /(signature|received by|total order|terms|conditions|subject to)/i;

  for (const line of lines) {
    if (stopRe.test(line)) break;
    if (skipWords.test(line.trim())) continue;
    if (line.trim().length < 5) continue;

    // Look for lines with: number(s) followed by text
    // Pattern: qty [qty] [qty] unit description OR description qty unit
    
    // Try: numbers at start, unit, then description
    let m = line.match(/^\s*(\d+)\s+(?:\d+\s+)*([a-zA-Z]{1,5})\s+([A-Za-z].{5,})$/);
    if (m) {
      const qty = toNum(m[1]) || 0;
      const unit = (m[2] || "").toLowerCase();
      const desc = (m[3] || "").trim();
      
      if (desc && qty > 0 && !skipWords.test(desc)) {
        items.push({ sku: "", description: desc, quantity: qty, unit, price: 0, notes: "" });
        continue;
      }
    }

    // Try: description followed by qty and unit
    m = line.match(/^([A-Za-z].{5,}?)\s+(\d+)\s*(EA|PC|FT|LF|LB|KG|GAL|BOX|BAG|PKG|RLL|EACH|PCS)?\s*$/i);
    if (m) {
      const desc = (m[1] || "").trim();
      const qty = toNum(m[2]) || 0;
      const unit = (m[3] || "ea").toLowerCase().replace(/each/i, "ea");
      
      if (desc && qty > 0 && !skipWords.test(desc)) {
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
  if (/stephens pipe|sps\s*fence|spsfence\.com/i.test(text)) {
    return "sps";
  }
  
  // Docks & Docks Lumber
  if (/docks.*lumber|delivery ticket/i.test(text) && /qty\s*delivered/i.test(text)) {
    return "docks";
  }
  
  // Oldcastle APG
  if (/oldcastle|apg.*company|shipping ticket/i.test(text)) {
    return "oldcastle";
  }
  
  // Try to detect by column headers
  if (/ordered.*shipped.*backorder.*unit/i.test(text)) {
    return "sps";
  }
  
  if (/item.*description.*qty\s*delivered/i.test(text)) {
    return "docks";
  }
  
  if (/item\s*#.*description.*total\s*order/i.test(text)) {
    return "oldcastle";
  }
  
  return "generic";
}

/**
 * Main entry point: parse extracted text into line items.
 * Auto-detects supplier format and applies appropriate parser.
 */
function parsePackSlip(text) {
  if (!text || !text.trim()) return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const format = detectFormat(text);
  // eslint-disable-next-line no-console
  console.log(`Pack slip format detected: ${format}`);

  let items = [];

  switch (format) {
    case "sps":
      items = parseSpsFormat(lines);
      break;
    case "docks":
      items = parseDocksFormat(lines);
      break;
    case "oldcastle":
      items = parseOldcastleFormat(lines);
      break;
    default:
      items = parseGenericTable(lines);
  }

  // If primary parser found nothing, try others as fallback
  if (items.length === 0) {
    items = parseSpsFormat(lines);
  }
  if (items.length === 0) {
    items = parseDocksFormat(lines);
  }
  if (items.length === 0) {
    items = parseOldcastleFormat(lines);
  }
  if (items.length === 0) {
    items = parseGenericTable(lines);
  }

  return items;
}

module.exports = { parsePackSlip, detectFormat };
