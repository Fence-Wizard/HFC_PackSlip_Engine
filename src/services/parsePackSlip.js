/**
 * Pack slip line item parser.
 * Attempts to extract structured line items from extracted PDF/OCR text.
 */

function toInt(val) {
  if (val == null) return null;
  const cleaned = String(val).replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Parse SPS-style pack slip tables.
 * Looks for header row with Ordered/Shipped/Unit/Description columns.
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
      /ordered/i.test(l) &&
      /shipped/i.test(l) &&
      /unit/i.test(l) &&
      /(description|product item description)/i.test(l),
  );
  if (headerIdx === -1) return [];

  // Stop parsing at footer markers
  const stopRe = /(materials received by|signature acknowledges|review all items|customer must field verify)/i;

  // Row pattern: Ordered Shipped BackOrdered Unit Description
  // Examples:
  //   10 10 0 ft 1/2" EMT Conduit
  //   100 100 0 ea 3/4" EMT Connector
  const rowRe =
    /^\s*(-?[\d,]+)\s+(-?[\d,]+)\s+(-?[\d,\/\s]*?)\s+([A-Za-z]{1,5})\s+(.+)$/;

  const items = [];
  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (stopRe.test(line)) break;
    if (/^\*+/.test(line)) continue; // notes/asterisks

    const m = line.match(rowRe);
    if (m) {
      const ordered = toInt(m[1]);
      const shipped = toInt(m[2]);
      let qty = shipped && shipped !== 0 ? shipped : ordered || 0;
      if (qty < 0) qty = Math.abs(qty);
      const unit = (m[4] || "").trim().toLowerCase();
      const description = (m[5] || "").trim();

      if (description) {
        items.push({
          sku: "",
          description,
          quantity: qty,
          unit,
          notes: "",
        });
      }
      continue;
    }

    // Continuation lines: append to previous item if it looks like wrapped text
    if (items.length > 0 && !/^\d/.test(line) && line.length > 3) {
      const last = items[items.length - 1];
      const cleaned = line.replace(/^\*+/, "").trim();
      if (cleaned) {
        last.description = `${last.description} ${cleaned}`.trim();
      }
    }

    if (items.length >= 250) break;
  }

  return items;
}

/**
 * Fallback parser for simpler formats: "qty x description" or "qty description"
 */
function parseLooseLines(text) {
  if (!text || !text.trim()) return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];

  // Pattern: quantity followed by unit (optional) and description
  // Examples: "10 ft EMT Conduit", "5 ea Junction Box", "20x Wire Nuts"
  const qtyUnitDesc = /^(\d+)\s*(?:x\s*)?([a-zA-Z]{1,5})?\s+(.+)$/i;

  for (const line of lines) {
    const match = line.match(qtyUnitDesc);
    if (match) {
      const qty = Number(match[1]) || 1;
      const unit = (match[2] || "").toLowerCase();
      const desc = (match[3] || "").trim();
      if (desc && desc.length > 2) {
        items.push({
          sku: "",
          description: desc,
          quantity: qty,
          unit,
          notes: "",
        });
      }
      continue;
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
  if (tableItems.length) return tableItems;
  return parseLooseLines(text);
}

module.exports = { parsePackSlip };
