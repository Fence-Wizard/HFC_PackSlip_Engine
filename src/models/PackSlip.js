const { v4: uuidv4 } = require("uuid");

const STATUSES = {
  UPLOADED: "uploaded",
  EXTRACTED: "extracted",
  REVIEW: "review",
  SUBMITTED: "submitted",
  FAILED: "failed",
};

function now() {
  return new Date().toISOString();
}

function createPackSlip(file) {
  const id = uuidv4();
  return {
    id,
    status: STATUSES.UPLOADED,
    file,
    extractedText: "",
    lineItems: [],
    metadata: {},
    errors: [],
    createdAt: now(),
    updatedAt: now(),
    submittedAt: null,
  };
}

module.exports = {
  STATUSES,
  createPackSlip,
  now,
};

