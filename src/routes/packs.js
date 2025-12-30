const express = require("express");
const db = require("../storage/db");
const { STATUSES, now } = require("../models/PackSlip");
const { sendToN8n } = require("../services/webhook");
const logger = require("../config/logger");

const router = express.Router();

function toApiModel(pack) {
  if (!pack) return null;
  return {
    id: pack.id,
    fileName: pack.file?.originalName || pack.file?.fileName || "pack-slip",
    uploadedAt: pack.createdAt,
    extractedText: pack.extractedText || "",
    fields: {
      vendor: pack.metadata?.vendor || "",
      po: pack.metadata?.poOrJob || "",
      receivedDate: pack.metadata?.receivedDate || "",
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

module.exports = router;

