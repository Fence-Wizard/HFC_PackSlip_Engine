function parseLineItems(text) {
  if (!text || !text.trim()) return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  const qtyDesc = /^(\d+)[\sx-]+(.+)$/i;

  for (const line of lines) {
    const match = line.match(qtyDesc);
    if (match) {
      items.push({
        description: match[2].trim(),
        quantity: Number(match[1]),
        unit: "",
        notes: "",
      });
      continue;
    }
    if (line.length > 4) {
      items.push({
        description: line,
        quantity: 1,
        unit: "",
        notes: "",
      });
    }
    if (items.length >= 20) break; // safety guard to avoid overfilling
  }

  return items;
}

function parsePackSlip(text) {
  return parseLineItems(text);
}

module.exports = { parsePackSlip };

