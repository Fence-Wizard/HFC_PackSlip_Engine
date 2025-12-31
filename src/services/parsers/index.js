/**
 * Vendor-specific parser registry
 * Each parser exports a parse(lines, profile) function
 */

const logger = require("../../config/logger");

// Import individual parsers
const spsParser = require("./sps");
const genericParser = require("./generic");

const parsers = {
  sps: spsParser,
  masterhalco: spsParser, // Uses same format as SPS
  oldcastle: genericParser, // TODO: Create specific parser
  generic: genericParser,
};

/**
 * Get parser by name
 * @param {string} parserName - Name of the parser
 * @returns {Object} Parser module with parse function
 */
function getParser(parserName) {
  const parser = parsers[parserName];
  if (!parser) {
    logger.warn(`Parser not found: ${parserName}, using generic`);
    return parsers.generic;
  }
  return parser;
}

/**
 * Parse text with appropriate parser
 * @param {string[]} lines - Array of text lines
 * @param {Object|null} vendorProfile - Vendor profile
 * @returns {Array} Parsed line items
 */
function parseWithProfile(lines, vendorProfile = null) {
  const parserName = vendorProfile?.parser || "generic";
  const parser = getParser(parserName);
  
  logger.info(`Using parser: ${parserName} for vendor: ${vendorProfile?.name || "unknown"}`);
  
  return parser.parse(lines, vendorProfile);
}

module.exports = {
  parsers,
  getParser,
  parseWithProfile,
};

