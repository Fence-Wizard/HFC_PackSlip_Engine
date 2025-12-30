/**
 * Pack slip line item parser.
 * Parses SPS-style pack slips with table columns:
 * Ordered | Shipped | BackOrder | Unit | Product Description | Packing | Price | Amount
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
 * Parse SPS-style pack slip tables.
 * Format: Ordered Shipped BackOrder Unit Description [Packing] Price Amount
 */
function parseSpsTable(text) {
  if (!text || !text.trim()) return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Look for header row containing key column names
  const headerIdx = lines.findIndex(
    (l) =>
      (/ordered/i.test(l) && /shipped/i.test(l)) ||
      (/unit/i.test(l) && /description/i.test(l)),
  );

  // Start parsing after header (or from beginning if no header found)
  const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;

  // Stop parsing at footer markers
  const stopRe = /(materials received by|signature acknowledges|ask me about|call today|total order|acceptance of quote)/i;

  // Skip asterisk note lines
  const skipRe = /^\*+\s*(your signature|items accurately|at the time)/i;

  // SPS row pattern: Ordered Shipped BackOrder Unit [Price] [Amount] Description
  // Examples from extracted text:
  //   16 16 0 ea 5.35 85.60 TENSION BAR 96"x3/4"
  //   420 420 0 ft 1.18 495.60 GALV 1-5/8" x 21' x SPS20 SW x 20pc
  //   300 300 0 ea 0.1096 32.88 BOLT/NUT 5/16x1-1/4in 3 box
  // Pattern: qty qty backorder unit price amount description [packing]
  const spsRowRe = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+([a-zA-Z]{1,5})\s+([\d.]+)\s+([\d.]+)\s+(.+)$/;

  // Alternative: description might come before price
  // qty qty backorder unit description price amount
  const altRowRe = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+([a-zA-Z]{1,5})\s+([A-Za-z].+?)\s+([\d.]+)\s+([\d.]+)$/;

  const items = [];

  for (let i = startIdx; i < lines.length; i += 1) {
    const line = lines[i];

    // Stop at footer
    if (stopRe.test(line)) break;

    // Skip note lines
    if (skipRe.test(line)) continue;
    if (/^\*+$/.test(line)) continue;

    // Try SPS format: qty qty backorder unit price amount description
    let m = line.match(spsRowRe);
    if (m) {
      const ordered = toNum(m[1]) || 0;
      const shipped = toNum(m[2]) || 0;
      const qty = shipped > 0 ? shipped : ordered;
      const unit = (m[4] || "").toLowerCase();
      const price = toNum(m[5]) || 0;
      const description = (m[7] || "").trim();

      if (description && qty > 0) {
        items.push({
          sku: "",
          description,
          quantity: qty,
          unit,
          price,
          notes: "",
        });
      }
      continue;
    }

    // Try alternative format: qty qty backorder unit description price amount
    m = line.match(altRowRe);
    if (m) {
      const ordered = toNum(m[1]) || 0;
      const shipped = toNum(m[2]) || 0;
      const qty = shipped > 0 ? shipped : ordered;
      const unit = (m[4] || "").toLowerCase();
      const description = (m[5] || "").trim();
      const price = toNum(m[6]) || 0;

      if (description && qty > 0) {
        items.push({
          sku: "",
          description,
          quantity: qty,
          unit,
          price,
          notes: "",
        });
      }
      continue;
    }

    // Try simpler pattern: just look for lines starting with numbers
    // Pattern: number number number unit ... (rest is description/prices mixed)
    const simpleRe = /^\s*(\d+)\s+(\d+)\s+\d+\s+([a-zA-Z]{1,5})\s+(.+)$/;
    m = line.match(simpleRe);
    if (m) {
      const ordered = toNum(m[1]) || 0;
      const shipped = toNum(m[2]) || 0;
      const qty = shipped > 0 ? shipped : ordered;
      const unit = (m[3] || "").toLowerCase();

      // Rest might be "price amount description" or "description price amount"
      let rest = (m[4] || "").trim();

      // Try to extract price and description
      // If starts with numbers, it's "price amount description"
      const priceFirst = rest.match(/^([\d.]+)\s+([\d.]+)\s+(.+)$/);
      if (priceFirst) {
        const price = toNum(priceFirst[1]) || 0;
        const description = (priceFirst[3] || "").trim();
        if (description && qty > 0) {
          items.push({
            sku: "",
            description,
            quantity: qty,
            unit,
            price,
            notes: "",
          });
        }
        continue;
      }

      // Otherwise treat the rest as description
      if (rest && qty > 0) {
        // Remove trailing numbers (likely price/amount)
        const descOnly = rest.replace(/\s+[\d.]+\s+[\d.]+\s*$/, "").trim();
        items.push({
          sku: "",
          description: descOnly || rest,
          quantity: qty,
          unit,
          price: 0,
          notes: "",
        });
      }
    }

    if (items.length >= 250) break;
  }

  return items;
}

/**
 * Fallback parser for simpler formats
 */
function parseLooseLines(text) {
  if (!text || !text.trim()) return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];

  // Pattern: quantity unit description OR quantity x description
  const qtyUnitDesc = /^(\d+)\s*(?:x\s*)?([a-zA-Z]{1,5})?\s+(.+)$/i;

  for (const line of lines) {
    // Skip header-like lines
    if (/ordered|shipped|description|product|unit/i.test(line)) continue;
    if (/^\*/.test(line)) continue;

    const match = line.match(qtyUnitDesc);
    if (match) {
      const qty = Number(match[1]) || 1;
      const unit = (match[2] || "").toLowerCase();
      const desc = (match[3] || "").trim();

      // Filter out lines that look like addresses or metadata
      if (desc.length > 3 && !/^\d+\s+(street|ave|road|blvd)/i.test(desc)) {
        items.push({
          sku: "",
          description: desc,
          quantity: qty,
          unit,
          price: 0,
          notes: "",
        });
      }
    }

    if (items.length >= 100) break;
  }

  return items;
}

/**
 * Main entry point: parse extracted text into line items.
 * Tries SPS table format first, then falls back to loose lines.
 */
function parsePackSlip(text) {
  const tableItems = parseSpsTable(text);
  if (tableItems.length >= 3) return tableItems; // Need at least 3 items for confident table parse
  const looseItems = parseLooseLines(text);
  // Return whichever found more items
  return tableItems.length >= looseItems.length ? tableItems : looseItems;
}

module.exports = { parsePackSlip };
