/**
 * Vendor Registry
 * Contains all known vendors with their parsing profiles.
 * Vendors are derived from the S:\Packing Slips folder structure.
 */

const vendors = {
  // ============================================================================
  // HIGH-VOLUME VENDORS - Custom parsers
  // ============================================================================
  "stephens-pipe-steel": {
    id: "stephens-pipe-steel",
    name: "Stephens Pipe & Steel",
    aliases: ["SPS", "SPSfence.com", "PIPE&STEEL"],
    keywords: ["stephens pipe", "spsfence.com", "russell springs", "pipe&steel"],
    parser: "sps",
    priority: 1,
    hasProfile: true,
  },
  "master-halco": {
    id: "master-halco",
    name: "Master Halco",
    aliases: ["MH", "MasterHalco"],
    keywords: ["master halco", "masterhalco"],
    parser: "masterhalco",
    priority: 2,
    hasProfile: true,
  },
  "old-castle": {
    id: "old-castle",
    name: "Old Castle",
    aliases: ["Oldcastle", "Oldcastle APG", "APG"],
    keywords: ["oldcastle", "apg company", "apg building"],
    parser: "oldcastle",
    priority: 3,
    hasProfile: true,
  },
  "merchant-metals": {
    id: "merchant-metals",
    name: "Merchant Metals",
    aliases: ["MM"],
    keywords: ["merchant metals"],
    parser: "generic",
    priority: 4,
    hasProfile: false,
  },
  "grainger": {
    id: "grainger",
    name: "Grainger",
    aliases: ["W.W. Grainger"],
    keywords: ["grainger", "w.w. grainger"],
    parser: "generic",
    priority: 5,
    hasProfile: false,
  },

  // ============================================================================
  // STANDARD VENDORS - Generic parser with detection keywords
  // ============================================================================
  "iron-world": {
    id: "iron-world",
    name: "Iron World",
    keywords: ["iron world"],
    parser: "generic",
    hasProfile: false,
  },
  "afs": {
    id: "afs",
    name: "AFS",
    keywords: ["afs"],
    parser: "generic",
    hasProfile: false,
  },
  "seclock": {
    id: "seclock",
    name: "Seclock",
    keywords: ["seclock"],
    parser: "generic",
    hasProfile: false,
  },
  "pro-access": {
    id: "pro-access",
    name: "Pro Access",
    keywords: ["pro access"],
    parser: "generic",
    hasProfile: false,
  },
  "ameristar": {
    id: "ameristar",
    name: "Ameristar",
    keywords: ["ameristar"],
    parser: "generic",
    hasProfile: false,
  },
  "amico": {
    id: "amico",
    name: "Amico",
    keywords: ["amico"],
    parser: "generic",
    hasProfile: false,
  },
  "fastenal": {
    id: "fastenal",
    name: "Fastenal",
    keywords: ["fastenal"],
    parser: "generic",
    hasProfile: false,
  },
  "ideal": {
    id: "ideal",
    name: "iDeal",
    keywords: ["ideal"],
    parser: "generic",
    hasProfile: false,
  },
  "controlled-products": {
    id: "controlled-products",
    name: "Controlled Products Systems",
    keywords: ["controlled products"],
    parser: "generic",
    hasProfile: false,
  },
  "trio": {
    id: "trio",
    name: "Trio",
    keywords: ["trio"],
    parser: "generic",
    hasProfile: false,
  },
  "ruffin-payne": {
    id: "ruffin-payne",
    name: "Ruffin & Payne",
    keywords: ["ruffin", "payne"],
    parser: "generic",
    hasProfile: false,
  },
  "wirecrafters": {
    id: "wirecrafters",
    name: "Wirecrafters",
    keywords: ["wirecrafters"],
    parser: "generic",
    hasProfile: false,
  },
  "srf": {
    id: "srf",
    name: "SRF",
    keywords: ["srf"],
    parser: "generic",
    hasProfile: false,
  },
  "lowes": {
    id: "lowes",
    name: "Lowes",
    keywords: ["lowes", "lowe's"],
    parser: "generic",
    hasProfile: false,
  },
  "midwest-cover": {
    id: "midwest-cover",
    name: "Midwest Cover",
    keywords: ["midwest cover"],
    parser: "generic",
    hasProfile: false,
  },
  "oxford-plastic": {
    id: "oxford-plastic",
    name: "Oxford Plastic Systems",
    keywords: ["oxford plastic"],
    parser: "generic",
    hasProfile: false,
  },
  "nationwide-industries": {
    id: "nationwide-industries",
    name: "Nationwide Industries",
    keywords: ["nationwide industries"],
    parser: "generic",
    hasProfile: false,
  },
  "chainlink-fittings": {
    id: "chainlink-fittings",
    name: "Chainlink Fittings",
    keywords: ["chainlink fittings"],
    parser: "generic",
    hasProfile: false,
  },
  "innoplast": {
    id: "innoplast",
    name: "Innoplast",
    keywords: ["innoplast"],
    parser: "generic",
    hasProfile: false,
  },
  "chesterfield-trade": {
    id: "chesterfield-trade",
    name: "Chesterfield Trade",
    keywords: ["chesterfield"],
    parser: "generic",
    hasProfile: false,
  },
  "dac-industries": {
    id: "dac-industries",
    name: "DAC Industries",
    keywords: ["dac industries"],
    parser: "generic",
    hasProfile: false,
  },
  "capital-railing": {
    id: "capital-railing",
    name: "Capital Railing",
    keywords: ["capital railing"],
    parser: "generic",
    hasProfile: false,
  },
  "tymetal": {
    id: "tymetal",
    name: "TYmetal",
    keywords: ["tymetal"],
    parser: "generic",
    hasProfile: false,
  },
  "fasteners-plus": {
    id: "fasteners-plus",
    name: "Fasteners Plus",
    keywords: ["fasteners plus"],
    parser: "generic",
    hasProfile: false,
  },
  "assa-abloy": {
    id: "assa-abloy",
    name: "ASSA ABLOY",
    keywords: ["assa abloy"],
    parser: "generic",
    hasProfile: false,
  },
  "culpeper": {
    id: "culpeper",
    name: "Culpeper",
    keywords: ["culpeper"],
    parser: "generic",
    hasProfile: false,
  },
  "arc3": {
    id: "arc3",
    name: "ARC3",
    keywords: ["arc3"],
    parser: "generic",
    hasProfile: false,
  },
  "jaypro": {
    id: "jaypro",
    name: "Jaypro",
    keywords: ["jaypro"],
    parser: "generic",
    hasProfile: false,
  },
  "wallace-perimeter": {
    id: "wallace-perimeter",
    name: "Wallace Perimeter",
    keywords: ["wallace perimeter"],
    parser: "generic",
    hasProfile: false,
  },
  "hoover-fence": {
    id: "hoover-fence",
    name: "Hoover Fence",
    keywords: ["hoover fence"],
    parser: "generic",
    hasProfile: false,
  },
  "df-supply": {
    id: "df-supply",
    name: "DF Supply",
    keywords: ["df supply"],
    parser: "generic",
    hasProfile: false,
  },
  "barrette": {
    id: "barrette",
    name: "Barrette",
    keywords: ["barrette"],
    parser: "generic",
    hasProfile: false,
  },
  "korman-signs": {
    id: "korman-signs",
    name: "Korman Signs",
    keywords: ["korman signs"],
    parser: "generic",
    hasProfile: false,
  },
  "fencetrac": {
    id: "fencetrac",
    name: "FenceTrac",
    keywords: ["fencetrac"],
    parser: "generic",
    hasProfile: false,
  },
  "auto-gate": {
    id: "auto-gate",
    name: "Auto Gate",
    keywords: ["auto gate"],
    parser: "generic",
    hasProfile: false,
  },
  "white-cap": {
    id: "white-cap",
    name: "White Cap",
    keywords: ["white cap"],
    parser: "generic",
    hasProfile: false,
  },
  "tlo": {
    id: "tlo",
    name: "TLO",
    keywords: ["tlo"],
    parser: "generic",
    hasProfile: false,
  },
  "amazon": {
    id: "amazon",
    name: "Amazon",
    keywords: ["amazon"],
    parser: "generic",
    hasProfile: false,
  },
  "home-depot": {
    id: "home-depot",
    name: "Home Depot",
    keywords: ["home depot"],
    parser: "generic",
    hasProfile: false,
  },
  "graybar": {
    id: "graybar",
    name: "Graybar",
    keywords: ["graybar"],
    parser: "generic",
    hasProfile: false,
  },
  "hoover": {
    id: "hoover",
    name: "Hoover",
    keywords: ["hoover"],
    parser: "generic",
    hasProfile: false,
  },
  "custom-aerosol": {
    id: "custom-aerosol",
    name: "Custom Aerosol Products",
    keywords: ["custom aerosol"],
    parser: "generic",
    hasProfile: false,
  },
  "right-rope": {
    id: "right-rope",
    name: "Right Rope",
    keywords: ["right rope"],
    parser: "generic",
    hasProfile: false,
  },
  "shoreline-vinyl": {
    id: "shoreline-vinyl",
    name: "Shoreline Vinyl",
    keywords: ["shoreline vinyl"],
    parser: "generic",
    hasProfile: false,
  },
  "hilti": {
    id: "hilti",
    name: "Hilti",
    keywords: ["hilti"],
    parser: "generic",
    hasProfile: false,
  },
  "tractor-supply": {
    id: "tractor-supply",
    name: "Tractor Supply",
    keywords: ["tractor supply"],
    parser: "generic",
    hasProfile: false,
  },
  "betafence": {
    id: "betafence",
    name: "BetaFence",
    keywords: ["betafence"],
    parser: "generic",
    hasProfile: false,
  },
  "odi": {
    id: "odi",
    name: "ODI",
    keywords: ["odi"],
    parser: "generic",
    hasProfile: false,
  },
  "uline": {
    id: "uline",
    name: "Uline",
    keywords: ["uline"],
    parser: "generic",
    hasProfile: false,
  },
  "toolco": {
    id: "toolco",
    name: "Toolco",
    keywords: ["toolco"],
    parser: "generic",
    hasProfile: false,
  },
  "fortress-building": {
    id: "fortress-building",
    name: "Fortress Building Products",
    keywords: ["fortress building"],
    parser: "generic",
    hasProfile: false,
  },
  "lc": {
    id: "lc",
    name: "L&C",
    keywords: ["l&c"],
    parser: "generic",
    hasProfile: false,
  },
  "smartsign": {
    id: "smartsign",
    name: "SmartSign",
    keywords: ["smartsign"],
    parser: "generic",
    hasProfile: false,
  },
  "fastsigns": {
    id: "fastsigns",
    name: "FastSigns",
    keywords: ["fastsigns"],
    parser: "generic",
    hasProfile: false,
  },
  "elite": {
    id: "elite",
    name: "Elite",
    keywords: ["elite"],
    parser: "generic",
    hasProfile: false,
  },
  "bb-roadway": {
    id: "bb-roadway",
    name: "B & B Roadway Security",
    keywords: ["b & b roadway", "roadway security"],
    parser: "generic",
    hasProfile: false,
  },
  "automation-direct": {
    id: "automation-direct",
    name: "Automation Direct",
    keywords: ["automation direct"],
    parser: "generic",
    hasProfile: false,
  },
  "containment-systems": {
    id: "containment-systems",
    name: "Containment Systems",
    keywords: ["containment systems"],
    parser: "generic",
    hasProfile: false,
  },
  "capital-electric": {
    id: "capital-electric",
    name: "Capital Electric",
    keywords: ["capital electric"],
    parser: "generic",
    hasProfile: false,
  },
  "all-american": {
    id: "all-american",
    name: "All American",
    keywords: ["all american"],
    parser: "generic",
    hasProfile: false,
  },
  "northern-tool": {
    id: "northern-tool",
    name: "Northern Tool",
    keywords: ["northern tool"],
    parser: "generic",
    hasProfile: false,
  },
  "argus": {
    id: "argus",
    name: "Argus",
    keywords: ["argus"],
    parser: "generic",
    hasProfile: false,
  },
  "bmg-metals": {
    id: "bmg-metals",
    name: "BMG Metals",
    keywords: ["bmg metals"],
    parser: "generic",
    hasProfile: false,
  },
  "metaltech-omega": {
    id: "metaltech-omega",
    name: "MetalTech Omega",
    keywords: ["metaltech omega"],
    parser: "generic",
    hasProfile: false,
  },
  "knox": {
    id: "knox",
    name: "Knox",
    keywords: ["knox"],
    parser: "generic",
    hasProfile: false,
  },
  "srm-concrete": {
    id: "srm-concrete",
    name: "SRM Concrete",
    keywords: ["srm concrete"],
    parser: "generic",
    hasProfile: false,
  },
  "smyrna-ready-mix": {
    id: "smyrna-ready-mix",
    name: "Smyrna Ready Mix Concrete",
    keywords: ["smyrna ready mix"],
    parser: "generic",
    hasProfile: false,
  },
  "zndus": {
    id: "zndus",
    name: "ZNDUS",
    keywords: ["zndus"],
    parser: "generic",
    hasProfile: false,
  },
  "mid-tex-testing": {
    id: "mid-tex-testing",
    name: "Mid Tex Testing",
    keywords: ["mid tex testing"],
    parser: "generic",
    hasProfile: false,
  },
  "windy-city-wire": {
    id: "windy-city-wire",
    name: "Windy City Wire",
    keywords: ["windy city wire"],
    parser: "generic",
    hasProfile: false,
  },
  "southwest": {
    id: "southwest",
    name: "Southwest",
    keywords: ["southwest"],
    parser: "generic",
    hasProfile: false,
  },
  "amtech-fence": {
    id: "amtech-fence",
    name: "Amtech Fence",
    keywords: ["amtech fence"],
    parser: "generic",
    hasProfile: false,
  },
  "eagle-fence": {
    id: "eagle-fence",
    name: "Eagle Fence",
    keywords: ["eagle fence"],
    parser: "generic",
    hasProfile: false,
  },
  "keystone-fence": {
    id: "keystone-fence",
    name: "Keystone Fence Supply",
    keywords: ["keystone fence"],
    parser: "generic",
    hasProfile: false,
  },
  "basteel-perimeter": {
    id: "basteel-perimeter",
    name: "Basteel Perimeter Systems",
    keywords: ["basteel perimeter"],
    parser: "generic",
    hasProfile: false,
  },
  "ideal-mfg": {
    id: "ideal-mfg",
    name: "Ideal MFG",
    keywords: ["ideal mfg"],
    parser: "generic",
    hasProfile: false,
  },
  "si-storey-lumber": {
    id: "si-storey-lumber",
    name: "S.I. Storey Lumber",
    keywords: ["storey lumber", "s.i. storey"],
    parser: "generic",
    hasProfile: false,
  },
  "ideal-shield": {
    id: "ideal-shield",
    name: "Ideal Shield",
    keywords: ["ideal shield"],
    parser: "generic",
    hasProfile: false,
  },
  "gate-depot": {
    id: "gate-depot",
    name: "Gate Depot",
    keywords: ["gate depot"],
    parser: "generic",
    hasProfile: false,
  },
  "aer-flo": {
    id: "aer-flo",
    name: "AER-FLO",
    keywords: ["aer-flo", "aerflo"],
    parser: "generic",
    hasProfile: false,
  },
  "tidewater": {
    id: "tidewater",
    name: "Tidewater",
    keywords: ["tidewater"],
    parser: "generic",
    hasProfile: false,
  },
  "ipe": {
    id: "ipe",
    name: "IPE",
    keywords: ["ipe"],
    parser: "generic",
    hasProfile: false,
  },
  "adi": {
    id: "adi",
    name: "ADI",
    keywords: ["adi"],
    parser: "generic",
    hasProfile: false,
  },
  "cochrane": {
    id: "cochrane",
    name: "Cochrane",
    keywords: ["cochrane"],
    parser: "generic",
    hasProfile: false,
  },
  "vdot-stock": {
    id: "vdot-stock",
    name: "VDOT STOCK",
    keywords: ["vdot stock"],
    parser: "generic",
    hasProfile: false,
  },
  "pexco": {
    id: "pexco",
    name: "Pexco",
    keywords: ["pexco"],
    parser: "generic",
    hasProfile: false,
  },
  "dog-proofer": {
    id: "dog-proofer",
    name: "Dog Proofer",
    keywords: ["dog proofer"],
    parser: "generic",
    hasProfile: false,
  },
  "national-metal": {
    id: "national-metal",
    name: "National Metal Industries",
    keywords: ["national metal"],
    parser: "generic",
    hasProfile: false,
  },
  "triple-s-steel": {
    id: "triple-s-steel",
    name: "Triple S Steel",
    keywords: ["triple s steel"],
    parser: "generic",
    hasProfile: false,
  },
  "southern-vinyl": {
    id: "southern-vinyl",
    name: "Southern Vinyl Manufacturing",
    keywords: ["southern vinyl"],
    parser: "generic",
    hasProfile: false,
  },
  "atkore": {
    id: "atkore",
    name: "Atkore",
    keywords: ["atkore"],
    parser: "generic",
    hasProfile: false,
  },
  "snug-cottage": {
    id: "snug-cottage",
    name: "Snug Cottage",
    keywords: ["snug cottage"],
    parser: "generic",
    hasProfile: false,
  },
  "metal-supermarkets": {
    id: "metal-supermarkets",
    name: "Metal Supermarkets",
    keywords: ["metal supermarkets"],
    parser: "generic",
    hasProfile: false,
  },
  "saylors-creek": {
    id: "saylors-creek",
    name: "Saylors Creek",
    keywords: ["saylors creek"],
    parser: "generic",
    hasProfile: false,
  },
};

