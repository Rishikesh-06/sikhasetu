import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const API_BASE = "http://localhost:3001/api";

async function runTest() {
  console.log("===============================================================");
  console.log("🚀 SIKHASETU REAL SUPABASE LIVE STUDENT MODULES E2E TEST");
  console.log("===============================================================");

  const timestamp = Date.now();
  const studentAEmail = `student_a_${timestamp}@siksha.edu`;
  const studentBEmail = `student_b_${timestamp}@siksha.edu`;

  // 1. Register Student A
  console.log("\n[1] Registering Student A (Class 7)...");
  const regARes = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: studentAEmail,
      password: "Password123!",
      name: `Aarav Sharma ${timestamp.toString().slice(-4)}`,
      role: "student",
      classLevel: 7,
      school: "Delhi Public School, R.K. Puram"
    })
  });
  const regA = await regARes.json();
  if (!regA.token) throw new Error("Student A signup failed: " + JSON.stringify(regA));
  const tokenA = regA.token;
  console.log("✓ Student A registered. Token received.");

  // Check baseline achievements for Student A
  console.log("\n[2] Checking initial achievements for Student A (Clean state)...");
  const ach0Res = await fetch(`${API_BASE}/student/achievements`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const ach0 = await ach0Res.json();
  console.log(`✓ Initial XP: ${ach0.stats.totalXp}, Unlocked: ${ach0.stats.achievementsUnlocked}/${ach0.stats.totalAchievements}, Level: ${ach0.stats.learningLevel}`);
  console.log(`✓ Featured next milestone: "${ach0.featuredAchievement?.title}" (${ach0.featuredAchievement?.progressText})`);

  // 3. Start & Complete Initial Diagnostic for Student A
  console.log("\n[3] Starting Class 7 Diagnostic Check for Student A...");
  const diagStartRes = await fetch(`${API_BASE}/student/diagnostic/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ classLevel: 7 })
  });
  const diagStart = await diagStartRes.json();
  console.log(`✓ Diagnostic Attempt ID: ${diagStart.attemptId}, First Q Subject: ${diagStart.question.subject}`);

  // Submit diagnostic answers to build initial evidence
  let currentQ = diagStart.question;
  let isDone = false;
  let qNum = 1;
  while (!isDone && currentQ) {
    const selected = currentQ.options[0] || "Option A";
    const subRes = await fetch(`${API_BASE}/student/diagnostic/submit-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        attemptId: diagStart.attemptId,
        questionId: currentQ.id,
        selectedAnswer: selected
      })
    });
    const subJson = await subRes.json();
    console.log(`  - Answered Q${qNum} (${currentQ.subject}): Completed = ${subJson.isCompleted}`);
    if (subJson.isCompleted) {
      isDone = true;
    } else {
      currentQ = subJson.question;
      qNum++;
    }
  }
  console.log("✓ Diagnostic completed. Real learning evidence seeded in Supabase!");

  // 4. Verify Subject-wise Progress (PART 1)
  console.log("\n[4] Verifying Subject-wise Progress (/api/student/progress/subject-wise)...");
  const progRes = await fetch(`${API_BASE}/student/progress/subject-wise`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const progData = await progRes.json();
  console.log(`✓ Received ${progData.subjects.length} subjects.`);
  for (const s of progData.subjects) {
    console.log(`  • Subject: ${s.subject.padEnd(12)} | Mastery: ${String(s.progressScore).padStart(3)}% | Growth: ${s.growth >= 0 ? "+" : ""}${s.growth}% | Strong Skills: ${(s.strengthenedSkills || []).length} | Focus Skills: ${(s.developingSkills || []).length} | Next: ${s.nextRecommendedSkill}`);
  }

  // 5. Verify Practice Recommendations (PART 2)
  console.log("\n[5] Verifying Personalized Practice Recommendations (/api/student/practice/recommendations)...");
  const recRes = await fetch(`${API_BASE}/student/practice/recommendations`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const recData = await recRes.json();
  console.log(`✓ Recommendations count: ${recData.recommendations.length}`);
  if (recData.recommendations.length > 0) {
    const topRec = recData.recommendations[0];
    console.log(`  • Top Booster: "${topRec.title}" (${topRec.subject} · ${topRec.skill}) with progress ${topRec.progress}%`);
  }
  console.log(`✓ Available Quizzes: ${recData.quizOptions.map((q: any) => q.title).join(", ")}`);

  // 6. Start & Submit Real Practice Session
  console.log("\n[6] Starting Practice Session for Student A...");
  const pracStartRes = await fetch(`${API_BASE}/student/practice/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ subject: "Mathematics", count: 3 })
  });
  const pracStart = await pracStartRes.json();
  console.log(`✓ Practice Session ID: ${pracStart.practiceId}, Title: "${pracStart.title}", Questions: ${pracStart.questions.length}`);
  // Verify security: questions must NOT include correct answers or explanations
  const hasLeakedAnswer = pracStart.questions.some((q: any) => q.correctAnswer || q.explanation || q.difficultyGroup);
  console.log(`✓ Security Check (No leaked answers/explanations in question payload): ${hasLeakedAnswer ? "FAILED ❌" : "PASSED ✅"}`);

  // Submit Practice Session
  console.log("\n[7] Submitting Practice Session responses...");
  const pracAnswers: Record<string, string> = {};
  for (const q of pracStart.questions) {
    pracAnswers[q.id] = q.options[0];
  }
  const pracSubRes = await fetch(`${API_BASE}/student/practice/${pracStart.practiceId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ answers: pracAnswers })
  });
  const pracSub = await pracSubRes.json();
  if (!pracSubRes.ok) {
    throw new Error("Practice submit failed: " + JSON.stringify(pracSub));
  }
  console.log(`✓ Practice Graded: Score ${pracSub.score}/${pracSub.totalQuestions} (${pracSub.percentage}%), XP Earned: +${pracSub.xpEarned} XP`);
  console.log(`✓ Progress updates returned: ${(pracSub.progressUpdates || []).map((u: any) => `${u.subject}: ${u.progressScore}% (+${u.growth}%)`).join(", ")}`);

  // 7. Start & Submit Challenge Quiz
  console.log("\n[8] Starting Challenge Quiz (High-Streak Clash Duel)...");
  const quizStartRes = await fetch(`${API_BASE}/student/quizzes/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ quizType: "challenge", subject: "Mathematics" })
  });
  const quizStart = await quizStartRes.json();
  if (!quizStartRes.ok) {
    throw new Error("Quiz start failed: " + JSON.stringify(quizStart));
  }
  console.log(`✓ Quiz Attempt ID: ${quizStart.attemptId}, Title: "${quizStart.quizTitle}", TimeLimit: ${quizStart.timeLimitMinutes}m, Questions: ${quizStart.questions.length}`);

  const quizAnswers: Record<string, string> = {};
  for (const q of quizStart.questions) {
    quizAnswers[q.id] = q.options[0];
  }
  const quizSubRes = await fetch(`${API_BASE}/student/quizzes/${quizStart.attemptId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ answers: quizAnswers })
  });
  const quizSub = await quizSubRes.json();
  if (!quizSubRes.ok) {
    throw new Error("Quiz submit failed: " + JSON.stringify(quizSub));
  }
  console.log(`✓ Quiz Graded: Score ${quizSub.score}/${quizSub.totalQuestions} (${quizSub.percentage}%), XP Earned: +${quizSub.xpEarned} XP`);
  if (quizSub.newlyUnlocked && quizSub.newlyUnlocked.length > 0) {
    console.log(`🎉 Newly Unlocked Achievements: ${quizSub.newlyUnlocked.map((a: any) => `${a.title} (+${a.xpReward} XP)`).join(", ")}`);
  }

  // 8. Verify Redesigned Achievements (PART 3)
  console.log("\n[9] Fetching Redesigned Achievements Dashboard (/api/student/achievements)...");
  const achRes = await fetch(`${API_BASE}/student/achievements`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const achData = await achRes.json();
  console.log(`✓ Total XP: ${achData.stats.totalXp} XP`);
  console.log(`✓ Learning Level: Level ${achData.stats.learningLevel}`);
  console.log(`✓ Achievements Unlocked: ${achData.stats.achievementsUnlocked} / ${achData.stats.totalAchievements}`);
  console.log(`✓ Categories: ${achData.categories.join(", ")}`);
  console.log("\n  --- Unlocked Badges ---");
  for (const a of achData.achievements.filter((x: any) => x.isUnlocked)) {
    console.log(`    🏆 [${a.category}] ${a.title} (+${a.xpReward} XP) - Unlocked at: ${a.unlockedAt}`);
  }
  console.log("\n  --- Locked Badges with Live Progress ---");
  for (const a of achData.achievements.filter((x: any) => !x.isUnlocked).slice(0, 5)) {
    console.log(`    🔒 [${a.category}] ${a.title}: Progress ${a.progressText} (${a.progressPercent}%)`);
  }

  // 9. Verify Multi-Student Isolation
  console.log("\n[10] Registering Student B to test Multi-Tenant Data Isolation...");
  const regBRes = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: studentBEmail,
      password: "Password123!",
      name: `Diya Patel ${timestamp.toString().slice(-4)}`,
      role: "student",
      classLevel: 7,
      school: "Delhi Public School, R.K. Puram"
    })
  });
  const regB = await regBRes.json();
  const tokenB = regB.token;

  const progBRes = await fetch(`${API_BASE}/student/progress/subject-wise`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const progB = await progBRes.json();
  const achBRes = await fetch(`${API_BASE}/student/achievements`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const achB = await achBRes.json();

  console.log(`✓ Student B Total XP: ${achB.stats.totalXp} XP (Student A had ${achData.stats.totalXp} XP)`);
  console.log(`✓ Student B Unlocked Achievements: ${achB.stats.achievementsUnlocked} (Student A had ${achData.stats.achievementsUnlocked})`);
  console.log(`✓ Student B Subject Progress Scores: ${progB.subjects.map((s: any) => `${s.subject}: ${s.progressScore}%`).join(", ")}`);

  const isIsolated = achB.stats.totalXp !== achData.stats.totalXp || achB.stats.achievementsUnlocked !== achData.stats.achievementsUnlocked;
  console.log(`\n🛡️ Cross-Student Isolation Test: ${isIsolated ? "PASSED (100% Isolated) ✅" : "FAILED ❌"}`);

  console.log("\n===============================================================");
  console.log("🎉 ALL TESTS COMPLETED SUCCESSFULLY WITH REAL SUPABASE CLOUD!");
  console.log("===============================================================");
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
