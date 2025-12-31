/**
 * Product Library for Hurricane Fence Company
 * 
 * This library helps the parser recognize fence products and normalize descriptions.
 * Built from internal inventory system data.
 */

// Common abbreviations used in fence industry
const abbreviations = {
  // Colors
  BLK: "Black",
  GRN: "Green", 
  WHT: "White",
  GALV: "Galvanized",
  VNL: "Vinyl",
  
  // Materials
  SS: "Stainless Steel",
  AL: "Aluminum",
  STL: "Steel",
  
  // Product types
  CL: "Chain Link",
  DOM: "Dome",
  RES: "Residential",
  COM: "Commercial",
  HVY: "Heavy Duty",
  LT: "Light",
  EXT: "Extension",
  BRKT: "Bracket",
  CLMP: "Clamp",
  
  // Wire types
  KK: "Knuckle/Knuckle",
  KT: "Knuckle/Twist",
  TK: "Twist/Knuckle",
  BB: "Barb/Barb",
  
  // Measurements
  GA: "Gauge",
  HT: "Height",
  LF: "Linear Feet",
  SP: "Schedule Pipe",
};

// Keywords that identify fence products (for pattern matching)
const productKeywords = [
  // Fabric/Mesh
  "fabric", "mesh", "chain link", "cl fabric",
  
  // Posts
  "post", "line post", "corner post", "end post", "terminal", "gate post",
  
  // Rails
  "rail", "top rail", "bottom rail", "brace rail",
  
  // Caps
  "cap", "dome cap", "loop cap", "eye top", "ball cap",
  
  // Fittings
  "band", "brace band", "tension band", "rail end",
  "bracket", "rail bracket", "barb arm", "extension",
  "tension bar", "tension wire", "tie wire",
  "sleeve", "top sleeve", "bottom sleeve",
  "clamp", "t-clamp", "line clamp",
  "bolt", "carriage bolt", "nut",
  "clip", "hog ring", "fence tie",
  
  // Gates
  "gate", "gate frame", "gate hardware", "hinge", "latch",
  "drop rod", "fork latch", "bulldog",
  
  // Barbed wire
  "barb", "barbed", "barb wire", "barb arm",
  
  // Slats
  "slat", "privacy slat", "winged slat",
  
  // Colors/Coatings
  "vnl", "vinyl", "blk", "black", "grn", "green", "wht", "white", "galv", "galvanized",
  
  // Schedule Pipe
  "sp20", "sp40", "sch20", "sch40",
  
  // Sizes/Dimensions
  "1-3/8", "1-5/8", "1-7/8", "2-1/2", "2-3/8", "3-1/2", "4\"", "6\"", "8\"",
  "2x9", "2x8", "2x11", "2x12",
  "9ga", "11ga", "12ga", "12.5ga", "6ga",
];

