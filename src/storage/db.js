const fs = require("fs");
const path = require("path");
const { config } = require("../config/env");

const DB_PATH = path.join(config.dataDir, "packslips.json");

function ensureDbFile() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { packSlips: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
  }
}

function loadDb() {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, "utf8");
  return JSON.parse(raw);
}

function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function createPackSlip(record) {
  const db = loadDb();
  db.packSlips.push(record);
  saveDb(db);
  return record;
}

function getPackSlip(id) {
  const db = loadDb();
  return db.packSlips.find((p) => p.id === id) || null;
}

function updatePackSlip(id, fields) {
  const db = loadDb();
  const idx = db.packSlips.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated = { ...db.packSlips[idx], ...fields, updatedAt: new Date().toISOString() };
  db.packSlips[idx] = updated;
  saveDb(db);
  return updated;
}

module.exports = {
  createPackSlip,
  getPackSlip,
  updatePackSlip,
};

