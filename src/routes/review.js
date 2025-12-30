const express = require("express");
const db = require("../storage/db");

const router = express.Router();

router.get("/review/:id", (req, res) => {
  const { id } = req.params;
  const record = db.getPackSlip(id);
  if (!record) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.json(record);
});

module.exports = router;

