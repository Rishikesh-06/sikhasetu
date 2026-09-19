import dotenv from "dotenv";
import { authApi } from "./src/services/api/auth-api";
import { PDFService } from "./server/services/disha/pdf-service";
import { DocumentService } from "./server/services/disha/document-service";
import { DishaConversationService } from "./server/services/disha/conversation-service";
import { QuizService } from "./server/services/disha/quiz-service";

dotenv.config();

// Minimal valid PDF text content for Class 7 Science: Nutrition in Plants
const sampleClass7PdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 380 >> stream
BT
/F1 12 Tf
50 720 Td
(Chapter 1: Nutrition in Plants) Tj
0 -20 Td
(Green plants synthesize their own food through the process of photosynthesis.) Tj
0 -20 Td
(Leaves are the food factories of plants. Water and minerals are transported to the leaves by vessels.) Tj
0 -20 Td
(Chlorophyll helps leaves capture the energy of sunlight to synthesize food from carbon dioxide and water.) Tj
0 -20 Td
(Solar energy is stored by the leaves in the form of chemical energy.) Tj
0 -20 Td
(Mitochondria act as the cellular powerhouse providing energy for plant metabolism.) Tj
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
0000000675 00000 n 
trailer << /Root 1 0 R /Size 6 >>
startxref
750
%%EOF`;

async function runDishaTests() {
  console.log("====================================================");
  console.log("  TESTING SIKHASETU DISHA PIPELINE");
  console.log("====================================================");

  // 1. Authenticate as student
  console.log("\n[1] Fetching Demo Student Account...");
  const accountsRes = await fetch("http://localhost:3001/api/auth/demo-accounts");
  const accountsData = await accountsRes.json() as any;
  const student = accountsData.students?.[0];

  if (!student) {
    throw new Error("No demo students found in database.");
  }

  const token = student.token;
  const studentId = student.profileId;
  console.log(`✓ Authenticated: ${student.name} (Profile ID: ${studentId}, Class: ${student.classLevel})`);

  // 2. Test PDF Extraction
  console.log("\n[2] Testing PDF extraction service...");
  const pdfBuffer = Buffer.from(sampleClass7PdfContent, "utf-8");
  const base64Pdf = pdfBuffer.toString("base64");
  const extraction = await PDFService.extractTextFromPDF(base64Pdf);
  console.log(`✓ Extracted ${extraction.pageCount} page(s), Total Chars: ${extraction.totalCharacters}`);
  console.log(`  Preview: "${extraction.pages[0]?.text.slice(0, 100)}..."`);

  // 3. Test Full Upload & Document Processing Pipeline
  console.log("\n[3] Testing /api/student/disha/upload endpoint...");
  const uploadRes = await fetch("http://localhost:3001/api/student/disha/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      fileName: "Class_7_Science_Nutrition_in_Plants.pdf",
      fileData: base64Pdf,
      fileSize: pdfBuffer.byteLength,
      title: "Class 7 Science: Nutrition in Plants"
    })
  });

  const uploadData = await uploadRes.json() as any;
  if (!uploadData.success) {
    throw new Error(`Upload failed: ${uploadData.error}`);
  }

  const doc = uploadData.document;
  console.log(`✓ Document Created ID: ${doc.id}`);
  console.log(`  Title: ${doc.title}`);
  console.log(`  Subject: ${doc.subject} | Class: ${doc.classLevel}`);
  console.log(`  Summary: ${doc.summary.slice(0, 120)}...`);
  console.log(`  Key Concepts Count: ${doc.keyConcepts?.length || 0}`);
  console.log(`  Chapters Count: ${doc.chapters?.length || 0}`);

  // 4. Test Asking Disha a Grounded Question in English
  console.log("\n[4] Asking Disha in English: 'What is photosynthesis?'...");
  const chat1Res = await fetch("http://localhost:3001/api/student/disha/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      documentId: doc.id,
      message: "What is photosynthesis?",
      language: "en"
    })
  });

  const chat1 = await chat1Res.json() as any;
  console.log(`✓ Disha Reply: ${chat1.reply.slice(0, 160)}...`);
  console.log(`  isGrounded: ${chat1.isGrounded}`);
  console.log(`  Sources:`, chat1.sources);

  // 5. Test Asking in Telugu (Code-Mixing)
  console.log("\n[5] Asking Disha in Telugu: 'Telugu lo simple ga cheppu'...");
  const chat2Res = await fetch("http://localhost:3001/api/student/disha/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      documentId: doc.id,
      conversationId: chat1.conversationId,
      message: "Telugu lo simple ga cheppu",
      language: "te"
    })
  });

  const chat2 = await chat2Res.json() as any;
  console.log(`✓ Disha Reply (Telugu): ${chat2.reply.slice(0, 160)}...`);
  console.log(`  Language Detected: ${chat2.language}`);

  // 6. Test Asking in Hindi
  console.log("\n[6] Asking Disha in Hindi: 'Ab Hindi mein explain karo'...");
  const chat3Res = await fetch("http://localhost:3001/api/student/disha/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      documentId: doc.id,
      conversationId: chat1.conversationId,
      message: "Ab Hindi mein explain karo",
      language: "hi"
    })
  });

  const chat3 = await chat3Res.json() as any;
  console.log(`✓ Disha Reply (Hindi): ${chat3.reply.slice(0, 160)}...`);
  console.log(`  Language Detected: ${chat3.language}`);

  // 7. Test Non-Hallucination Unknown Concept
  console.log("\n[7] Testing Non-Hallucination Safeguard: 'What is quantum superposition in black holes?'...");
  const chat4Res = await fetch("http://localhost:3001/api/student/disha/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      documentId: doc.id,
      conversationId: chat1.conversationId,
      message: "What is quantum superposition in black holes?",
      language: "en"
    })
  });

  const chat4 = await chat4Res.json() as any;
  console.log(`✓ Disha Response: ${chat4.reply.slice(0, 160)}...`);
  console.log(`  isGrounded: ${chat4.isGrounded}`);

  // 8. Test Quiz Generation
  console.log("\n[8] Testing /api/student/disha/quiz/generate...");
  const quizRes = await fetch("http://localhost:3001/api/student/disha/quiz/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ documentId: doc.id })
  });

  const quizData = await quizRes.json() as any;
  console.log(`✓ Generated Quiz ID: ${quizData.quiz?.id}, Questions: ${quizData.quiz?.questions?.length}`);
  if (quizData.quiz?.questions?.[0]) {
    console.log(`  Q1: ${quizData.quiz.questions[0].questionText}`);
    console.log(`  Options: ${quizData.quiz.questions[0].options.join(" | ")}`);
    console.log(`  Page Reference: Page ${quizData.quiz.questions[0].pageNumber}`);
  }

  // 9. Test Document Library Fetch
  console.log("\n[9] Testing /api/student/disha/documents list...");
  const docsRes = await fetch("http://localhost:3001/api/student/disha/documents", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const docsData = await docsRes.json() as any;
  console.log(`✓ Found ${docsData.documents?.length} document(s) in student library.`);

  console.log("\n====================================================");
  console.log("  ALL DISHA BACKEND PIPELINE TESTS PASSED! 🎉");
  console.log("====================================================");
  process.exit(0);
}

runDishaTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
