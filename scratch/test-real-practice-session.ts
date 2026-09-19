import { query } from "../server/db";
import { PracticeEngine } from "../server/engines/practice-engine";

async function testPracticeFlow() {
  console.log("=================================================");
  console.log("🧪 TESTING REAL PRACTICE SESSION & QUESTION TEXT");
  console.log("=================================================\n");

  // 1. Create a test student profile
  const testUserId = `usr-test-prac-${Date.now()}`;
  const testStudentId = `std-test-prac-${Date.now()}`;
  const testEmail = `test-prac-${Date.now()}@sikshasetu.test`;

  await query(
    `INSERT INTO users (id, email, role) VALUES ($1, $2, 'student')`,
    [testUserId, testEmail]
  );

  await query(
    `INSERT INTO student_profiles (id, user_id, name, school, class_level, xp)
     VALUES ($1, $2, 'Kabir Verma', 'Delhi Public School, R.K. Puram', 7, 0)`,
    [testStudentId, testUserId]
  );

  console.log(`1. Created test student: ${testStudentId}`);

  // 2. Fetch practice recommendations
  const recs = await PracticeEngine.getRecommendations(testStudentId);
  console.log(`2. Generated ${recs.length} practice recommendations:`);
  for (const r of recs) {
    console.log(`   - [${r.subject}] ${r.title} (Skill: "${r.skill}")`);
  }

  // 3. Start Practice for "Mathematics · One-step Equations"
  console.log("\n3. Starting Practice Session for 'Mathematics · One-step Equations'...");
  const session = await PracticeEngine.startPracticeSession(testStudentId, {
    subject: "Mathematics",
    topic: "Simple Equations",
    skill: "One-step Equations"
  });

  console.log(`   ✔ Practice Session ID: ${session.sessionId}`);
  console.log(`   ✔ Title: "${session.title}"`);
  console.log(`   ✔ Subject: "${session.subject}"`);
  console.log(`   ✔ Skill: "${session.skill}"`);
  console.log(`   ✔ Total Questions Returned: ${session.questions.length}`);

  if (session.questions.length === 0) {
    throw new Error("❌ No questions returned for practice session!");
  }

  // 4. Inspect Questions & verify questionText is non-empty and options match
  console.log("\n4. Verifying Question Text, Options & Security Sanitization:");
  const answers: Record<string, string> = {};

  for (let i = 0; i < session.questions.length; i++) {
    const q = session.questions[i];
    console.log(`\n   --- Question ${i + 1} of ${session.questions.length} ---`);
    console.log(`   ID: ${q.id}`);
    console.log(`   Subject/Topic/Skill: ${q.subject} / ${q.topic} / ${q.skill}`);
    console.log(`   questionText: "${q.questionText}"`);
    console.log(`   text alias: "${q.text}"`);
    console.log(`   Options (${q.options.length}): ${JSON.stringify(q.options)}`);

    // Verify questionText is NOT blank
    if (!q.questionText || q.questionText.trim() === "") {
      throw new Error(`❌ Question ${i + 1} (ID: ${q.id}) has BLANK questionText!`);
    }

    // Verify options exist
    if (!Array.isArray(q.options) || q.options.length < 2) {
      throw new Error(`❌ Question ${i + 1} (ID: ${q.id}) has invalid options!`);
    }

    // Verify Security: correct_answer & explanation must NOT be present
    if ((q as any).correct_answer || (q as any).correctAnswer || (q as any).explanation) {
      throw new Error(`❌ Security violation: Question payload leaked answers/explanations!`);
    }

    // Pick first option as answer
    answers[q.id] = q.options[0];
  }

  // 5. Submit practice session and verify grading
  console.log("\n5. Submitting Practice Session answers to server for grading...");
  const submitResult = await PracticeEngine.submitPracticeSession(testStudentId, session.sessionId, answers);
  console.log(`   ✔ Score: ${submitResult.score} / ${submitResult.maxScore} (${submitResult.percentage}%)`);
  console.log(`   ✔ XP Earned: +${submitResult.xpEarned} XP`);
  console.log(`   ✔ Skill Evidence Updated: "${submitResult.skillUpdated.skill}" -> Mastery: ${submitResult.skillUpdated.newMastery}% (${submitResult.skillUpdated.status})`);
  console.log(`   ✔ Graded Responses: ${submitResult.responses.length} items`);

  for (const resp of submitResult.responses) {
    console.log(`     - [${resp.isCorrect ? "CORRECT" : "INCORRECT"}] ${resp.questionText.slice(0, 40)}... (Student: "${resp.selectedAnswer}", Correct: "${resp.correctAnswer}")`);
  }

  // 6. Test a DIFFERENT Subject & Skill: "Science · Photosynthesis Process"
  console.log("\n6. Testing DIFFERENT Skill: 'Science · Photosynthesis Process'...");
  const scienceSession = await PracticeEngine.startPracticeSession(testStudentId, {
    subject: "Science",
    topic: "Nutrition in Plants",
    skill: "Photosynthesis Process"
  });

  console.log(`   ✔ Science Practice Title: "${scienceSession.title}"`);
  console.log(`   ✔ Questions count: ${scienceSession.questions.length}`);
  console.log(`   ✔ Q1 text: "${scienceSession.questions[0].questionText}"`);
  console.log(`   ✔ Q1 options: ${JSON.stringify(scienceSession.questions[0].options)}`);

  if (!scienceSession.questions[0].questionText) {
    throw new Error("❌ Science question text is blank!");
  }

  // 7. Verify Database Persistence for Student
  console.log("\n7. Verifying DB State in Supabase:");
  const profileAfter = await query(`SELECT xp FROM student_profiles WHERE id = $1`, [testStudentId]);
  console.log(`   ✔ Total student XP in DB: ${profileAfter.rows[0]?.xp} XP`);

  const evidenceInDb = await query(`SELECT * FROM learning_evidence WHERE student_id = $1`, [testStudentId]);
  console.log(`   ✔ Learning evidence records in DB: ${evidenceInDb.rows.length}`);
  for (const ev of evidenceInDb.rows) {
    console.log(`     - ${ev.subject} / ${ev.skill}: ${ev.mastery_score}% (${ev.status})`);
  }

  console.log("\n=================================================");
  console.log(" 🎉 ALL PRACTICE QUESTION TESTS PASSED CLEANLY!");
  console.log("=================================================");

  // Clean up
  await query(`DELETE FROM users WHERE id = $1`, [testUserId]);
  console.log(`Cleaned up test user: ${testUserId}`);
  process.exit(0);
}

testPracticeFlow().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
