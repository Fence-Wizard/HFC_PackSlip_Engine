/**
 * Vendors API routes
 */

const express = require("express");
const { getVendorList, getVendorById } = require("../config/vendors");

const router = express.Router();

/**
 * GET /api/vendors
 * Returns list of all vendors for dropdown
 */
router.get("/", (req, res) => {
  const vendors = getVendorList();
  res.json({ vendors });
});

/**
 * GET /api/vendors/:id
 * Returns vendor details by ID
 */
router.get("/:id", (req, res) => {
  const vendor = getVendorById(req.params.id);
  if (!vendor) {
    return res.status(404).json({ error: "Vendor not found" });
  }
  res.json({ vendor });
});

/**
 * POST /api/vendors/:id/flag
 * Flag a vendor for profile creation/update
 */
router.post("/:id/flag", (req, res) => {
  const vendorId = req.params.id;
  const { packSlipId, reason } = req.body;
  
  // TODO: Store flag request in database
  // For now, just log it
  console.log(`[VENDOR FLAG] Vendor: ${vendorId}, PackSlip: ${packSlipId}, Reason: ${reason}`);
  
  res.json({ 
    success: true, 
    message: "Profile creation request submitted",
    vendorId,
    packSlipId,
  });
});

module.exports = router;

