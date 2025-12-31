const express = require("express");
const db = require("../storage/db");
const { STATUSES, now } = require("../models/PackSlip");
const { sendToN8n } = require("../services/webhook");
const { extractText } = require("../services/extractText");
const { parsePackSlip } = require("../services/parsePackSlip");
const { readFileBuffer } = require("../storage/files");
const { getVendorById, detectVendor } = require("../config/vendors");
const logger = require("../config/logger");

const router = express.Router();

function toApiModel(pack) {
  if (!pack) return null;
  
  // Get vendor info if available
  const vendorProfile = pack.vendorId ? getVendorById(pack.vendorId) : null;
  
  return {
    id: pack.id,
    fileName: pack.file?.originalName || pack.file?.fileName || "pack-slip",
    uploadedAt: pack.createdAt,
    extractedText: pack.extractedText || "",
    fields: {
      vendor: pack.metadata?.vendor || pack.vendorName || vendorProfile?.name || "",
      po: pack.metadata?.poOrJob || "",
      receivedDate: pack.metadata?.receivedDate || "",
    },
    // Vendor profile info for the UI
    vendorInfo: {
      id: pack.vendorId || null,
      name: pack.vendorName || vendorProfile?.name || null,
      source: pack.vendorSource || "none", // "user", "auto", "none"
      confidence: pack.vendorConfidence || 0,
      hasProfile: vendorProfile?.hasProfile || false,
      manualIntervention: pack.manualIntervention || false,
    },
    lineItems: Array.isArray(pack.lineItems)
      ? pack.lineItems.map((li) => ({
          sku: li?.sku || "",
          description: li?.description || "",
          qty: li?.quantity ?? li?.qty ?? "",
          uom: li?.unit || li?.uom || "",
        }))
      : [],
  };
}

router.get("/packs/:id", (req, res) => {
  const pack = db.getPackSlip(req.params.id);
  if (!pack) return res.status(404).json({ error: "Not found" });
  return res.json(toApiModel(pack));
});

router.post("/packs/:id/submit", async (req, res) => {
  const reqId = req.id;
  const pack = db.getPackSlip(req.params.id);
  if (!pack) return res.status(404).json({ error: "Not found" });

  const body = req.body || {};
  const fields = body.fields || {};
  const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];

  const updated = db.updatePackSlip(pack.id, {
    metadata: {
      vendor: fields.vendor || "",
      poOrJob: fields.po || "",
      receivedDate: fields.receivedDate || "",
    },
    lineItems: lineItems.map((li) => ({
      description: li?.description || li?.sku || "",
      quantity: Number(li?.qty) || 0,
      unit: li?.uom || "",
      sku: li?.sku || "",
      notes: "",
    })),
    status: STATUSES.SUBMITTED,
    submittedAt: now(),
    errors: [],
  });

  const payload = {
    id: updated.id,
    metadata: updated.metadata,
    lineItems: updated.lineItems,
    extractedText: updated.extractedText,
    file: updated.file,
    extractMeta: updated.extractMeta,
  };

  try {
    await sendToN8n(payload, reqId);
    return res.json({ ok: true, n8nStatus: "sent", slackStatus: "via n8n" });
  } catch (err) {
    logger.warn("Webhook dispatch failed on /packs submit", { reqId, message: err?.message });
    return res.json({ ok: true, n8nStatus: "failed", slackStatus: "via n8n" });
  }
});

router.post("/packs/:id/reparse", async (req, res) => {
  const reqId = req.id;
  const pack = db.getPackSlip(req.params.id);
  if (!pack) return res.status(404).json({ error: "Not found" });
  if (!pack.file?.storedPath) {
    return res.status(400).json({ error: "Original file is unavailable for re-parse" });
  }

  // Check if a vendorId was passed in the request body (for re-selecting vendor)
  const newVendorId = req.body?.vendorId;

  try {
    const buffer = readFileBuffer(pack.file);
    const extraction = await extractText(
      { buffer, mimeType: pack.file.mimeType, fileName: pack.file.originalName },
      reqId,
    );
    
    // Determine vendor: use new selection, existing, or auto-detect
    let finalVendorId = newVendorId || pack.vendorId;
    let vendorSource = pack.vendorSource || "none";
    let vendorConfidence = pack.vendorConfidence || 0;
    
    if (newVendorId) {
      vendorSource = "user";
      vendorConfidence = 1.0;
    } else if (!finalVendorId) {
      // Try auto-detection on reparse
      const detected = detectVendor(extraction.text);
      if (detected) {
        finalVendorId = detected.id;
        vendorSource = "auto";
        vendorConfidence = 0.8;
        logger.info("Auto-detected vendor on reparse", { reqId, vendorId: detected.id });
      }
    }
    
    // Get vendor profile for parsing
    const vendorProfile = finalVendorId && finalVendorId !== "_manual" 
      ? getVendorById(finalVendorId) 
      : null;
    
    const lineItems = parsePackSlip(extraction.text, vendorProfile);
    const updated = db.updatePackSlip(pack.id, {
      extractedText: extraction.text,
      extractMeta: {
        method: extraction.method,
        pages: extraction.pages,
      },
      vendorId: finalVendorId,
      vendorSource,
      vendorConfidence,
      vendorName: vendorProfile?.name || null,
      lineItems,
      updatedAt: now(),
      status: STATUSES.REVIEW,
      errors: [],
    });
    return res.json(toApiModel(updated));
  } catch (err) {
    logger.error("Reparse failed", { reqId, message: err?.message, stack: err?.stack });
    const updated = db.updatePackSlip(pack.id, {
      extractedText: "(reparse failed)",
      extractMeta: { method: "failed", pages: 0 },
      errors: [err?.message || "Reparse failed"],
      updatedAt: now(),
      status: STATUSES.REVIEW,
    });
    return res.json(toApiModel(updated));
  }
});

module.exports = router;

