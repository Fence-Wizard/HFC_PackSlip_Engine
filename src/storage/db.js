const fs = require("fs");
const path = require("path");
const { config, loadConfig } = require("../config/env");

function getDbPath() {
  if (!config.dataDir) {
    loadConfig();
  }
  return path.join(config.dataDir, "packslips.json");
}

function ensureDbFile() {
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!fs.existsSync(dbPath)) {
    const initial = { packSlips: [] };
    fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2));
  }
}

function loadDb() {
  ensureDbFile();
  const dbPath = getDbPath();
  const raw = fs.readFileSync(dbPath, "utf8");
  return JSON.parse(raw);
}

function saveDb(db) {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
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

