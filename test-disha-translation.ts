import { query } from "./server/db/index";
import { DocumentService } from "./server/services/disha/document-service";
import { SummaryService } from "./server/services/disha/summary-service";

async function runDishaTranslationAudit() {
  console.log("==================================================");
  console.log("DISHA — AUDIT TRANSLATION & DATABASE CACHING");
  console.log("==================================================");
  
  // 1. Get the latest Disha document from PostgreSQL
  const allDocsRes = await query("SELECT * FROM disha_documents ORDER BY created_at DESC LIMIT 5");
  if (allDocsRes.rows.length === 0) {
    console.error("No Disha documents found in database.");
    process.exit(1);
  }

  const rawDoc = allDocsRes.rows[0];
  const doc = (DocumentService as any).mapRowToDocument(rawDoc);
  console.log(`Testing with Document: "${doc.title}" (ID: ${doc.id}, Student: ${doc.studentId})`);
  console.log(`Original English Chapters: ${doc.chapters?.length || 0}`);
  console.log(`Original English Key Concepts: ${doc.keyConcepts?.length || 0}`);

  if (!doc.structuredSummary) {
    console.error("Document has no structuredSummary!");
    process.exit(1);
  }

  console.log("\n1. Testing Hindi (hi) Translation...");
  const t0 = Date.now();
  const hindiSummary = await SummaryService.translateStructuredSummary(doc.structuredSummary, "hi");
  const t1 = Date.now();
  console.log(`Hindi translation completed in ${(t1 - t0) / 1000}s`);

  console.log("Hindi Overview Title:", hindiSummary.documentOverview?.title);
  console.log("Hindi Overview Snippet:", hindiSummary.documentOverview?.highLevelSummary?.slice(0, 100) + "...");
  console.log("Hindi Core Themes:", hindiSummary.documentOverview?.coreThemes);
  console.log("Hindi Key Concepts count:", hindiSummary.keyConcepts?.length, "| First concept:", hindiSummary.keyConcepts?.[0]?.name);
  console.log("Hindi Chapters count:", hindiSummary.chapterSummaries?.length, "| First chapter:", hindiSummary.chapterSummaries?.[0]?.title);
  console.log("Hindi Definitions count:", hindiSummary.importantDefinitions?.length, "| First def:", hindiSummary.importantDefinitions?.[0]?.term);
  console.log("Hindi Principles count:", hindiSummary.corePrinciples?.length);
  console.log("Hindi Formulas count:", hindiSummary.formulasAndEquations?.length);
  console.log("Hindi Processes count:", hindiSummary.processesAndSteps?.length);
  console.log("Hindi Examples count:", hindiSummary.examplesAndApplications?.length);
  console.log("Hindi Facts count:", hindiSummary.importantFacts?.length);
  console.log("Hindi Revision remember count:", hindiSummary.quickRevision?.rememberPoints?.length);
  console.log("Hindi Revision exam count:", hindiSummary.quickRevision?.examFocusPoints?.length);

  // Save to database cache
  await DocumentService.saveTranslatedSummary(doc.id, doc.studentId, "hi", hindiSummary);
  console.log("Saved Hindi summary to database cache.");

  console.log("\n2. Testing Telugu (te) Translation...");
  const t2 = Date.now();
  const teluguSummary = await SummaryService.translateStructuredSummary(doc.structuredSummary, "te");
  const t3 = Date.now();
  console.log(`Telugu translation completed in ${(t3 - t2) / 1000}s`);

  console.log("Telugu Overview Title:", teluguSummary.documentOverview?.title);
  console.log("Telugu Overview Snippet:", teluguSummary.documentOverview?.highLevelSummary?.slice(0, 100) + "...");
  console.log("Telugu Core Themes:", teluguSummary.documentOverview?.coreThemes);
  console.log("Telugu Key Concepts count:", teluguSummary.keyConcepts?.length, "| First concept:", teluguSummary.keyConcepts?.[0]?.name);
  console.log("Telugu Chapters count:", teluguSummary.chapterSummaries?.length, "| First chapter:", teluguSummary.chapterSummaries?.[0]?.title);
  console.log("Telugu Definitions count:", teluguSummary.importantDefinitions?.length, "| First def:", teluguSummary.importantDefinitions?.[0]?.term);
  console.log("Telugu Principles count:", teluguSummary.corePrinciples?.length);
  console.log("Telugu Formulas count:", teluguSummary.formulasAndEquations?.length);
  console.log("Telugu Processes count:", teluguSummary.processesAndSteps?.length);
  console.log("Telugu Examples count:", teluguSummary.examplesAndApplications?.length);
  console.log("Telugu Facts count:", teluguSummary.importantFacts?.length);
  console.log("Telugu Revision remember count:", teluguSummary.quickRevision?.rememberPoints?.length);
  console.log("Telugu Revision exam count:", teluguSummary.quickRevision?.examFocusPoints?.length);

  // Save to database cache
  await DocumentService.saveTranslatedSummary(doc.id, doc.studentId, "te", teluguSummary);
  console.log("Saved Telugu summary to database cache.");

  console.log("\n3. Testing Cache Retrieval from PostgreSQL...");
  const reloadedDoc = await DocumentService.getDocumentById(doc.id, doc.studentId);
  const hasCachedHi = !!reloadedDoc?.translatedSummaries?.hi;
  const hasCachedTe = !!reloadedDoc?.translatedSummaries?.te;
  console.log(`Cached Hindi present: ${hasCachedHi}`);
  console.log(`Cached Telugu present: ${hasCachedTe}`);

  if (hasCachedHi && hasCachedTe) {
    console.log("\n>>> ALL TRANSLATION & DATABASE CACHING TESTS PASSED! <<<");
  } else {
    console.error("Cache verification failed!");
    process.exit(1);
  }

  process.exit(0);
}

runDishaTranslationAudit().catch(err => {
  console.error("Test Error:", err);
  process.exit(1);
});
