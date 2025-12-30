const express = require("express");

const router = express.Router();

router.get("/healthz", (req, res) => res.status(200).send("OK"));
router.get("/readyz", (req, res) => res.status(200).send("READY"));

module.exports = router;

