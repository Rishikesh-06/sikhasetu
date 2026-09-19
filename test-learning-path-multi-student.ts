import dotenv from "dotenv";
dotenv.config();

const BASE_URL = "http://localhost:3001/api";

async function testLearningPathMultiStudent() {
  console.log("================================================================================");
  console.log(" 🔍 LEARNING PATH AUDIT & TWO-STUDENT ISOLATION TEST (REAL SUPABASE CLOUD DB)");
  console.log("================================================================================\n");

  const ts = Date.now();

  // -------------------------------------------------------------
  // 1. Register Student 1 (Class 7, No Diagnostic Taken Yet)
  // -------------------------------------------------------------
  console.log("STUDENT 1 (CLASS 7 - NEW ACCOUNT, NO DIAGNOSTIC):");
  const s1Email = `student1.class7.${ts}@sikshasetu.edu`;
  const s1Reg = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: s1Email,
      name: "Rohan Sharma",
      role: "student",
      school: "Delhi Public School, R.K. Puram",
      classLevel: 7
    })
  });
  const s1Data = await s1Reg.json() as any;
  const s1Token = s1Data.token;
  console.log(`  ✔ Registered Student 1: ${s1Data.user.name} (Class ${s1Data.user.classLevel}, ID: ${s1Data.user.profileId})`);

  // Fetch Student 1 Learning Path
  console.log("  Fetching Student 1 Learning Path (/api/student/learning-path)...");
  const s1LpRes = await fetch(`${BASE_URL}/student/learning-path`, {
    headers: { "Authorization": `Bearer ${s1Token}` }
  });
  const s1Lp = await s1LpRes.json() as any;
  console.log("  Student 1 Learning Path Summary:", {
    studentName: s1Lp.student.name,
    classLevel: s1Lp.student.classLevel,
    school: s1Lp.student.school,
    diagnosticStatus: s1Lp.student.diagnosticStatus,
    hasSufficientEvidence: s1Lp.hasSufficientEvidence,
    totalNodes: s1Lp.summary.totalNodes,
    emptyStateMessage: s1Lp.emptyStateMessage
  });

  // Verify Student 1 Constraints
  if (s1Lp.student.classLevel !== 7) {
    throw new Error(`FAIL: Student 1 classLevel expected 7, got ${s1Lp.student.classLevel}`);
  }
  if (s1Lp.nodes[0].label !== "Class 7" || !s1Lp.nodes[0].title.includes("Class 7")) {
    throw new Error(`FAIL: First node must be 'Class 7', got ${s1Lp.nodes[0].label}`);
  }
  if (s1Lp.hasSufficientEvidence !== false) {
    throw new Error(`FAIL: New student without diagnostic should have hasSufficientEvidence = false`);
  }
  console.log("  ✔ Verified Student 1 has genuine starting/locked state with Class 7 (NO hardcoded 9).\n");

  // -------------------------------------------------------------
  // 2. Register Student 2 (Class 10, Complete Diagnostic & Assessment)
  // -------------------------------------------------------------
  console.log("STUDENT 2 (CLASS 10 - COMPLETED DIAGNOSTIC & EVIDENCE):");
  const s2Email = `student2.class10.${ts}@sikshasetu.edu`;
  const s2Reg = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: s2Email,
      name: "Simran Kaur",
      role: "student",
      school: "Kendriya Vidyalaya, Hebbal",
      classLevel: 10
    })
  });
  const s2Data = await s2Reg.json() as any;
  const s2Token = s2Data.token;
  console.log(`  ✔ Registered Student 2: ${s2Data.user.name} (Class ${s2Data.user.classLevel}, ID: ${s2Data.user.profileId})`);

  // Start & Complete Class 10 Diagnostic for Student 2
  console.log("  Running Class 10 Diagnostic for Student 2...");
  const s2DiagStartRes = await fetch(`${BASE_URL}/student/diagnostic/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${s2Token}`
    },
    body: JSON.stringify({ classLevel: 10 })
  });
  const s2DiagStart = await s2DiagStartRes.json() as any;

  let currentAttemptId = s2DiagStart.attemptId;
  let currentQ = s2DiagStart.question;

  for (let step = 1; step <= 5; step++) {
    if (!currentQ) break;
    console.log(`    Step ${step}/5: Answering Question ID ${currentQ.id} (${currentQ.topic} - ${currentQ.difficulty})`);
    const selectedAns = currentQ.options ? currentQ.options[0] : "A";
    const subRes = await fetch(`${BASE_URL}/student/diagnostic/submit-answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${s2Token}`
      },
      body: JSON.stringify({
        attemptId: currentAttemptId,
        questionId: currentQ.id,
        selectedAnswer: selectedAns
      })
    });
    const subData = await subRes.json() as any;
    if (subData.isCompleted) {
      console.log(`  ✔ Student 2 completed Diagnostic!`);
      break;
    }
    currentQ = subData.question;
  }

  // Fetch Student 2 Learning Path
  console.log("  Fetching Student 2 Learning Path (/api/student/learning-path)...");
  const s2LpRes = await fetch(`${BASE_URL}/student/learning-path`, {
    headers: { "Authorization": `Bearer ${s2Token}` }
  });
  const s2Lp = await s2LpRes.json() as any;
  console.log("  Student 2 Learning Path Summary:", {
    studentName: s2Lp.student.name,
    classLevel: s2Lp.student.classLevel,
    school: s2Lp.student.school,
    diagnosticStatus: s2Lp.student.diagnosticStatus,
    hasSufficientEvidence: s2Lp.hasSufficientEvidence,
    totalNodes: s2Lp.summary.totalNodes,
    masteredMilestones: s2Lp.summary.completedCount,
    overallMastery: s2Lp.summary.overallMastery
  });

  // Verify Student 2 Constraints
  if (s2Lp.student.classLevel !== 10) {
    throw new Error(`FAIL: Student 2 classLevel expected 10, got ${s2Lp.student.classLevel}`);
  }
  if (s2Lp.nodes[0].label !== "Class 10" || !s2Lp.nodes[0].title.includes("Class 10")) {
    throw new Error(`FAIL: First node must be 'Class 10', got ${s2Lp.nodes[0].label}`);
  }
  if (s2Lp.hasSufficientEvidence !== true) {
    throw new Error(`FAIL: Student 2 with completed diagnostic must have hasSufficientEvidence = true`);
  }
  console.log("  ✔ Verified Student 2 has full evidence constellation for Class 10.\n");

  // -------------------------------------------------------------
  // 3. Strict Multi-Tenant Isolation Audit
  // -------------------------------------------------------------
  console.log("MULTI-TENANT ISOLATION AUDIT:");
  console.log(`  Student 1 Nodes: ${s1Lp.nodes.map((n: any) => `[${n.type}: ${n.label}]`).join(" -> ")}`);
  console.log(`  Student 2 Nodes: ${s2Lp.nodes.map((n: any) => `[${n.type}: ${n.label}]`).join(" -> ")}`);

  // Check 1: Student 1 has NO Class 10 nodes
  const s1HasClass10 = s1Lp.nodes.some((n: any) => n.label.includes("Class 10") || n.title.includes("Class 10"));
  if (s1HasClass10) throw new Error("FAIL: Student 1 leaked Class 10 data from Student 2!");

  // Check 2: Student 2 has NO Class 7 nodes
  const s2HasClass7 = s2Lp.nodes.some((n: any) => n.label.includes("Class 7") || n.title.includes("Class 7"));
  if (s2HasClass7) throw new Error("FAIL: Student 2 leaked Class 7 data from Student 1!");

  // Check 3: Student IDs are completely distinct
  if (s1Lp.student.id === s2Lp.student.id) throw new Error("FAIL: Duplicate student IDs!");

  console.log("  ✔ Cross-tenant check passed: Zero data bleed between Class 7 and Class 10 students.\n");

  console.log("================================================================================");
  console.log(" 🎉 LEARNING PATH AUDIT & TWO-STUDENT ISOLATION PASSED WITH 100% SUCCESS!");
  console.log("================================================================================");
}

testLearningPathMultiStudent().catch(err => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
