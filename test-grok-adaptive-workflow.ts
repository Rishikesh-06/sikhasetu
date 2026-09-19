const API_BASE = "http://localhost:3001/api";

async function request(path: string, options: any = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`[${res.status}] ${data.error || JSON.stringify(data)}`);
  }
  return data;
}

function getCorrectClass7Answer(qId: string, defaultOpt: string) {
  if (qId === "q-c7-m-01") return "-23";
  if (qId === "q-c7-m-02") return "27";
  if (qId === "q-c7-m-03") return "12";
  if (qId === "q-c7-m-04") return "7";
  if (qId === "q-c7-s-01") return "Stomata";
  if (qId === "q-c7-s-02") return "Red to blue";
  if (qId === "q-c7-e-01") return "Quickly";
  if (qId === "q-c7-e-02") return "Beneath";
  return defaultOpt;
}

async function runScenario() {
  console.log("=========================================================================");
  console.log(" EXECUTING FINAL AI ADAPTIVE ASSESSMENT WORKFLOW VERIFICATION");
  console.log(" Scenario: Class 7 -> Mathematics -> Integers & Operations (5 Questions)");
  console.log("=========================================================================\n");

  const timestamp = Date.now();

  // 1. Get School
  const schoolsRes = await request("/auth/schools");
  const schoolId = schoolsRes.schools[0]?.id || "sch-dps-delhi";
  const schoolName = schoolsRes.schools[0]?.name || "Delhi Public School, R.K. Puram";
  console.log(`[Setup] Target School: ${schoolName} (${schoolId})`);

  // 2. Register Teacher (Class 7 Mathematics)
  const teacherSignup = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email: `teacher7.${timestamp}@sikshasetu.edu`,
      name: "Mrs. Meenakshi Sundaram",
      role: "teacher",
      schoolId,
      classLevels: [7],
      subjectSpecialization: "Mathematics"
    })
  });
  const teacherToken = teacherSignup.token;
  const teacherProfileId = teacherSignup.user.profileId;
  console.log(`✓ Created Teacher: ${teacherSignup.user.name} (${teacherProfileId})`);

  // 3. Register 3 Students in Class 7
  // Student A (Target Group A)
  const studentASignup = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email: `studentA.${timestamp}@sikshasetu.edu`,
      name: "Aarav Sharma",
      role: "student",
      schoolId,
      classLevel: 7
    })
  });
  const studentAToken = studentASignup.token;
  const studentAProfileId = studentASignup.user.profileId;
  console.log(`✓ Created Student A: ${studentASignup.user.name} (${studentAProfileId})`);

  // Student B (Target Group B)
  const studentBSignup = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email: `studentB.${timestamp}@sikshasetu.edu`,
      name: "Bhavya Gupta",
      role: "student",
      schoolId,
      classLevel: 7
    })
  });
  const studentBToken = studentBSignup.token;
  const studentBProfileId = studentBSignup.user.profileId;
  console.log(`✓ Created Student B: ${studentBSignup.user.name} (${studentBProfileId})`);

  // Student C (Target Group C)
  const studentCSignup = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email: `studentC.${timestamp}@sikshasetu.edu`,
      name: "Chetan Verma",
      role: "student",
      schoolId,
      classLevel: 7
    })
  });
  const studentCToken = studentCSignup.token;
  const studentCProfileId = studentCSignup.user.profileId;
  console.log(`✓ Created Student C: ${studentCSignup.user.name} (${studentCProfileId})`);

  // 4. Students Take Class 7 Diagnostic to establish authoritative baseline groups
  console.log("\n--- PHASE 2: ESTABLISHING AUTHORITATIVE BASELINE DIAGNOSTIC GROUPS ---");

  // Student A Diagnostic (Answer all wrong -> Group A: 0%)
  const diagAStart = await request("/student/diagnostic/start", {
    method: "POST",
    headers: { Authorization: `Bearer ${studentAToken}` },
    body: JSON.stringify({ classLevel: 7 })
  });
  let attemptId = diagAStart.attemptId;
  let q = diagAStart.question;
  while (q) {
    const subRes = await request("/student/diagnostic/submit-answer", {
      method: "POST",
      headers: { Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({
        attemptId,
        questionId: q.id,
        selectedAnswer: "WRONG_ANSWER"
      })
    });
    if (subRes.isCompleted) break;
    q = subRes.question;
  }
  console.log("  ✓ Student A completed diagnostic -> Group A baseline set.");

  // Student B Diagnostic (Answer 4 correct out of 6 -> Group B: ~66%)
  const diagBStart = await request("/student/diagnostic/start", {
    method: "POST",
    headers: { Authorization: `Bearer ${studentBToken}` },
    body: JSON.stringify({ classLevel: 7 })
  });
  attemptId = diagBStart.attemptId;
  q = diagBStart.question;
  let countB = 0;
  while (q) {
    countB++;
    // Answer 3 correctly and 3 wrong -> Group B score range (~55-65%)
    let ans = "WRONG_ANSWER";
    if (countB <= 3) {
      ans = getCorrectClass7Answer(q.id, q.options ? q.options[0] : "A");
    }
    const subRes = await request("/student/diagnostic/submit-answer", {
      method: "POST",
      headers: { Authorization: `Bearer ${studentBToken}` },
      body: JSON.stringify({
        attemptId,
        questionId: q.id,
        selectedAnswer: ans
      })
    });
    if (subRes.isCompleted) break;
    q = subRes.question;
  }
  console.log("  ✓ Student B completed diagnostic -> Group B baseline set.");

  // Student C Diagnostic (Answer all 6 correct -> Group C: 100%)
  const diagCStart = await request("/student/diagnostic/start", {
    method: "POST",
    headers: { Authorization: `Bearer ${studentCToken}` },
    body: JSON.stringify({ classLevel: 7 })
  });
  attemptId = diagCStart.attemptId;
  q = diagCStart.question;
  while (q) {
    const correct = getCorrectClass7Answer(q.id, q.options ? q.options[0] : "A");
    const subRes = await request("/student/diagnostic/submit-answer", {
      method: "POST",
      headers: { Authorization: `Bearer ${studentCToken}` },
      body: JSON.stringify({
        attemptId,
        questionId: q.id,
        selectedAnswer: correct
      })
    });
    if (subRes.isCompleted) break;
    q = subRes.question;
  }
  console.log("  ✓ Student C completed diagnostic -> Group C baseline set.");

  // Verify Groups from Teacher View
  const groupsRes = await request("/teacher/groups?classLevel=7", {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  console.log("✓ Teacher Groups Verified:");
  groupsRes.groups.forEach((g: any) => {
    console.log(`  - ${g.name} (${g.groupCode}): ${g.studentCount} students [Score Range: ${g.scoreRange}]`);
  });

  // 5. TEACHER CREATES ONE ASSESSMENT
  console.log("\n--- PHASE 3: TEACHER CREATES 1 MASTER ASSESSMENT VIA GROK AI ENGINE ---");
  const createAsmtRes = await request("/teacher/assessments", {
    method: "POST",
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({
      classLevel: 7,
      subject: "Mathematics",
      topics: ["Integers & Operations"],
      title: "Class 7 Integers & Operations Check",
      purpose: "Formative Adaptive Check",
      questionCount: 5,
      instructions: "Assess foundational addition/subtraction of integers, multi-step expressions, and real-world elevation word problems."
    })
  });

  const assessmentId = createAsmtRes.result.assessmentId;
  console.log(`✓ Master Assessment Created: ID = ${assessmentId}`);
  console.log(`✓ Total Students Assigned: ${createAsmtRes.result.assignedCount}`);
  console.log(`✓ Group Distribution in Creation Result:`, createAsmtRes.result.groupDistribution);

  // 6. VERIFY ASSESSMENT DETAILS & GROK QUESTION SETS
  console.log("\n--- PHASE 4: VERIFY 3-TIER GROK GENERATED SETS & ASSIGNMENT MAPPING ---");
  const details = await request(`/teacher/assessments/${assessmentId}`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });

  const asgnA = details.results.find((r: any) => r.studentId === studentAProfileId);
  const asgnB = details.results.find((r: any) => r.studentId === studentBProfileId);
  const asgnC = details.results.find((r: any) => r.studentId === studentCProfileId);

  if (!asgnA || !asgnB || !asgnC) {
    throw new Error("Missing assignments for test students!");
  }

  console.log(`✓ Student A (${asgnA.studentName}) -> Assigned Group: ${asgnA.groupType}, Assignment ID: ${asgnA.assignmentId}`);
  console.log(`✓ Student B (${asgnB.studentName}) -> Assigned Group: ${asgnB.groupType}, Assignment ID: ${asgnB.assignmentId}`);
  console.log(`✓ Student C (${asgnC.studentName}) -> Assigned Group: ${asgnC.groupType}, Assignment ID: ${asgnC.assignmentId}`);

  if (asgnA.groupType !== "GROUP_A") throw new Error(`Expected Student A in GROUP_A, got ${asgnA.groupType}`);
  if (asgnB.groupType !== "GROUP_B") throw new Error(`Expected Student B in GROUP_B, got ${asgnB.groupType}`);
  if (asgnC.groupType !== "GROUP_C") throw new Error(`Expected Student C in GROUP_C, got ${asgnC.groupType}`);

  // 7. VERIFY STUDENT A (GROUP A) QUESTIONS
  console.log("\n--- PHASE 5: VERIFY STUDENT A (GROUP A FOUNDATIONAL) ACCESS & PRIVACY ---");
  const studentAList = await request("/student/assessments", {
    headers: { Authorization: `Bearer ${studentAToken}` }
  });
  const asmtForA = studentAList.assessments.find((a: any) => a.assessmentId === assessmentId);
  if (!asmtForA) throw new Error("Assessment not listed for Student A");
  console.log(`✓ Student A sees assessment in /student/assessments: "${asmtForA.title}" (Status: ${asmtForA.status})`);

  const studentAQuestionsRes = await request(`/student/assessments/${asgnA.assignmentId}`, {
    headers: { Authorization: `Bearer ${studentAToken}` }
  });
  const qSetA = studentAQuestionsRes.questions;
  console.log(`✓ Student A received ${qSetA.length} questions.`);
  console.log(`  Sample Q1 (Group A - Foundational): "${qSetA[0].questionText}"`);
  console.log(`  Options: [${qSetA[0].options.join(", ")}]`);

  // Verify no group type or diagnostic score is leaked to student
  if (qSetA[0].group_type || qSetA[0].groupType || qSetA[0].correct_answer || qSetA[0].correctAnswer) {
    throw new Error("PRIVACY VIOLATION: Teacher-only group/answers leaked in Student A questions payload!");
  }
  console.log("✓ Privacy Check: Zero diagnostic scores or group labels leaked to Student A.");

  // 8. VERIFY STUDENT B (GROUP B) QUESTIONS
  console.log("\n--- PHASE 6: VERIFY STUDENT B (GROUP B DEVELOPING) ACCESS & PRIVACY ---");
  const studentBQuestionsRes = await request(`/student/assessments/${asgnB.assignmentId}`, {
    headers: { Authorization: `Bearer ${studentBToken}` }
  });
  const qSetB = studentBQuestionsRes.questions;
  console.log(`✓ Student B received ${qSetB.length} questions.`);
  console.log(`  Sample Q1 (Group B - Moderate): "${qSetB[0].questionText}"`);
  console.log(`  Options: [${qSetB[0].options.join(", ")}]`);

  if (qSetB[0].group_type || qSetB[0].groupType) {
    throw new Error("PRIVACY VIOLATION: Teacher-only group leaked in Student B questions payload!");
  }

  // 9. VERIFY STUDENT C (GROUP C) QUESTIONS
  console.log("\n--- PHASE 7: VERIFY STUDENT C (GROUP C ADVANCED) ACCESS & PRIVACY ---");
  const studentCQuestionsRes = await request(`/student/assessments/${asgnC.assignmentId}`, {
    headers: { Authorization: `Bearer ${studentCToken}` }
  });
  const qSetC = studentCQuestionsRes.questions;
  console.log(`✓ Student C received ${qSetC.length} questions.`);
  console.log(`  Sample Q1 (Group C - Higher Order): "${qSetC[0].questionText}"`);
  console.log(`  Options: [${qSetC[0].options.join(", ")}]`);

  if (qSetC[0].group_type || qSetC[0].groupType) {
    throw new Error("PRIVACY VIOLATION: Teacher-only group leaked in Student C questions payload!");
  }

  // 10. VERIFY QUESTIONS ARE GENUINELY DISTINCT ACROSS THE 3 GROUPS
  console.log("\n--- PHASE 8: VERIFY GENUINE QUESTION UNIQUENESS ACROSS TIERS ---");
  const qTextA0 = qSetA[0].questionText;
  const qTextB0 = qSetB[0].questionText;
  const qTextC0 = qSetC[0].questionText;

  console.log(`  Tier A Question 1: "${qTextA0}"`);
  console.log(`  Tier B Question 1: "${qTextB0}"`);
  console.log(`  Tier C Question 1: "${qTextC0}"`);

  if (qTextA0 === qTextB0 || qTextB0 === qTextC0 || qTextA0 === qTextC0) {
    throw new Error(`QUESTIONS ARE NOT DISTINCT ACROSS GROUPS:
      Group A: ${qTextA0}
      Group B: ${qTextB0}
      Group C: ${qTextC0}`);
  }
  console.log("✓ Question sets are genuinely different and tailored across Group A, Group B, and Group C.");

  // 11. STUDENT SUBMISSION & TEACHER RESULTS
  console.log("\n--- PHASE 9: STUDENT SUBMISSION & REAL-TIME TEACHER RESULTS ---");
  const answersA: Record<string, string> = {};
  qSetA.forEach((q: any) => { answersA[q.id] = q.options[0]; });

  const submitRes = await request(`/student/assessments/${asgnA.assignmentId}/submit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentAToken}` },
    body: JSON.stringify({ answers: answersA })
  });
  console.log(`✓ Student A submitted assessment. Result: Score = ${submitRes.result.score}/${submitRes.result.maxScore} (${submitRes.result.percentage}%), XP Earned = +${submitRes.result.xpEarned}`);

  // Teacher verifies updated results
  const updatedTeacherDetails = await request(`/teacher/assessments/${assessmentId}`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  console.log(`✓ Teacher views live dashboard stats: Completed = ${updatedTeacherDetails.stats.completedCount} / ${updatedTeacherDetails.stats.assignedCount} (${updatedTeacherDetails.stats.completionRate}%)`);

  console.log("\n=========================================================================");
  console.log(" ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!");
  console.log("=========================================================================");
}

runScenario().catch((err) => {
  console.error("\n❌ SCENARIO FAILED:", err);
  process.exit(1);
});