// Common product patterns with typical units
const productPatterns = [
  // Chain Link Fabric - typically sold by ft (per roll)
  { pattern: /\d+x\d+.*(?:core|ga).*(?:ft\/|rll|roll)/i, defaultUnit: "ft", category: "fabric" },
  { pattern: /fabric.*\d+ft/i, defaultUnit: "ft", category: "fabric" },
  { pattern: /cl\s+\d+.*\d+ga/i, defaultUnit: "ft", category: "fabric" },
  
  // Posts - typically sold by pc/ea
  { pattern: /post.*(?:sp\d+|sch\d+)/i, defaultUnit: "pc", category: "post" },
  { pattern: /(?:line|corner|end|terminal|gate)\s*post/i, defaultUnit: "pc", category: "post" },
  
  // Rails - typically sold by ft or pc
  { pattern: /(?:top|bottom|brace)\s*rail/i, defaultUnit: "ft", category: "rail" },
  { pattern: /rail.*(?:sp\d+|sch\d+)/i, defaultUnit: "ft", category: "rail" },
  
  // Caps - typically sold by pc/ea
  { pattern: /(?:dome|loop|eye|ball)\s*(?:cap|top)/i, defaultUnit: "pc", category: "cap" },
  
  // Fittings - typically sold by ea/pc
  { pattern: /(?:brace|tension)\s*band/i, defaultUnit: "ea", category: "fitting" },
  { pattern: /rail\s*end/i, defaultUnit: "ea", category: "fitting" },
  { pattern: /tension\s*bar/i, defaultUnit: "ea", category: "fitting" },
  { pattern: /barb\s*arm/i, defaultUnit: "ea", category: "fitting" },
  { pattern: /t-?clamp/i, defaultUnit: "ea", category: "fitting" },
  { pattern: /bracket/i, defaultUnit: "ea", category: "fitting" },
  { pattern: /sleeve/i, defaultUnit: "ea", category: "fitting" },
  
  // Hardware - typically sold by ea/pc
  { pattern: /carriage\s*bolt/i, defaultUnit: "ea", category: "hardware" },
  { pattern: /(?:bolt|nut|clip|ring)/i, defaultUnit: "ea", category: "hardware" },
  
  // Gates - typically sold by ea
  { pattern: /gate.*(?:frame|single|double)/i, defaultUnit: "ea", category: "gate" },
  { pattern: /(?:hinge|latch|drop\s*rod)/i, defaultUnit: "ea", category: "gate" },
  
  // Barb wire - typically sold by ft or rll
  { pattern: /barb(?:ed)?\s*wire/i, defaultUnit: "ft", category: "barb" },
  
  // Slats - typically sold by pc or bag
  { pattern: /(?:privacy\s*)?slat/i, defaultUnit: "pc", category: "slat" },
  { pattern: /slat.*(?:bag|box)/i, defaultUnit: "bag", category: "slat" },
  
  // Tension/Tie Wire - typically sold by ft or rll
  { pattern: /(?:tension|tie)\s*wire/i, defaultUnit: "ft", category: "wire" },
];

// Size patterns commonly seen in SPS pack slips
const sizePatterns = [
  // Pipe sizes: 1-3/8", 1-5/8", 2-1/2", etc.
  /\d+-\d+\/\d+[""]?/,
  // Dimensions: 2x9, 2x8, 4x8, etc. (mesh gauge x height)
  /\d+x\d+/,
  // Heights: 4', 6', 8', 10'6", etc.
  /\d+'(?:\d+")?/,
  // Gauge: 9GA, 11GA, 12.5GA
  /\d+(?:\.\d+)?ga/i,
  // Schedule: SP20, SP40
  /sp\d+/i,
  // Core count: 11core, 13core
  /\d+core/i,
];

/**
 * Check if a line contains fence product keywords
 * @param {string} line - Text line to check
 * @returns {boolean}
 */
function containsFenceProduct(line) {
  if (!line) return false;
  const lower = line.toLowerCase();
  
  // Check for any product keyword (substring match, no word boundaries needed)
  return productKeywords.some(kw => lower.includes(kw.toLowerCase()));
}

/**
 * Infer the unit for a product based on description
 * @param {string} description - Product description
 * @returns {string|null} - Inferred unit or null
 */
function inferUnit(description) {
  if (!description) return null;
  
  for (const { pattern, defaultUnit } of productPatterns) {
    if (pattern.test(description)) {
      return defaultUnit;
    }
  }
  
  return null;
}

/**
 * Get product category from description
 * @param {string} description - Product description
 * @returns {string|null}
 */
function getProductCategory(description) {
  if (!description) return null;
  
  for (const { pattern, category } of productPatterns) {
    if (pattern.test(description)) {
      return category;
    }
  }
  
  return null;
}

/**
 * Expand abbreviations in description
 * @param {string} description - Product description
 * @returns {string}
 */
function expandAbbreviations(description) {
  if (!description) return "";
  
  let result = description;
  for (const [abbr, full] of Object.entries(abbreviations)) {
    // Only replace if it's a word boundary match
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    result = result.replace(regex, full);
  }
  
  return result;
}

module.exports = {
  abbreviations,
  productKeywords,
  productPatterns,
  sizePatterns,
  containsFenceProduct,
  inferUnit,
  getProductCategory,
  expandAbbreviations,
};

