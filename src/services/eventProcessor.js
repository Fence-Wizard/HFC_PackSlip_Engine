const Tesseract = require("tesseract.js");
const pdfParse = require("pdf-parse");
const logger = require("../config/logger");
const { postMessage } = require("./slackClient");
const { downloadSlackFile } = require("./fileFetcher");
const { looksLikeScannedPdf } = require("../utils/pdf");

async function postText(channel, thread_ts, title, text, reqId) {
  const trimmed = (text || "").trim();
  const safeText = trimmed.length ? trimmed : "(No text found)";
  const max = 3500;
  const snippet = safeText.length > max ? `${safeText.slice(0, max)}\n…(truncated)` : safeText;

  await postMessage(
    {
      channel,
      thread_ts,
      text: `🧾 *${title}*\n\`\`\`\n${snippet}\n\`\`\``,
    },
    reqId,
  );
}

async function handleFile(event, file, reqId) {
  const fileName = file.name || "uploaded file";
  const mimetype = file.mimetype || "";
  const urlPrivate = file.url_private_download || file.url_private;
  const channel = event.channel;
  const thread_ts = event.ts;

  await postMessage(
    {
      channel,
      thread_ts,
      text: `✅ Got your file: *${fileName}*\nType: ${mimetype || "unknown"}\nNext: converting to text…`,
    },
    reqId,
  );

  if (!urlPrivate) {
    await postMessage(
      {
        channel,
        thread_ts,
        text: `❌ I couldn’t get a download link from Slack for *${fileName}*.`,
      },
      reqId,
    );
    return;
  }

  const buf = await downloadSlackFile(urlPrivate, reqId);

  if (mimetype.startsWith("image/")) {
    const result = await Tesseract.recognize(buf, "eng");
    const text = result?.data?.text || "";
    await postText(channel, thread_ts, `${fileName} (OCR)`, text, reqId);
    return;
  }

  if (mimetype === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    const data = await pdfParse(buf);
    const text = data?.text || "";

    if (looksLikeScannedPdf(text)) {
      await postMessage(
        {
          channel,
          thread_ts,
          text:
            `⚠️ *${fileName}* looks like a scanned/image PDF.\n` +
            `Right now I can read *image uploads* with Tesseract.\n` +
            `Next upgrade: convert PDF pages → images → run OCR on each page.`,
        },
        reqId,
      );
    } else {
      await postText(channel, thread_ts, `${fileName} (PDF text)`, text, reqId);
    }
    return;
  }

  await postMessage(
    {
      channel,
      thread_ts,
      text: `⚠️ I don’t support this file type yet: *${fileName}* (${mimetype}). Upload an image or PDF.`,
    },
    reqId,
  );
}

async function processSlackEvent(payload, reqId) {
  const event = payload?.event;
  if (!event || event.type !== "message") return;
  if (!event.files || !event.files.length) return;

  for (const f of event.files) {
    // eslint-disable-next-line no-await-in-loop
    await handleFile(event, f, reqId);
  }
}

async function handleEvent(payload, reqId) {
  try {
    await processSlackEvent(payload, reqId);
  } catch (err) {
    logger.error("Error handling Slack event", { reqId, message: err?.message });
  }
}

module.exports = { handleEvent };

