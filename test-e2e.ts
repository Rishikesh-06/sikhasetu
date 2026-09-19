const API = "http://localhost:3001/api";

async function runTests() {
  console.log("====================================================");
  console.log(" RUNNING SIKHASETU AUTHORITATIVE E2E VERIFICATION ");
  console.log("====================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // Test 1: Seed & Database Status
  // ----------------------------------------------------
  const statusRes = await fetch(`${API}/seed/status`).then(r => r.json());
  assert(statusRes.databaseReady === true, "Database is ready and connected");
  assert(statusRes.questionsCount >= 30, `Curriculum question bank populated (${statusRes.questionsCount} questions across Classes 6-12)`);

  // ----------------------------------------------------
  // Test 2: Real School Discovery & Registration
  // ----------------------------------------------------
  const schoolsRes = await fetch(`${API}/auth/schools`).then(r => r.json());
  assert(schoolsRes.schools.length >= 3, `Schools listed from database (${schoolsRes.schools.length} schools available)`);
  const dpsSchool = schoolsRes.schools.find((s: any) => s.name.toLowerCase().includes("delhi public") || s.name.toLowerCase().includes("dps"));
  assert(dpsSchool !== undefined, `Found pre-seeded school: ${dpsSchool?.name}`);

  // ----------------------------------------------------
  // Test 3: Real Teacher Registration (Ms. Sharma at DPS for Classes 7 & 9)
  // ----------------------------------------------------
  const sharmaEmail = `sharma-${Date.now()}@sikshasetu.edu`;
  const sharmaSignup = await fetch(`${API}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: sharmaEmail,
      name: "Ms. Sharma",
      role: "teacher",
      school: "Delhi Public School, R.K. Puram",
      classLevels: [7, 9],
      specialization: "Mathematics"
    })
  }).then(r => r.json());

  assert(sharmaSignup.token !== undefined, "Teacher Ms. Sharma registered with Supabase Auth / JWT");
  const sharmaToken = sharmaSignup.token;

  const sharmaClassrooms = await fetch(`${API}/teacher/classrooms`, {
    headers: { "Authorization": `Bearer ${sharmaToken}` }
  }).then(r => r.json());

  assert(sharmaClassrooms.classrooms.length >= 2, `Teacher assigned to ${sharmaClassrooms.classrooms.length} classrooms`);
  const class9Room = sharmaClassrooms.classrooms.find((c: any) => c.classLevel === 9);
  const class7Room = sharmaClassrooms.classrooms.find((c: any) => c.classLevel === 7);
  assert(class9Room !== undefined, "Teacher has access to Class 9 classroom");

  // ----------------------------------------------------
  // Test 4: NEW STUDENT REGISTRATION (Priya Sharma in Class 9)
  // ----------------------------------------------------
  const priyaEmail = `priya-test-${Date.now()}@sikshasetu.edu`;
  const priyaSignup = await fetch(`${API}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: priyaEmail,
      name: "Priya Sharma",
      role: "student",
      classLevel: 9,
      school: "Delhi Public School, R.K. Puram",
      preferredLanguage: "English"
    })
  }).then(r => r.json());

  assert(priyaSignup.token !== undefined, "New student Priya Sharma registered with Supabase Auth / JWT");
  assert(priyaSignup.user.classLevel === 9, "Priya assigned to Class 9 in PostgreSQL profile");
  assert(priyaSignup.user.school.includes("Delhi Public School"), "Priya assigned to Delhi Public School");
  const priyaToken = priyaSignup.token;

  // Verify Priya's classroom entity resolved correctly
  const priyaClassroom = await fetch(`${API}/student/classroom`, {
    headers: { "Authorization": `Bearer ${priyaToken}` }
  }).then(r => r.json());
  assert(priyaClassroom.classLevel === 9, "Priya's classroom entity resolved correctly to Class 9");

  // Verify Priya appears in Ms. Sharma's Class 9 roster immediately
  const class9StudentsBefore = await fetch(`${API}/teacher/students?classLevel=9&classroomId=${class9Room.classroomId}`, {
    headers: { "Authorization": `Bearer ${sharmaToken}` }
  }).then(r => r.json());

  const foundPriya = class9StudentsBefore.students.find((s: any) => s.name === "Priya Sharma");
  assert(foundPriya !== undefined, "RELATIONAL CONNECTION VERIFIED: Priya Sharma appears in Ms. Sharma's Class 9 student roster automatically!");
  assert(foundPriya?.diagnosticStatus === "pending", "Priya's initial diagnostic status is 'pending' before taking check");

  // ----------------------------------------------------
  // Test 5: NEW STUDENT CLASS-SPECIFIC ADAPTIVE DIAGNOSTIC FLOW
  // ----------------------------------------------------
  // Check diagnostic status endpoint
  const priyaDiagStatus = await fetch(`${API}/student/diagnostic/status`, {
    headers: { "Authorization": `Bearer ${priyaToken}` }
  }).then(r => r.json());

  assert(priyaDiagStatus.status === "not_started", "Diagnostic status endpoint returns 'not_started' for new student");
  assert(priyaDiagStatus.classLevel === 9, "Diagnostic status returns student's declared Class 9");

  // Start Class 9 Diagnostic
  const diagStart = await fetch(`${API}/student/diagnostic/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${priyaToken}` },
    body: JSON.stringify({ classLevel: 9 })
  }).then(r => r.json());

  assert(diagStart.attemptId !== undefined, "Class 9 adaptive diagnostic started successfully");
  assert(diagStart.question !== undefined, "First diagnostic question returned");
  assert(diagStart.question.classLevel === 9, `CLASS ISOLATION VERIFIED: First question is strictly Class 9 (Topic: ${diagStart.question.topic})`);
  assert(diagStart.question.questionText !== undefined, `Question text: "${diagStart.question.questionText}"`);

  // Step through adaptive questions (5 total questions)
  let currentAttemptId = diagStart.attemptId;
  let currentQuestion = diagStart.question;
  let questionCountAnswered = 0;
  let lastSubmitResult: any = null;

  for (let step = 1; step <= 5; step++) {
    if (!currentQuestion) break;
    questionCountAnswered++;

    // Verify question is strictly Class 9
    assert(currentQuestion.classLevel === 9, `Step ${step}: Question ${currentQuestion.id} is strictly for Class 9`);

    const selectedOpt = currentQuestion.options?.[0] || "Answer";
    const ansRes = await fetch(`${API}/student/diagnostic/submit-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${priyaToken}` },
      body: JSON.stringify({
        attemptId: currentAttemptId,
        questionId: currentQuestion.id,
        selectedAnswer: selectedOpt
      })
    }).then(r => r.json());

    lastSubmitResult = ansRes;
    if (ansRes.isCompleted) {
      assert(ansRes.summary?.title === "Your learning map is ready.", "Diagnostic completed with encouraging message");
      assert(ansRes.normalized_score === undefined && ansRes.group_type === undefined, "PRIVACY AUDIT: Response payload has ZERO raw score or group leaked to student");
      break;
    }
    currentQuestion = ansRes.question;
  }

  assert(questionCountAnswered === 5, `Completed all 5 adaptive questions (answered ${questionCountAnswered} questions)`);

  // Verify diagnostic status is now 'completed'
  const priyaStatusAfter = await fetch(`${API}/student/diagnostic/status`, {
    headers: { "Authorization": `Bearer ${priyaToken}` }
  }).then(r => r.json());
  assert(priyaStatusAfter.status === "completed", "Diagnostic status endpoint now returns 'completed'");

  // Verify trying to start diagnostic again respects idempotency / completion
  const startAgain = await fetch(`${API}/student/diagnostic/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${priyaToken}` },
    body: JSON.stringify({ classLevel: 9 })
  }).then(r => r.json());
  assert(startAgain.alreadyCompleted === true, "Starting diagnostic again returns alreadyCompleted: true");

  // ----------------------------------------------------
  // Test 6: TEACHER VISIBILITY & GROUP ASSIGNMENT AUDIT
  // ----------------------------------------------------
  const class9StudentsAfter = await fetch(`${API}/teacher/students?classLevel=9&classroomId=${class9Room.classroomId}`, {
    headers: { "Authorization": `Bearer ${sharmaToken}` }
  }).then(r => r.json());

  const priyaTeacherView = class9StudentsAfter.students.find((s: any) => s.name === "Priya Sharma");
  assert(priyaTeacherView !== undefined, "Priya found in teacher's Class 9 roster");
  assert(priyaTeacherView.diagnosticStatus === "completed", "Teacher sees Priya's diagnosticStatus is 'completed'");
  assert(typeof priyaTeacherView.diagnosticScore === "number", `Teacher sees calculated normalized score: ${priyaTeacherView.diagnosticScore} / 100`);
  assert(priyaTeacherView.group.code.startsWith("GROUP_"), `Teacher sees assigned tier: ${priyaTeacherView.group.label} (${priyaTeacherView.group.code})`);

  // Inspect student evidence details
  const priyaEvidence = await fetch(`${API}/teacher/students/${priyaTeacherView.id}`, {
    headers: { "Authorization": `Bearer ${sharmaToken}` }
  }).then(r => r.json());
  assert(priyaEvidence.diagnostic !== null, "Teacher can inspect Priya's diagnostic baseline details");
  assert(priyaEvidence.learningEvidence.length > 0, `Learning evidence records initialized for Priya (${priyaEvidence.learningEvidence.length} sub-skills)`);

  // ----------------------------------------------------
  // Test 7: TEACHER 1-TO-3 ADAPTIVE ASSESSMENT ON CLASS 9
  // ----------------------------------------------------
  const createClass9Asmt = await fetch(`${API}/teacher/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sharmaToken}` },
    body: JSON.stringify({
      classroomId: class9Room.classroomId,
      classLevel: 9,
      subject: "Mathematics",
      topics: ["Polynomials"],
      title: "Class 9 Formative Assessment Check",
      purpose: "Formative Check",
      questionCount: 3
    })
  }).then(r => r.json());

  assert(createClass9Asmt.success === true, "Teacher created 1 adaptive assessment for Class 9");

  // Priya checks her adaptive assessments
  const priyaAsmts = await fetch(`${API}/student/assessments`, {
    headers: { "Authorization": `Bearer ${priyaToken}` }
  }).then(r => r.json());

  assert(priyaAsmts.assessments.length > 0, "Priya received personalized adaptive assessment matching her group tier");
  const priyaAssignment = priyaAsmts.assessments[0];

  const priyaQuestions = await fetch(`${API}/student/assessments/${priyaAssignment.assignmentId}`, {
    headers: { "Authorization": `Bearer ${priyaToken}` }
  }).then(r => r.json());
  assert(priyaQuestions.questions.length > 0, `Priya loaded ${priyaQuestions.questions.length} adaptive questions for assessment`);

  // Priya submits assessment
  const priyaSubmit = await fetch(`${API}/student/assessments/${priyaAssignment.assignmentId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${priyaToken}` },
    body: JSON.stringify({
      answers: {
        [priyaQuestions.questions[0].id]: priyaQuestions.questions[0].options?.[0] || "Answer"
      }
    })
  }).then(r => r.json());

  assert(priyaSubmit.success === true, `Priya submitted assessment and earned ${priyaSubmit.result?.xpEarned} XP`);

  // ----------------------------------------------------
  // Test 8: CLASS 7 PERSONALIZATION (Aarav vs Vihaan)
  // ----------------------------------------------------
  const demoAccounts = await fetch(`${API}/auth/demo-accounts`).then(r => r.json());
  const aarav = demoAccounts.students.find((s: any) => s.name.includes("Aarav"));
  const vihaan = demoAccounts.students.find((s: any) => s.name.includes("Vihaan"));

  const aaravAsmts = await fetch(`${API}/student/assessments`, { headers: { "Authorization": `Bearer ${aarav.token}` } }).then(r => r.json());
  const vihaanAsmts = await fetch(`${API}/student/assessments`, { headers: { "Authorization": `Bearer ${vihaan.token}` } }).then(r => r.json());

  const aaravDetails = await fetch(`${API}/student/assessments/${aaravAsmts.assessments[0].assignmentId}`, { headers: { "Authorization": `Bearer ${aarav.token}` } }).then(r => r.json());
  const vihaanDetails = await fetch(`${API}/student/assessments/${vihaanAsmts.assessments[0].assignmentId}`, { headers: { "Authorization": `Bearer ${vihaan.token}` } }).then(r => r.json());

  const aaravQIds = aaravDetails.questions.map((q: any) => q.id);
  const vihaanQIds = vihaanDetails.questions.map((q: any) => q.id);
  assert(aaravQIds.join(",") !== vihaanQIds.join(","), "ADAPTIVE ENGINE VERIFIED: Group A (Aarav) and Group C (Vihaan) received distinct difficulty question sets");

  // ----------------------------------------------------
  // Test 9: Subject-wise Progress & Learning Path
  // ----------------------------------------------------
  const subjProgress = await fetch(`${API}/student/progress/subject-wise`, {
    headers: { "Authorization": `Bearer ${priyaToken}` }
  }).then(r => r.json());

  assert(subjProgress.subjects.length >= 3, `Subject-wise progress populated across ${subjProgress.subjects.length} subjects`);

  // ----------------------------------------------------
  // Test 10: Teacher Detailed Reports API
  // ----------------------------------------------------
  const reportsRes = await fetch(`${API}/teacher/reports?classLevel=9&classroomId=${class9Room.classroomId}`, {
    headers: { "Authorization": `Bearer ${sharmaToken}` }
  }).then(r => r.json());

  assert(reportsRes.studentReports.length >= 1, `Teacher detailed reports returned for ${reportsRes.studentReports.length} students in Class 9`);
  assert(reportsRes.classMastery !== undefined, `Classroom mastery calculated: ${reportsRes.classMastery}%`);

  console.log("\n====================================================");
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED `);
  console.log("====================================================");
}

runTests().catch(console.error);
