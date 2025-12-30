# Pack Slip Engine

Web-first pack slip ingestion app. Upload a PDF or image, extract text (PDF text or OCR), review/edit draft line items, then submit to an n8n webhook. Slack/email are handled by n8n, not by this app.

## How it works
1) Upload PDF/image via `/upload.html`
2) Extraction pipeline:
   - PDF text via `pdf-parse`
   - If text is empty/sparse, render pages to images and OCR with Tesseract
   - Images go straight to OCR
3) Draft parsing builds line items (best-effort heuristic)
4) Review/edit in `/review.html`
5) Submit → POST to `N8N_WEBHOOK_URL` with metadata, confirmed items, raw text, and file URL

## Endpoints
- `GET /upload.html`, `GET /review.html?id=...`, `GET /done.html`
- `POST /api/upload` (multipart `file`)
- `GET /api/review/:id`
- `POST /api/submit/:id`
- `GET /healthz`, `GET /readyz`

## Config
See `env.example`. Key vars:
- `PORT` (default 3000)
- `APP_BASE_URL` (used to build file URLs for n8n)
- `DATA_DIR`, `UPLOAD_DIR` (default `./data` / `./data/uploads`)
- `N8N_WEBHOOK_URL` (required for real dispatch)
- Optional: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET` (not used by default; kept for future output-only Slack usage)

## Running locally
```
npm install
npm start
```
Open http://localhost:3000/upload.html

## Notes / future
- Parsing is heuristic; add ML/LLM later if desired.
- Storage is file-based JSON; swap with a DB for production.
- pdf2pic requires system dependencies (ImageMagick/Ghostscript). Ensure they are installed where OCR of scanned PDFs is needed.

