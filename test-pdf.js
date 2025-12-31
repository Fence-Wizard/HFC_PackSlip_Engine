/**
 * Test script to diagnose PDF extraction issues.
 * Run: node test-pdf.js "path/to/pdf"
 */

const fs = require("fs");

async function testPdf(pdfPath) {
  console.log("=== PDF Extraction Test ===");
  console.log("File:", pdfPath);
  
  if (!fs.existsSync(pdfPath)) {
    console.error("ERROR: File not found:", pdfPath);
    process.exit(1);
  }
  
  const buffer = fs.readFileSync(pdfPath);
  console.log("File size:", buffer.length, "bytes");
  console.log("");

  // Test 1: pdf-parse v2.x with correct API
  console.log("--- Testing pdf-parse v2.x ---");
  try {
    const { PDFParse } = require("pdf-parse");
    console.log("PDFParse class loaded");
    
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    
    console.log("Result keys:", Object.keys(result || {}));
    console.log("total pages:", result?.total);
    console.log("text length:", result?.text?.length);
    if (result?.text?.length > 0) {
      console.log("text preview:", result.text.substring(0, 500));
    } else {
      console.log("WARNING: No text extracted!");
    }
  } catch (err) {
    console.log("pdf-parse ERROR:", err.message);
    console.log("Stack:", err.stack?.split("\n").slice(0, 5).join("\n"));
  }
  console.log("");

  // Test 2: unpdf
  console.log("--- Testing unpdf ---");
  try {
    const unpdf = await import("unpdf");
    const extractText = unpdf.extractText || unpdf.default?.extractText;
    
    if (!extractText) {
      console.log("ERROR: extractText not found in unpdf");
    } else {
      const uint8 = new Uint8Array(buffer);
      const result = await extractText(uint8);
      
      console.log("totalPages:", result?.totalPages);
      console.log("text type:", typeof result?.text);
      console.log("text is array:", Array.isArray(result?.text));
      
      if (Array.isArray(result?.text)) {
        let totalChars = 0;
        for (const page of result.text) {
          if (typeof page === "string") {
            totalChars += page.length;
          }
        }
        console.log("Total chars from unpdf:", totalChars);
        if (totalChars > 0) {
          console.log("Preview:", result.text.join("\n").substring(0, 500));
        } else {
          console.log("WARNING: No text extracted!");
        }
      }
    }
  } catch (err) {
    console.log("unpdf ERROR:", err.message);
  }
  console.log("");
  console.log("=== Test Complete ===");
}

// Get PDF path from command line
const pdfPath = process.argv[2];
if (!pdfPath) {
  console.log("Usage: node test-pdf.js <path-to-pdf>");
  console.log("Example: node test-pdf.js \"S:\\Packing Slips\\Stephens Pipe & Steel\\2322568.pdf\"");
  process.exit(1);
}

testPdf(pdfPath).catch(console.error);
