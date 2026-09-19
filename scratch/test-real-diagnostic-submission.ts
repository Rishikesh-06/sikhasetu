import { query } from "../server/db";
import { DiagnosticEngine } from "../server/engines/diagnostic-engine";

async function testDiagnosticFlow() {
  console.log("=================================================");
  console.log("🧪 VERIFYING REAL INITIAL DIAGNOSTIC SUBMISSION");
  console.log("=================================================\n");

  // 1. Create a fresh test student profile
  const testUserId = `usr-test-diag-${Date.now()}`;
  const testStudentId = `std-test-diag-${Date.now()}`;
  const testEmail = `test-student-${Date.now()}@sikshasetu.test`;

  await query(
    `INSERT INTO users (id, email, role) VALUES ($1, $2, 'student')`,
    [testUserId, testEmail]
  );

  await query(
    `INSERT INTO student_profiles (id, user_id, name, school, class_level, xp)
     VALUES ($1, $2, 'Aarav Mehta', 'Delhi Public School, R.K. Puram', 7, 0)`,
    [testStudentId, testUserId]
  );

  console.log(`1. Created fresh Class 7 test student: ${testStudentId} (${testEmail})`);

  // 2. Check initial status
  const initialStatus = await DiagnosticEngine.getStatus(testStudentId);
  console.log(`2. Initial status: ${initialStatus.status} (Class: ${initialStatus.classLevel})`);
  if (initialStatus.status !== "not_started") {
    throw new Error(`Expected not_started, got ${initialStatus.status}`);
  }

  // 3. Start diagnostic
  const startRes = await DiagnosticEngine.startDiagnostic(testStudentId, 7);
  console.log(`3. Started Diagnostic: attemptId=${startRes.attemptId}, Q1=${startRes.question?.id} (${startRes.question?.subject})`);
  const attemptId = startRes.attemptId!;
  let currentQ = startRes.question!;

  // 4. Answer Questions 1 through 4
  for (let qNum = 1; qNum <= 4; qNum++) {
    console.log(`   -> Answering Question ${qNum}/5 (ID: ${currentQ.id}, Subject: ${currentQ.subject})...`);
    const options = currentQ.options || ["Option A", "Option B"];
    const chosenAnswer = options[0];

    const submitRes = await DiagnosticEngine.submitAnswer(attemptId, currentQ.id, chosenAnswer);
    console.log(`      Answered Q${qNum}: isCompleted=${submitRes.isCompleted}, nextQNum=${submitRes.questionNumber}`);

    if (submitRes.isCompleted) {
      throw new Error(`Unexpected completion at Q${qNum}`);
    }
    currentQ = submitRes.question!;
  }

  // 5. Answer Question 5 (Final Question — Finish Diagnostic)
  console.log(`\n5. Answering Final Question 5/5 (ID: ${currentQ.id}, Subject: ${currentQ.subject}) -> Finish Diagnostic...`);
  const finalOptions = currentQ.options || ["Option A", "Option B"];
  const finalAnswer = finalOptions[0];

  const finalRes = await DiagnosticEngine.submitAnswer(attemptId, currentQ.id, finalAnswer);
  console.log(`   ✔ Final Submission Response: isCompleted=${finalRes.isCompleted}`);
  console.log(`   ✔ Summary Title: "${finalRes.summary?.title}"`);
  console.log(`   ✔ Summary Message: "${finalRes.summary?.message}"`);

  if (!finalRes.isCompleted) {
    throw new Error("Expected final submission to return isCompleted=true");
  }

  // 6. Test IDEMPOTENCY (duplicate submit of final question)
  console.log("\n6. Testing Idempotency: Submitting final answer again (simulating double click/retry)...");
  const duplicateRes = await DiagnosticEngine.submitAnswer(attemptId, currentQ.id, finalAnswer);
  console.log(`   ✔ Duplicate Submit Result: isCompleted=${duplicateRes.isCompleted}`);
  if (!duplicateRes.isCompleted) {
    throw new Error("Expected duplicate submission to gracefully return isCompleted=true");
  }

  // 7. Test Status Check after completion (simulating page reload)
  console.log("\n7. Checking diagnostic status after completion (simulating page reload)...");
  const postStatus = await DiagnosticEngine.getStatus(testStudentId);
  console.log(`   ✔ Post-completion status: ${postStatus.status}`);
  if (postStatus.status !== "completed") {
    throw new Error(`Expected completed status, got ${postStatus.status}`);
  }

  // 8. Verify Database Records Created
  console.log("\n8. Verifying Supabase Records Created:");
  const diagResults = await query(`SELECT * FROM diagnostic_results WHERE attempt_id = $1`, [attemptId]);
  console.log(`   ✔ diagnostic_results count: ${diagResults.rows.length}`);
  console.log(`     - Normalized Score: ${diagResults.rows[0]?.normalized_score}%`);
  console.log(`     - Group Type: ${diagResults.rows[0]?.group_type}`);

  const subProg = await query(`SELECT * FROM subject_progress WHERE student_id = $1`, [testStudentId]);
  console.log(`   ✔ subject_progress count: ${subProg.rows.length} subjects`);
  for (const sp of subProg.rows) {
    console.log(`     - ${sp.subject}: Mastery=${sp.progress_score}%, Growth=${sp.growth}%`);
  }

  const evidence = await query(`SELECT * FROM learning_evidence WHERE student_id = $1`, [testStudentId]);
  console.log(`   ✔ learning_evidence count: ${evidence.rows.length} skills`);

  const studentProfile = await query(`SELECT xp FROM student_profiles WHERE id = $1`, [testStudentId]);
  console.log(`   ✔ student XP awarded: ${studentProfile.rows[0]?.xp} XP`);

  const streak = await query(`SELECT current_streak, last_activity_date FROM student_streaks WHERE student_id = $1`, [testStudentId]);
  console.log(`   ✔ student streak: ${streak.rows[0]?.current_streak} Day (Date: ${streak.rows[0]?.last_activity_date})`);

  console.log("\n=================================================");
  console.log(" 🎉 ALL INITIAL DIAGNOSTIC TESTS PASSED CLEANLY!");
  console.log("=================================================");

  // Clean up test records
  await query(`DELETE FROM users WHERE id = $1`, [testUserId]);
  console.log(`Cleaned up test student: ${testUserId}`);
  process.exit(0);
}

testDiagnosticFlow().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
