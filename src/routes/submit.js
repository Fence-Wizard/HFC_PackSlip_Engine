const express = require("express");
const { STATUSES, now } = require("../models/PackSlip");
const db = require("../storage/db");
const logger = require("../config/logger");
const { sendToN8n } = require("../services/webhook");

const router = express.Router();

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    description: item?.description || "",
    quantity: Number(item?.quantity) || 0,
    unit: item?.unit || "",
    notes: item?.notes || "",
  }));
}

router.post("/submit/:id", async (req, res, next) => {
  const reqId = req.id;
  const { id } = req.params;
  const record = db.getPackSlip(id);
  if (!record) {
    return res.status(404).json({ error: "Not found" });
  }

  const metadata = req.body?.metadata || {};
  const lineItems = normalizeItems(req.body?.lineItems);

  const updated = db.updatePackSlip(id, {
    metadata,
    lineItems,
    status: STATUSES.SUBMITTED,
    submittedAt: now(),
    errors: [],
  });

  const payload = {
    id: updated.id,
    status: updated.status,
    metadata: updated.metadata,
    lineItems: updated.lineItems,
    extractedText: updated.extractedText,
    file: updated.file,
    extractMeta: updated.extractMeta,
  };

  try {
    await sendToN8n(payload, reqId);
    return res.json({ id: updated.id, status: updated.status });
  } catch (err) {
    logger.error("Webhook dispatch failed", { reqId, message: err?.message });
    db.updatePackSlip(id, { status: STATUSES.FAILED, errors: [err?.message] });
    return next(err);
  }
});

module.exports = router;

