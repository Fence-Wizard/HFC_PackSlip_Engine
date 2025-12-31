/**
 * Test OCR extraction from scanned PDFs.
 * Run: node test-ocr.js "path/to/pdf"
 */

const fs = require("fs");
const Tesseract = require("tesseract.js");

async function testOcr(pdfPath) {
  console.log("=== OCR Extraction Test ===");
  console.log("File:", pdfPath);
  
  if (!fs.existsSync(pdfPath)) {
    console.error("ERROR: File not found:", pdfPath);
    process.exit(1);
  }
  
  const buffer = fs.readFileSync(pdfPath);
  console.log("File size:", buffer.length, "bytes");
  console.log("");

  // Step 1: Use pdf-parse v2.x to render pages as images
  console.log("--- Step 1: Rendering PDF pages as images ---");
  let pageImages = [];
  try {
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    
    // Get screenshots of pages
    const result = await parser.getScreenshot({ scale: 2 }); // Higher scale = better OCR
    await parser.destroy();
    
    console.log("Total pages:", result?.pages?.length);
    for (let i = 0; i < result.pages.length; i++) {
      const page = result.pages[i];
      console.log(`  Page ${i + 1}: ${page.data?.length} bytes`);
      if (page.data) {
        pageImages.push(page.data);
      }
    }
  } catch (err) {
    console.log("pdf-parse screenshot ERROR:", err.message);
    console.log("Stack:", err.stack?.split("\n").slice(0, 3).join("\n"));
    return;
  }
  
  if (pageImages.length === 0) {
    console.log("ERROR: No page images generated");
    return;
  }
  console.log("");

  // Step 2: Run OCR on each page image
  console.log("--- Step 2: Running Tesseract OCR ---");
  const allText = [];
  
  for (let i = 0; i < pageImages.length; i++) {
    console.log(`OCR Page ${i + 1}...`);
    const startTime = Date.now();
    
    try {
      const { data: { text } } = await Tesseract.recognize(
        pageImages[i],
        'eng',
        { logger: () => {} } // Suppress progress logs
      );
      
      const elapsed = Date.now() - startTime;
      console.log(`  Extracted ${text.length} chars in ${elapsed}ms`);
      allText.push(text);
    } catch (err) {
      console.log(`  OCR ERROR: ${err.message}`);
    }
  }
  
  console.log("");
  console.log("--- Final Result ---");
  const fullText = allText.join("\n\n--- Page Break ---\n\n");
  console.log("Total characters:", fullText.length);
  console.log("");
  console.log("Extracted text preview:");
  console.log("=".repeat(60));
  console.log(fullText.substring(0, 2000));
  console.log("=".repeat(60));
}

// Get PDF path from command line
const pdfPath = process.argv[2];
if (!pdfPath) {
  console.log("Usage: node test-ocr.js <path-to-pdf>");
  console.log("Example: node test-ocr.js \"S:\\Packing Slips\\Stephens Pipe & Steel\\2322568.pdf\"");
  process.exit(1);
}

testOcr(pdfPath).catch(console.error);

