const express = require("express");
const slackSignature = require("../middleware/slackSignature");
const { slackEventsHandler } = require("../controllers/slackEventsController");

const router = express.Router();

router.post("/events", slackSignature, slackEventsHandler);

module.exports = router;

