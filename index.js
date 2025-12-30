// index.js
require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { WebClient } = require("@slack/web-api");
const Tesseract = require("tesseract.js");
const pdfParse = require("pdf-parse");

const app = express();
app.use(express.json({ limit: "25mb" }));

const PORT = process.env.PORT || 3000;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

if (!SLACK_BOT_TOKEN) {
  console.log("❌ Missing env vars. Check your .env file.");
  console.log("Need: SLACK_BOT_TOKEN (and PORT optional)");
  process.exit(1);
}

const slack = new WebClient(SLACK_BOT_TOKEN);

// ---------- Helpers ----------
async function downloadSlackFile(urlPrivate) {
  const res = await axios.get(urlPrivate, {
    responseType: "arraybuffer",
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  });
  return Buffer.from(res.data);
}

function looksLikeScannedPdf(text) {
  const cleaned = (text || "").replace(/\s+/g, "");
  return cleaned.length < 30; // very small text usually means scanned image PDF
}

async function postText(channel, thread_ts, title, text) {
  const trimmed = (text || "").trim();
  const safeText = trimmed.length ? trimmed : "(No text found)";
  const max = 3500; // keep it under Slack message limits
  const snippet = safeText.length > max ? safeText.slice(0, max) + "\n…(truncated)" : safeText;

  await slack.chat.postMessage({
    channel,
    thread_ts,
    text: `🧾 *${title}*\n\`\`\`\n${snippet}\n\`\`\``,
  });
}

// ---------- Slack Events Endpoint ----------
app.post("/slack/events", async (req, res) => {
  // 1) Slack URL verification (when you first set Request URL)
  if (req.body?.type === "url_verification") {
    return res.status(200).send(req.body.challenge);
  }

  // Acknowledge Slack immediately
  res.sendStatus(200);

  try {
    const event = req.body?.event;

    // We only care about message events with files
    if (!event || event.type !== "message") return;
    if (!event.files || !event.files.length) return;

    const channel = event.channel;
    const thread_ts = event.ts; // reply in a thread to keep channel clean

    for (const f of event.files) {
      const fileName = f.name || "uploaded file";
      const mimetype = f.mimetype || "";
      const urlPrivate = f.url_private_download || f.url_private;

      await slack.chat.postMessage({
        channel,
        thread_ts,
        text: `✅ Got your file: *${fileName}*\nType: ${mimetype || "unknown"}\nNext: converting to text…`,
      });

      if (!urlPrivate) {
        await slack.chat.postMessage({
          channel,
          thread_ts,
          text: `❌ I couldn’t get a download link from Slack for *${fileName}*.`,
        });
        continue;
      }

      // Download file bytes from Slack
      const buf = await downloadSlackFile(urlPrivate);

      // ---- IMAGE OCR ----
      if (mimetype.startsWith("image/")) {
        const result = await Tesseract.recognize(buf, "eng");
        const text = result?.data?.text || "";
        await postText(channel, thread_ts, `${fileName} (OCR)`, text);
        continue;
      }

      // ---- PDF PARSE (text-based PDFs) ----
      if (mimetype === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
        const data = await pdfParse(buf);
        const text = data?.text || "";

        if (looksLikeScannedPdf(text)) {
          await slack.chat.postMessage({
            channel,
            thread_ts,
            text:
              `⚠️ *${fileName}* looks like a scanned/image PDF.\n` +
              `Right now I can read *image uploads* with Tesseract.\n` +
              `Next upgrade: convert PDF pages → images → run OCR on each page.`,
          });
        } else {
          await postText(channel, thread_ts, `${fileName} (PDF text)`, text);
        }
        continue;
      }

      // ---- Unknown file type ----
      await slack.chat.postMessage({
        channel,
        thread_ts,
        text: `⚠️ I don’t support this file type yet: *${fileName}* (${mimetype}). Upload an image or PDF.`,
      });
    }
  } catch (err) {
    console.error("❌ Error handling event:", err?.message || err);
  }
});

app.get("/", (req, res) => res.status(200).send("OK"));

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log("✅ Slack events endpoint: /slack/events");
});
