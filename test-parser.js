/**
 * Test the parser with OCR text
 */

const { parsePackSlip, cleanOcrText } = require("./src/services/parsePackSlip");

// Sample OCR text from the pack slip
const ocrText = `i Remit Payment to: PACK SLIP #:08-157894 Pg1 of 1]
2) TEPH N Stephens Pipe & Steel, LLC Billing Date :12/16/2025
 PIPE&STEEL P.O. Box 518 Customer Acct:37091
Russell Springs, KY 42642 Payment Terms:NET-60
4301 46th Street ' Customer PO #:2423035-4
Bladensburg, MD 20710 Visit our website: Sales Person :J.KELLY-D.BRAY
(301) 699-0400 https://SPSfence.com Made By User :jenniferkelly
Sales Fax: (978) 250-5320 SPS Order # :43090-0
Sales Phone: (866) 792-5295 Shipped Via :0T
Contact Name :TIFFANY- 804-477-8238 (
* Quote valid 10 days. Expires: 12/26/2025 * Fax number  :8043536039
Sh Note:DEL MON-FRI 10-2:30 CALL 48 HR IN| 2
Sold To:HURRICANE FENCE CO @ VA Ship To: HURRICANE FENCE CO @ VA
PO BOX 27527 (804) 353-6030
RICHMOND, VA 23261-7527 1300 DINNEEN STREET
RICHMOND, VA 23220
** Send Invoice by EMAIL ONLY.
|__cusTom _SPS IS NOT RESPONSIBLE FOR FINAL QUANTITIES OR TAKEOFFS!
[Ordered | Shipped [BackOrder| Unit | ___~  ProductfemDesciptin | Price [ Amount |
** Your signature means you received all
** items accurately. Please verify all items
** at the time of receipt.
-
| 144] 144]  0|ft |[BLKVNL 4\" x18 x SP40x8pc — I
| 4] a]  olpc [BLKVNL 4\" x13'x SP40 ~ 7
[144] 144]  o|ft [BLK VNL 3\" x 18\" x SP40 x 8pc Es I
6] 6[ ope |BLKVNL 3\" x 13\" x SP40 ~ I EE
8] 8 O|lpc |BLKVNL 3\" x 10'6\" x SP40 ~~ I
| 62] 62]  O|pc [BLKVNL 2-1/2\" x 12' x SP40 ~ I
[sl 8 olpe IBLKVNL 2-112\" x 10%\" x Spd I
| 60] 60] Olpc [BLKVNL 2\" x 10'6\" x SP40 I]
To BLK VNL 2\" x 8' x SP20 = I
EEE
[
| dnd find 25% pss I'S |
cr EI
|
[|
| |
ATERTIALS RECEIVED BY: Q PRINT Name: DATE: JK) Sf 0) - j
SIGNATURE ACKNOWLEDGES RECEIPT OF ALL MATERIAL(S) AS LISTED. |`;

console.log("=== Parser Test ===\n");

console.log("--- Cleaned OCR Text (first 500 chars) ---");
console.log(cleanOcrText(ocrText).substring(0, 500));
console.log("\n");

console.log("--- Parsing Results ---");
const items = parsePackSlip(ocrText);

if (items.length === 0) {
  console.log("No items found!");
} else {
  console.log(`Found ${items.length} items:\n`);
  items.forEach((item, i) => {
    console.log(`${i + 1}. Qty: ${item.quantity} ${item.unit} - ${item.description}`);
  });
}

