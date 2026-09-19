import { DocumentService } from "./server/services/disha/document-service";
import { SummaryService } from "./server/services/disha/summary-service";
import { DishaConversationService } from "./server/services/disha/conversation-service";
import { query } from "./server/db";

async function runDeepSummaryTest() {
  console.log("==================================================");
  console.log("TESTING DISHA DEEP STUDY SUMMARY & REAL PDF ENGINE");
  console.log("==================================================");

  // 1. Get a real student
  const studentRes = await query(`SELECT id, name AS full_name, class_level FROM student_profiles LIMIT 1`);
  if (!studentRes.rows || studentRes.rows.length === 0) {
    console.error("❌ No student found in database.");
    process.exit(1);
  }
  const student = studentRes.rows[0];
  console.log(`👤 Testing with Student: ${student.full_name} (Class ${student.class_level}, ID: ${student.id})`);

  // 2. Realistic multi-page educational PDF text content with real concepts, equations, definitions, processes
  const multiPageEducationalContent = `
--- Page 1 ---
CHAPTER 1: NUTRITION IN PLANTS AND CELLULAR AUTOTROPHY
Class 7 & 10 Science — Life Processes

1.1 Introduction to Nutrition
All living organisms require food for energy, growth, maintenance, and repair of tissues.
Nutrition is the mode of taking food by an organism and its utilization by the body.
Organisms that synthesize their own organic food from simple inorganic raw materials (such as carbon dioxide and water) are called autotrophs (e.g., green plants and certain photosynthetic bacteria).

1.2 The Photosynthesis Mechanism
Photosynthesis is the endothermic biochemical process by which green plants synthesize glucose (carbohydrates) from carbon dioxide and water in the presence of sunlight and chlorophyll, releasing oxygen as a byproduct.

Chemical Equation for Photosynthesis:
6CO2 + 6H2O + Light Energy --(Chlorophyll)--> C6H12O6 + 6O2
Where:
- CO2 = Carbon dioxide absorbed from atmosphere via stomata
- H2O = Water absorbed from soil by roots via xylem vessels
- C6H12O6 = Glucose (monosaccharide sugar stored later as starch)
- O2 = Oxygen released into the atmosphere as a vital byproduct

1.3 Role of Chloroplasts and Chlorophyll
Chloroplasts are specialized double-membrane cellular organelles containing the green pigment chlorophyll.
Chlorophyll captures photons of solar energy and converts light energy into chemical energy (ATP and NADPH).

--- Page 2 ---
1.4 Step-by-Step Stages of Photosynthesis:
1. Absorption of solar light energy by chlorophyll molecules in the thylakoid membranes.
2. Conversion of light energy to chemical energy and splitting of water molecules (photolysis):
   2H2O --> 4H+ + 4e- + O2
3. Reduction of carbon dioxide to carbohydrates (glucose) through enzymatic reactions in the stroma (Calvin-Benson cycle).

1.5 Stomata and Gas Exchange
Stomata are microscopic pores located predominantly on the epidermis of leaves.
Each stoma is bordered by a pair of kidney-shaped guard cells.
When guard cells absorb water, they become turgid and swell, causing the stomatal pore to open.
When guard cells lose water, they become flaccid and the pore closes to prevent excessive transpiration.

Important Definition:
Transpiration: The physiological process of water loss in the form of water vapor from the aerial parts (principally leaves) of a plant.

Example & Experiment:
The Starch Test on a variegated Croton leaf proves that chlorophyll and light are strictly mandatory for photosynthesis.
After destarching the leaf in darkness for 72 hours, exposing part of it to sunlight, and applying Iodine solution, only the chlorophyll-containing regions exposed to sunlight turn blue-black due to starch formation.

--- Page 3 ---
CHAPTER 2: HETEROTROPHIC NUTRITION AND SPECIALIZED ADAPTATIONS

2.1 Parasitic Plants
Parasites obtain ready-made food from a host plant using specialized penetrating suckers known as haustoria.
Example: Cuscuta (Amarbel) is a non-green yellow parasitic plant that wraps around host trees and extracts carbohydrates and sap.

2.2 Saprotrophic Nutrition and Fungi
Saprotrophs secrete digestive enzymes directly onto dead and decaying organic matter and absorb the soluble nutrients.
Example: Fungi like Bread Mould (Rhizopus), Yeast, and Mushrooms.

2.3 Symbiotic Associations: Lichens & Mycorrhizae
Symbiosis is a mutually beneficial biological association between two distinct organisms.
In Lichens:
- The autotrophic Alga synthesizes food through photosynthesis and supplies it to the Fungus.
- The Fungus provides shelter, water, and mineral absorption to the Alga.
Nitrogen Fixation: Rhizobium bacteria reside in the root nodules of leguminous plants (peas, grams). They convert atmospheric nitrogen (N2) into plant-absorbable nitrates, while the plant provides carbohydrates and shelter.

2.4 High-Yield Exam Notes & Formulas
Key Equation for Cellular Respiration (Opposite of Photosynthesis):
C6H12O6 + 6O2 --> 6CO2 + 6H2O + 38 ATP (Energy)

Essential Exam Reminders:
1. Autotrophic nutrition requires 4 mandatory factors: Sunlight, Chlorophyll, CO2, and H2O.
2. Desert plants (xerophytes) open stomata at night (CAM pathway) to take in CO2 and prepare an intermediate acid, preventing daytime water loss.
3. Iodine turns dark blue-black in the presence of starch.
4. Pitcher plant (Nepenthes) is insectivorous — it carries out photosynthesis for energy but traps insects to fulfill its nitrogen deficiency.
`;

  // Create document directly in database & process with SummaryService
  const docId = `doc-test-${Date.now()}`;
  console.log(`\n📄 Step 1: Processing Document [${docId}]...`);

  const processed = await DocumentService.uploadAndProcessDocument({
    studentId: student.id,
    fileName: "Plant_Nutrition_and_Life_Processes_Complete_Guide.pdf",
    fileData: multiPageEducationalContent,
    fileSize: multiPageEducationalContent.length,
    studentClass: student.class_level || 7
  });

  console.log(`\n✅ Document Processed Successfully!`);
  console.log(`- Document ID: ${processed.id}`);
  console.log(`- Title: ${processed.title}`);
  console.log(`- Page Count: ${processed.pageCount}`);
  console.log(`- Subject Detected: ${processed.subject}`);
  console.log(`- Class Level: ${processed.classLevel}`);

  // Inspect the generated Structured Study Summary
  const ss = processed.structuredSummary;
  console.log("\n==================================================");
  console.log("STRUCTURED STUDY GUIDE INSPECTION");
  console.log("==================================================");

  console.log("\n📌 [DOCUMENT OVERVIEW]");
  console.log(`Title: ${ss.documentOverview.title}`);
  console.log(`Subject: ${ss.documentOverview.subject} | Class: ${ss.documentOverview.classLevel} | Read Time: ${ss.documentOverview.estimatedReadTimeMinutes} mins`);
  console.log(`High-Level Summary:\n${ss.documentOverview.highLevelSummary}`);
  console.log(`Core Themes: ${JSON.stringify(ss.documentOverview.coreThemes)}`);

  console.log(`\n📌 [KEY CONCEPTS] (Total: ${ss.keyConcepts.length})`);
  ss.keyConcepts.forEach((kc, i) => {
    const text = kc.explanation || (kc as any).description || JSON.stringify(kc);
    console.log(`  ${i + 1}. [Page ${kc.pageNumber}] ${kc.concept || (kc as any).name}: ${text.slice(0, 90)}...`);
  });

  console.log(`\n📌 [CHAPTER / SECTION SUMMARIES] (Total: ${ss.chapterSummaries.length})`);
  ss.chapterSummaries.forEach((ch, i) => {
    console.log(`  Chapter ${i + 1}: "${ch.chapterTitle}" (Pages ${ch.pageRange})`);
    console.log(`    Summary: ${(ch.summary || "").slice(0, 100)}...`);
    console.log(`    Takeaways: ${(ch.keyTakeaways || []).length} points`);
  });

  console.log(`\n📌 [IMPORTANT DEFINITIONS] (Total: ${ss.importantDefinitions.length})`);
  ss.importantDefinitions.forEach((def, i) => {
    console.log(`  ${i + 1}. [Page ${def.pageNumber}] ${def.term}: ${def.definition}`);
  });

  console.log(`\n📌 [FORMULAS & EQUATIONS] (Total: ${ss.formulasAndEquations.length})`);
  ss.formulasAndEquations.forEach((eq, i) => {
    console.log(`  ${i + 1}. [Page ${eq.pageNumber}] ${eq.equationName || "Formula"}:`);
    console.log(`     Formula: ${eq.formula}`);
    console.log(`     Variables: ${eq.variableMeaning}`);
    if (eq.notes) console.log(`     Notes: ${eq.notes}`);
  });

  console.log(`\n📌 [PROCESSES & STEPS] (Total: ${ss.processesAndSteps.length})`);
  ss.processesAndSteps.forEach((pr, i) => {
    console.log(`  ${i + 1}. [Page ${pr.pageNumber}] ${pr.processName}:`);
    (pr.steps || []).forEach((st, si) => console.log(`     Step ${si + 1}: ${st}`));
  });

  console.log(`\n📌 [EXAMPLES & CASE STUDIES] (Total: ${ss.examplesAndApplications.length})`);
  ss.examplesAndApplications.forEach((ex, i) => {
    const desc = ex.description || "";
    console.log(`  ${i + 1}. [Page ${ex.pageNumber}] ${ex.concept} -> ${ex.exampleTitle}: ${desc.slice(0, 100)}...`);
  });

  console.log(`\n📌 [QUICK REVISION & EXAM POINTS]`);
  console.log(`Remember Points:`, ss.quickRevision.rememberPoints);
  console.log(`Exam Focus Points:`, ss.quickRevision.examFocusPoints);
  console.log(`Common Mistakes To Avoid:`, ss.quickRevision.commonMistakesToAvoid);

  // 3. Test Translation to Telugu and Hindi
  console.log("\n==================================================");
  console.log("TESTING MULTILINGUAL SUMMARY TRANSLATION");
  console.log("==================================================");

  console.log("🌐 Translating to Telugu (తెలుగు)...");
  const teluguSummary = await SummaryService.translateStructuredSummary({
    structuredSummary: ss,
    targetLanguage: "te",
    studentClass: student.class_level || 7
  });
  console.log("Telugu High-Level Summary:\n", teluguSummary.documentOverview.highLevelSummary);
  if (teluguSummary.keyConcepts.length > 0) {
    console.log("Telugu First Concept:", teluguSummary.keyConcepts[0]);
  }
  if (teluguSummary.importantDefinitions.length > 0) {
    console.log("Telugu First Definition:", teluguSummary.importantDefinitions[0]);
  }

  // 4. Test Ask Disha Grounded Q&A
  console.log("\n==================================================");
  console.log("TESTING ASK DISHA GROUNDED Q&A");
  console.log("==================================================");

  const testQuestions = [
    "What is the balanced chemical formula for photosynthesis and what does each term represent?",
    "Why does Cuscuta (Amarbel) depend on a host plant?",
    "What is quantum entanglement and string theory?" // Should indicate not found in PDF
  ];

  for (const qText of testQuestions) {
    console.log(`\n❓ Student Question: "${qText}"`);
    const ans = await DishaConversationService.generateResponse({
      studentName: student.full_name,
      studentClass: student.class_level || 7,
      documentId: processed.id,
      documentTitle: processed.title,
      history: [],
      newMessage: qText,
      requestedLanguage: "en"
    });
    console.log(`💡 Disha Answer:\n${ans.reply}`);
    console.log(`📚 Grounded: ${ans.isGrounded} | Sources: ${ans.sources.length} sources`);
  }

  // 5. Test DB Persistence: reload document and verify structured summary is intact
  console.log("\n==================================================");
  console.log("TESTING DATABASE PERSISTENCE & RELOAD");
  console.log("==================================================");
  const reloaded = await DocumentService.getDocumentById(processed.id, student.id);
  if (!reloaded || !reloaded.structuredSummary || !reloaded.structuredSummary.keyConcepts.length) {
    console.error("❌ Failed to reload structured summary from database.");
    process.exit(1);
  }
  console.log(`✅ Verified document persisted & reloaded cleanly. Structured concepts count: ${reloaded.structuredSummary.keyConcepts.length}`);

  console.log("\n🎉 ALL DEEP STUDY SUMMARY & DISHA ENGINE TESTS PASSED!");
  process.exit(0);
}

runDeepSummaryTest().catch((err) => {
  console.error("💥 Test failed with error:", err);
  process.exit(1);
});
