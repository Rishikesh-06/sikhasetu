import { PDFParse } from "pdf-parse";

const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 55 >> stream
BT
/F1 18 Tf
50 700 Td
(SIKHASETU DISHA Chapter 1 Test) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000350 00000 n 
trailer << /Root 1 0 R /Size 6 >>
startxref
424
%%EOF`;

async function testExtraction() {
  const buf = Buffer.from(minimalPdf, "utf-8");
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const parser = new PDFParse(uint8);
  await parser.load();
  const info = await parser.getInfo();
  const text = await parser.getText();
  console.log("Extracted info:", info);
  console.log("Extracted text:", text);
}

testExtraction().catch(console.error);