/**
 * Get list of all vendors sorted by name
 */
function getVendorList() {
  return Object.values(vendors)
    .sort((a, b) => {
      // Priority vendors first
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      if (a.priority && b.priority) return a.priority - b.priority;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    })
    .map((v) => ({
      id: v.id,
      name: v.name,
      hasProfile: v.hasProfile || false,
    }));
}

/**
 * Get vendor by ID
 */
function getVendorById(id) {
  return vendors[id] || null;
}

/**
 * Auto-detect vendor from extracted text
 * @param {string} text - Extracted text from pack slip
 * @returns {Object|null} - Detected vendor or null
 */
function detectVendor(text) {
  if (!text) return null;
  const lowerText = text.toLowerCase();

  // Check priority vendors first (they have more specific keywords)
  const priorityVendors = Object.values(vendors)
    .filter((v) => v.priority)
    .sort((a, b) => a.priority - b.priority);

  for (const vendor of priorityVendors) {
    if (vendor.keywords.some((kw) => lowerText.includes(kw.toLowerCase()))) {
      return vendor;
    }
  }

  // Check all other vendors
  for (const vendor of Object.values(vendors)) {
    if (vendor.priority) continue; // Already checked
    if (vendor.keywords.some((kw) => lowerText.includes(kw.toLowerCase()))) {
      return vendor;
    }
  }

  return null;
}

module.exports = {
  vendors,
  getVendorList,
  getVendorById,
  detectVendor,
};

