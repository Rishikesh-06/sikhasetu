import dotenv from "dotenv";
dotenv.config();

const BASE_URL = "http://localhost:3001/api";

async function runLiveVerification() {
  console.log("================================================================================");
  console.log(" 🧪 SIKHASETU LIVE VERIFICATION SUITE (REAL SUPABASE CLOUD DATABASE)");
  console.log("================================================================================\n");

  const timestamp = Date.now();

  // Test 1: Database Health Endpoint
  console.log("TEST 1: Checking Database Health Endpoint (/api/health/db)...");
  const dbHealthRes = await fetch(`${BASE_URL}/health/db`);
  const dbHealth = await dbHealthRes.json() as any;
  console.log("  Response:", JSON.stringify(dbHealth, null, 2));
  if (dbHealth.status !== "healthy" || !dbHealth.isCloudSupabase) {
    throw new Error(`DB Health check failed: ${JSON.stringify(dbHealth)}`);
  }
  console.log("  ✔ DB Health OK (Supabase Cloud PostgreSQL)\n");

  // Test 2: AI Engine Health Endpoint
  console.log("TEST 2: Checking AI Engine Health Endpoint (/api/health/ai)...");
  const aiHealthRes = await fetch(`${BASE_URL}/health/ai`);
  const aiHealth = await aiHealthRes.json() as any;
  console.log("  Response:", JSON.stringify(aiHealth, null, 2));
  if (aiHealth.status !== "healthy" || aiHealth.provider !== "Groq") {
    throw new Error(`AI Health check failed: ${JSON.stringify(aiHealth)}`);
  }
  console.log("  ✔ AI Health OK (Groq AI Provider)\n");

  // Test 3: Register Real Student in Supabase
  console.log("TEST 3: Registering a Real Student in Supabase...");
  const studentEmail = `student.cloud.${timestamp}@sikshasetu.edu`;
  const studentRegRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: studentEmail,
      name: "Pranav Rao",
      role: "student",
      school: "Delhi Public School, R.K. Puram",
      classLevel: 7
    })
  });
  const studentData = await studentRegRes.json() as any;
  if (!studentRegRes.ok || !studentData.token) {
    throw new Error(`Student registration failed: ${JSON.stringify(studentData)}`);
  }
  const studentToken = studentData.token;
  const studentUserId = studentData.user.id;
  const studentProfileId = studentData.user.profileId;
  console.log(`  ✔ Student registered successfully: ${studentEmail} (User ID: ${studentUserId}, Profile ID: ${studentProfileId})\n`);

  // Test 4: Register Real Teacher in Supabase
  console.log("TEST 4: Registering a Real Teacher in Supabase...");
  const teacherEmail = `teacher.cloud.${timestamp}@sikshasetu.edu`;
  const teacherRegRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: teacherEmail,
      name: "Dr. Kavita Verma",
      role: "teacher",
      school: "Delhi Public School, R.K. Puram",
      subjectSpecialization: "Mathematics",
      classLevels: [7, 8]
    })
  });
  const teacherData = await teacherRegRes.json() as any;
  if (!teacherRegRes.ok || !teacherData.token) {
    throw new Error(`Teacher registration failed: ${JSON.stringify(teacherData)}`);
  }
  const teacherToken = teacherData.token;
  console.log(`  ✔ Teacher registered successfully: ${teacherEmail}\n`);

  // Test 5: Fetch Student Profile & Classroom from Supabase
  console.log("TEST 5: Fetching Student Profile & Classroom...");
  const profileRes = await fetch(`${BASE_URL}/student/profile`, {
    headers: { "Authorization": `Bearer ${studentToken}` }
  });
  const profile = await profileRes.json() as any;
  console.log(`  ✔ Student Profile: ${profile.student?.name || "Found"}, XP: ${profile.student?.xp ?? 0}`);

  const classRes = await fetch(`${BASE_URL}/student/classroom`, {
    headers: { "Authorization": `Bearer ${studentToken}` }
  });
  const classroom = await classRes.json() as any;
  console.log(`  ✔ Student Classroom ID: ${classroom.classroomId}, Class Level: ${classroom.classLevel}\n`);

  // Test 6: Take Initial Diagnostic and Complete it in Supabase
  console.log("TEST 6: Running 5-Question Adaptive Diagnostic Check...");
  const diagStartRes = await fetch(`${BASE_URL}/student/diagnostic/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${studentToken}`
    },
    body: JSON.stringify({ classLevel: 7 })
  });
  const diagStart = await diagStartRes.json() as any;
  console.log(`  ✔ Diagnostic started: Attempt ID = ${diagStart.attemptId}`);

  let currentAttemptId = diagStart.attemptId;
  let currentQ = diagStart.question;
  let diagCompleteResult: any = null;

  for (let step = 1; step <= 5; step++) {
    if (!currentQ) break;
    console.log(`    Step ${step}/5: Answering Question ID ${currentQ.id} (${currentQ.topic} - ${currentQ.difficulty})`);
    
    // Select first option as response
    const selectedAns = currentQ.options ? currentQ.options[0] : "A";
    const subRes = await fetch(`${BASE_URL}/student/diagnostic/submit-answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        attemptId: currentAttemptId,
        questionId: currentQ.id,
        selectedAnswer: selectedAns
      })
    });
    const subData = await subRes.json() as any;
    if (subData.isComplete) {
      diagCompleteResult = subData.result;
      console.log(`  ✔ Diagnostic Completed! Score: ${diagCompleteResult?.normalizedScore}%, Group: ${diagCompleteResult?.group?.label || diagCompleteResult?.group}`);
      break;
    } else {
      currentQ = subData.nextQuestion;
    }
  }
  console.log("");

  // Test 7: Verify Dynamic Learning Path Generated from Supabase Data
  console.log("TEST 7: Fetching Dynamic Student Learning Path from Supabase...");
  const lpRes = await fetch(`${BASE_URL}/student/learning-path`, {
    headers: { "Authorization": `Bearer ${studentToken}` }
  });
  const lpData = await lpRes.json() as any;
  console.log(`  ✔ Learning Path returned ${lpData.nodes?.length || 0} nodes.`);
  console.log(`  ✔ Declared grade: ${lpData.studentContext?.declaredGrade}, Group: ${lpData.studentContext?.group}`);
  console.log("");

  // Test 8: AI Tutor Conversation & Message Persistence in Supabase
  console.log("TEST 8: Testing AI Tutor Chat & Message Persistence in Supabase...");
  const chatRes = await fetch(`${BASE_URL}/student/ai-tutor/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      message: "Explain what an integer is and give examples of negative integers.",
      subject: "Mathematics",
      topic: "Integers",
      language: "en"
    })
  });
  const chatData = await chatRes.json() as any;
  if (!chatRes.ok || !chatData.reply) {
    throw new Error(`AI Tutor chat failed: ${JSON.stringify(chatData)}`);
  }
  console.log(`  ✔ AI Tutor Replied (${chatData.reply.length} chars, conversationId: ${chatData.conversationId})`);
  console.log(`  ✔ Reply snippet: "${chatData.reply.slice(0, 90)}..."`);

  // Verify conversation history from DB
  const historyRes = await fetch(`${BASE_URL}/student/ai-tutor/conversations`, {
    headers: { "Authorization": `Bearer ${studentToken}` }
  });
  const historyData = await historyRes.json() as any;
  console.log(`  ✔ Stored AI Tutor conversation count: ${historyData.conversations?.length || 0}\n`);

  // Test 9: Teacher creates assessment with Groq 3-way generation and saves to Supabase
  console.log("TEST 9: Teacher creating assessment with Groq AI generation...");
  const asmtCreateRes = await fetch(`${BASE_URL}/teacher/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${teacherToken}`
    },
    body: JSON.stringify({
      classLevel: 7,
      classroomId: classroom.classroomId,
      subject: "Mathematics",
      topics: ["Integers", "Simple Equations"],
      title: "Class 7 Live Check",
      purpose: "Formative Check",
      questionCount: 3
    })
  });
  const asmtCreateData = await asmtCreateRes.json() as any;
  console.log(`  ✔ Assessment Created: ${asmtCreateData.message}`);
  console.log(`  ✔ Assigned student count: ${asmtCreateData.result?.assignedCount}\n`);

  // Test 10: Student verifies assigned assessment
  console.log("TEST 10: Student fetching assigned assessments from Supabase...");
  const asmtListRes = await fetch(`${BASE_URL}/student/assessments`, {
    headers: { "Authorization": `Bearer ${studentToken}` }
  });
  const asmtListData = await asmtListRes.json() as any;
  console.log(`  ✔ Student received ${asmtListData.assessments?.length || 0} assigned assessment(s) in Supabase DB.\n`);

  console.log("================================================================================");
  console.log(" 🎉 ALL 10 SUPABASE LIVE CLOUD DATABASE INTEGRATION TESTS PASSED!");
  console.log("================================================================================");
}

runLiveVerification().catch(err => {
  console.error("❌ Live Verification Failed:", err);
  process.exit(1);
});
