async function runAITutorTests() {
  console.log("=================================================================");
  console.log(" REAL END-TO-END VERIFICATION: SIKHASETU AI TUTOR");
  console.log("=================================================================");

  const BASE_URL = "http://localhost:3001/api";

  // 1. Get Demo Accounts
  const demoRes = await fetch(`${BASE_URL}/auth/demo-accounts`);
  const demoData = await demoRes.json();
  const student1 = demoData.students.find((s: any) => s.email === "aarav@sikshasetu.edu") || demoData.students[0];
  const student2 = demoData.students.find((s: any) => s.email === "ananya@sikshasetu.edu") || demoData.students[1];
  const teacher = demoData.teachers[0];

  console.log(`\n1. Authenticating Student 1: ${student1.name} (${student1.email}) - Class ${student1.classLevel}`);
  const s1LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: student1.email, password: "password123" })
  });
  const s1Data = await s1LoginRes.json();
  const s1Token = s1Data.token;

  // 2. Test English Chat
  console.log("\n2. Testing AI Tutor Chat (English - Class 7 level)...");
  const enChatRes = await fetch(`${BASE_URL}/student/ai-tutor/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${s1Token}`
    },
    body: JSON.stringify({
      message: "Explain photosynthesis in simple words.",
      language: "en"
    })
  });
  const enChatData = await enChatRes.json();
  console.log(`   Response Status: ${enChatRes.status}`);
  console.log(`   Conversation ID: ${enChatData.conversationId}`);
  console.log(`   Model Used: ${enChatData.modelUsed || "Grok/Groq Engine"}`);
  console.log(`   AI Tutor Reply:\n   ${enChatData.reply?.slice(0, 200)}...`);

  if (!enChatData.success || !enChatData.reply) {
    throw new Error(`FAIL: English chat failed: ${JSON.stringify(enChatData)}`);
  }
  const convId = enChatData.conversationId;
  const enMsgId = enChatData.messageId;

  // 3. Test Conversational Follow-up (Memory)
  console.log("\n3. Testing Conversational Memory Follow-up...");
  const followUpRes = await fetch(`${BASE_URL}/student/ai-tutor/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${s1Token}`
    },
    body: JSON.stringify({
      message: "Explain the second part again with another example.",
      language: "en",
      conversationId: convId
    })
  });
  const followUpData = await followUpRes.json();
  console.log(`   Follow-up Status: ${followUpRes.status}`);
  console.log(`   Follow-up Reply:\n   ${followUpData.reply?.slice(0, 200)}...`);
  if (!followUpData.success || !followUpData.reply) {
    throw new Error(`FAIL: Follow-up memory chat failed: ${JSON.stringify(followUpData)}`);
  }

  // 4. Test Hindi Language (`hi`)
  console.log("\n4. Testing Multilingual Support (Hindi - हिंदी)...");
  const hiChatRes = await fetch(`${BASE_URL}/student/ai-tutor/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${s1Token}`
    },
    body: JSON.stringify({
      message: "पौधों में प्रकाश संश्लेषण (Photosynthesis) क्या होता है?",
      language: "hi"
    })
  });
  const hiChatData = await hiChatRes.json();
  console.log(`   Hindi Status: ${hiChatRes.status}`);
  console.log(`   Hindi Reply:\n   ${hiChatData.reply?.slice(0, 200)}...`);
  if (!hiChatData.success || !hiChatData.reply) {
    throw new Error(`FAIL: Hindi chat failed: ${JSON.stringify(hiChatData)}`);
  }

  // 5. Test Telugu Language (`te`)
  console.log("\n5. Testing Multilingual Support (Telugu - తెలుగు)...");
  const teChatRes = await fetch(`${BASE_URL}/student/ai-tutor/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${s1Token}`
    },
    body: JSON.stringify({
      message: "కిరణజన్య సంయోగక్రియ అంటే ఏమిటి? సులభంగా వివరించండి.",
      language: "te"
    })
  });
  const teChatData = await teChatRes.json();
  console.log(`   Telugu Status: ${teChatRes.status}`);
  console.log(`   Telugu Reply:\n   ${teChatData.reply?.slice(0, 200)}...`);
  if (!teChatData.success || !teChatData.reply) {
    throw new Error(`FAIL: Telugu chat failed: ${JSON.stringify(teChatData)}`);
  }

  // 6. Test Text-to-Speech (TTS) endpoint
  console.log("\n6. Testing Text-to-Speech (TTS) Endpoint...");
  const ttsRes = await fetch(`${BASE_URL}/student/ai-tutor/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${s1Token}`
    },
    body: JSON.stringify({
      text: enChatData.reply.slice(0, 150),
      language: "en",
      messageId: enMsgId
    })
  });
  const ttsData = await ttsRes.json();
  console.log(`   TTS Status: ${ttsRes.status}`);
  console.log(`   TTS Audio Payload Type: ${ttsData.format}, Cached: ${ttsData.cached}`);
  if (!ttsData.success || !ttsData.audioUrl) {
    throw new Error(`FAIL: TTS endpoint failed: ${JSON.stringify(ttsData)}`);
  }

  // 7. Test Conversation Listing and Details
  console.log("\n7. Testing Conversation Persistence & History Loading...");
  const convListRes = await fetch(`${BASE_URL}/student/ai-tutor/conversations`, {
    headers: { Authorization: `Bearer ${s1Token}` }
  });
  const convListData = await convListRes.json();
  console.log(`   Student 1 has ${convListData.conversations?.length} conversations.`);

  const convDetailRes = await fetch(`${BASE_URL}/student/ai-tutor/conversations/${convId}`, {
    headers: { Authorization: `Bearer ${s1Token}` }
  });
  const convDetailData = await convDetailRes.json();
  console.log(`   Conversation "${convDetailData.conversation?.title}" has ${convDetailData.messages?.length} messages.`);
  if (!convDetailData.messages || convDetailData.messages.length < 2) {
    throw new Error("FAIL: Conversation messages were not persisted correctly!");
  }

  // 8. Test Student Isolation (Student 2 cannot access Student 1's conversation)
  console.log("\n8. Testing Multi-Tenant Student Isolation (Security Check)...");
  const s2LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: student2.email, password: "password123" })
  });
  const s2Data = await s2LoginRes.json();
  const s2Token = s2Data.token;

  const s2UnauthorizedRes = await fetch(`${BASE_URL}/student/ai-tutor/conversations/${convId}`, {
    headers: { Authorization: `Bearer ${s2Token}` }
  });
  console.log(`   Student 2 access to Student 1 conversation HTTP Status: ${s2UnauthorizedRes.status}`);
  if (s2UnauthorizedRes.status !== 404 && s2UnauthorizedRes.status !== 403) {
    throw new Error(`SECURITY FAIL: Student 2 accessed Student 1's conversation! Status: ${s2UnauthorizedRes.status}`);
  }
  console.log("   ✔ Multi-tenant isolation verified: Student 2 cannot access Student 1's conversation.");

  // 9. Test Role & Auth Protection
  console.log("\n9. Testing Role & Authentication Protection...");
  const noAuthRes = await fetch(`${BASE_URL}/student/ai-tutor/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Test" })
  });
  console.log(`   Unauthenticated access HTTP Status: ${noAuthRes.status} (Expected 401)`);
  if (noAuthRes.status !== 401) {
    throw new Error(`SECURITY FAIL: Unauthenticated request was not rejected with 401! Got ${noAuthRes.status}`);
  }

  const tLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: teacher.email, password: "password123" })
  });
  const tData = await tLoginRes.json();
  const teacherChatRes = await fetch(`${BASE_URL}/student/ai-tutor/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tData.token}`
    },
    body: JSON.stringify({ message: "Test from teacher" })
  });
  console.log(`   Teacher access to Student AI Tutor HTTP Status: ${teacherChatRes.status} (Expected 403)`);
  if (teacherChatRes.status !== 403) {
    throw new Error(`SECURITY FAIL: Teacher role was not rejected with 403 on student AI tutor! Got ${teacherChatRes.status}`);
  }
  console.log("   ✔ Role and token authentication strictly enforced.");

  console.log("\n=================================================================");
  console.log(" ✔ ALL AI TUTOR FEATURES, LOCALIZATION & SECURITY CHECKS PASSED!");
  console.log("=================================================================");
}

runAITutorTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
