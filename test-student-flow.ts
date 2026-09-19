import { query } from "./server/db";

async function runTest() {
  console.log("=== Testing Student Assessment Flow End-to-End ===");

  const BASE_URL = "http://localhost:3001/api";

  // 1. Get demo accounts
  const demoRes = await fetch(`${BASE_URL}/auth/demo-accounts`);
  const demoData = await demoRes.json();
  const teacher = demoData.teachers[0];
  const student = demoData.students[0];

  console.log(`Teacher: ${teacher.name} (${teacher.email})`);
  console.log(`Student: ${student.name} (${student.email})`);

  // 2. Login Teacher
  const tLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: teacher.email, password: "password123" })
  });
  const tLoginData = await tLoginRes.json();
  const tToken = tLoginData.token;
  console.log("Teacher login successful.");

  // Get Teacher Classrooms
  const clsRes = await fetch(`${BASE_URL}/teacher/classrooms`, {
    headers: { Authorization: `Bearer ${tToken}` }
  });
  const clsData = await clsRes.json();
  let classroom = clsData.classrooms.find((c: any) => (c.classLevel || c.class_level) === 6);
  if (!classroom) {
    classroom = clsData.classrooms[0];
  }
  const classroomId = classroom.id || classroom.classroomId;
  const classroomLevel = classroom.classLevel || classroom.class_level || 6;
  console.log(`Using Classroom: Class ${classroomLevel} - ${classroom.section} (${classroomId})`);

  // 3. Teacher creates assessment: Class 6 -> English -> Reading Comprehension -> 3 Questions
  console.log("\n--- Creating Teacher Assessment ---");
  const createRes = await fetch(`${BASE_URL}/teacher/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tToken}`
    },
    body: JSON.stringify({
      classroomId: classroomId,
      classLevel: classroomLevel,
      title: `Class ${classroomLevel} Reading Comprehension Quick Check`,
      subject: "English",
      topics: ["Reading Comprehension"],
      questionCount: 3,
      purpose: "Formative Check"
    })
  });

  const createData = await createRes.json();
  const assessmentId = createData.result?.assessmentId || createData.result?.assessment?.id || createData.assessmentId || createData.assessment?.id;
  console.log("Assessment created:", createData.success, assessmentId);
  if (!assessmentId) {
    throw new Error(`Failed to retrieve assessment ID: ${JSON.stringify(createData)}`);
  }

  // 4. Login Student
  console.log("\n--- Student Flow ---");
  const sLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: student.email, password: "password123" })
  });
  const sLoginData = await sLoginRes.json();
  const sToken = sLoginData.token;
  console.log("Student login successful.");

  // 5. Student fetches assessments
  const sAssessRes = await fetch(`${BASE_URL}/student/assessments`, {
    headers: { Authorization: `Bearer ${sToken}` }
  });
  const sAssessData = await sAssessRes.json();
  console.log(`Student has ${sAssessData.assessments.length} assessments.`);

  const targetAssignment = sAssessData.assessments.find((a: any) => a.assessmentId === assessmentId) || sAssessData.assessments[0];
  if (!targetAssignment) {
    throw new Error("No assignment found for student!");
  }
  console.log(`Found assignment: ${targetAssignment.assignmentId} (Status: ${targetAssignment.status})`);
  console.log(`Question Count: ${targetAssignment.questionCount}`);

  // 6. Student opens assessment (GET /api/student/assessments/:assignmentId)
  console.log("\n--- Fetching Assessment Questions ---");
  const sDetailRes = await fetch(`${BASE_URL}/student/assessments/${targetAssignment.assignmentId}`, {
    headers: { Authorization: `Bearer ${sToken}` }
  });
  const sDetailData = await sDetailRes.json();
  console.log(`Assessment Title: ${sDetailData.title}`);
  console.log(`Status after opening: ${sDetailData.status}`);
  console.log(`Number of questions returned: ${sDetailData.questions?.length}`);

  if (!sDetailData.questions || sDetailData.questions.length === 0) {
    throw new Error("FAIL: Questions array is empty!");
  }

  // Verify privacy: correct_answer, explanation, group_type must NOT exist before submission
  for (const [idx, q] of sDetailData.questions.entries()) {
    console.log(`\nQ${idx + 1}: ${q.questionText}`);
    console.log(`Options (${q.options?.length}):`, q.options);
    if ((q as any).correct_answer || (q as any).correctAnswer || (q as any).explanation || (q as any).group_type) {
      throw new Error(`FAIL: Question metadata leak detected before submission on Q${idx + 1}!`);
    }
  }
  console.log("\n✔ Privacy check passed: zero answers/explanations exposed before submission.");

  // 7. Student answers all questions and submits
  console.log("\n--- Submitting Assessment ---");
  const answers: Record<string, string> = {};
  for (const q of sDetailData.questions) {
    answers[q.id] = q.options[0] || "A";
  }

  const submitRes = await fetch(`${BASE_URL}/student/assessments/${targetAssignment.assignmentId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sToken}`
    },
    body: JSON.stringify({ answers })
  });
  const submitData = await submitRes.json();
  console.log("Submission response:", submitData);

  if (!submitData.success) {
    throw new Error(`FAIL: Submit failed: ${JSON.stringify(submitData)}`);
  }
  console.log(`✔ Score: ${submitData.result.score} / ${submitData.result.maxScore} (${submitData.result.percentage}%)`);
  console.log(`✔ XP Earned: ${submitData.result.xpEarned}`);

  // 8. Verify status is submitted
  const sReviewRes = await fetch(`${BASE_URL}/student/assessments/${targetAssignment.assignmentId}`, {
    headers: { Authorization: `Bearer ${sToken}` }
  });
  const sReviewData = await sReviewRes.json();
  console.log(`Status after submission: ${sReviewData.status}`);
  if (sReviewData.status !== "submitted") {
    throw new Error(`FAIL: Expected status submitted, got ${sReviewData.status}`);
  }
  console.log("✔ Status correctly updated to submitted.");

  // 9. Test duplicate submission prevention
  console.log("\n--- Testing Duplicate Submission Prevention ---");
  const pBeforeRes = await fetch(`${BASE_URL}/student/profile`, {
    headers: { Authorization: `Bearer ${sToken}` }
  });
  const pBeforeData = await pBeforeRes.json();
  const xpBefore = pBeforeData.student.xp;

  const dupSubmitRes = await fetch(`${BASE_URL}/student/assessments/${targetAssignment.assignmentId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sToken}`
    },
    body: JSON.stringify({ answers })
  });
  const dupSubmitData = await dupSubmitRes.json();
  const pAfterRes = await fetch(`${BASE_URL}/student/profile`, {
    headers: { Authorization: `Bearer ${sToken}` }
  });
  const pAfterData = await pAfterRes.json();
  const xpAfter = pAfterData.student.xp;

  console.log(`XP before second submit: ${xpBefore}, XP after second submit: ${xpAfter}`);
  if (xpAfter !== xpBefore) {
    throw new Error("FAIL: Duplicate submission awarded duplicate XP!");
  }
  console.log("✔ Duplicate submission prevented duplicate XP reward.");

  console.log("\n=== ALL E2E CHECKS PASSED SUCCESSFULLY ===");
}

runTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
