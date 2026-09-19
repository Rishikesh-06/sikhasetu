import { query } from "./server/db";

const API_BASE = "http://localhost:3001/api";

async function runGoogleAuthTests() {
  console.log("=== STARTING GOOGLE AUTHENTICATION SYSTEM TESTS ===");

  const timestamp = Date.now();
  const testStudentEmail = `test.google.student.${timestamp}@gmail.com`;
  const testTeacherEmail = `test.google.teacher.${timestamp}@gmail.com`;
  const fakeGoogleUidStudent = `google-oauth2|stud-${timestamp}`;
  const fakeGoogleUidTeacher = `google-oauth2|teach-${timestamp}`;

  // Get an existing school from DB
  const schoolRes = await query("SELECT * FROM schools LIMIT 1");
  if (!schoolRes.rows || schoolRes.rows.length === 0) {
    throw new Error("No schools found in database. Please ensure database is seeded.");
  }
  const testSchool = schoolRes.rows[0];
  console.log(`[Setup] Using test school: ${testSchool.name} (${testSchool.id})`);

  // ==========================================
  // TEST 1: New Google Student Authentication Check
  // ==========================================
  console.log("\n--- TEST 1: New Student 'Continue with Google' Initial Request ---");
  const studentInitialRes = await fetch(`${API_BASE}/auth/google-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testStudentEmail,
      name: "Rishi Kumar",
      supabaseUserId: fakeGoogleUidStudent,
      role: "student"
    })
  });

  const studentInitialData = await studentInitialRes.json();
  console.log("Response:", studentInitialData);

  if (!studentInitialRes.ok || studentInitialData.isExistingUser !== false) {
    throw new Error(`Test 1 Failed: Expected isExistingUser = false, got ${JSON.stringify(studentInitialData)}`);
  }
  if (studentInitialData.email !== testStudentEmail || studentInitialData.name !== "Rishi Kumar") {
    throw new Error(`Test 1 Failed: Name/Email mismatch in response`);
  }
  console.log("✅ Test 1 Passed: New Google user verified without creating partial profile.");

  // ==========================================
  // TEST 2: Complete Student Onboarding with School & Class
  // ==========================================
  console.log("\n--- TEST 2: Complete Student Onboarding (SIKHASETU School + Class) ---");
  const studentSignupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testStudentEmail,
      name: "Rishi Kumar Google",
      role: "student",
      classLevel: 8,
      schoolId: testSchool.id,
      supabaseUserId: fakeGoogleUidStudent
    })
  });

  const studentSignupData = await studentSignupRes.json();
  console.log("Student Signup Response:", {
    user: studentSignupData.user?.email,
    role: studentSignupData.user?.role,
    classLevel: studentSignupData.user?.classLevel,
    school: studentSignupData.user?.school
  });

  if (!studentSignupRes.ok || studentSignupData.user?.role !== "student") {
    throw new Error(`Test 2 Failed: Student signup failed: ${JSON.stringify(studentSignupData)}`);
  }
  if (studentSignupData.user?.classLevel !== 8 || studentSignupData.user?.schoolId !== testSchool.id) {
    throw new Error(`Test 2 Failed: Student profile missing school or classLevel 8`);
  }

  // Verify in database student_profiles table
  const stdProfileRes = await query(
    `SELECT sp.* FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE u.email = $1`,
    [testStudentEmail]
  );
  if (stdProfileRes.rows.length !== 1 || stdProfileRes.rows[0].class_level !== 8) {
    throw new Error(`Test 2 Failed: student_profiles table not populated correctly in DB`);
  }
  console.log("✅ Test 2 Passed: Student profile created with verified Google identity and SIKHASETU school/class data.");

  // ==========================================
  // TEST 3: Existing Student Login with Google (Duplicate Prevention)
  // ==========================================
  console.log("\n--- TEST 3: Existing Student 'Continue with Google' Login ---");
  const studentLoginRes = await fetch(`${API_BASE}/auth/google-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testStudentEmail,
      name: "Rishi Changed Name",
      supabaseUserId: fakeGoogleUidStudent,
      role: "student"
    })
  });

  const studentLoginData = await studentLoginRes.json();
  console.log("Student Login Response:", {
    isExistingUser: studentLoginData.isExistingUser,
    user: studentLoginData.user?.email,
    name: studentLoginData.user?.name,
    classLevel: studentLoginData.user?.classLevel,
    token: !!studentLoginData.token
  });

  if (!studentLoginRes.ok || studentLoginData.isExistingUser !== true || !studentLoginData.token) {
    throw new Error(`Test 3 Failed: Existing user not recognized: ${JSON.stringify(studentLoginData)}`);
  }
  if (studentLoginData.user.name !== "Rishi Kumar Google") {
    throw new Error(`Test 3 Failed: SIKHASETU profile name was overwritten by Google metadata.`);
  }

  // Verify database has exactly 1 user and 1 profile
  const studentDbUsers = await query("SELECT * FROM users WHERE email = $1", [testStudentEmail]);
  if (studentDbUsers.rows.length !== 1) {
    throw new Error(`Test 3 Failed: Duplicate user created in DB. Count: ${studentDbUsers.rows.length}`);
  }
  console.log("✅ Test 3 Passed: Existing student logged in, JWT returned, duplicate profile prevented, existing name preserved.");

  // ==========================================
  // TEST 4: New Google Teacher Authentication Check & Onboarding
  // ==========================================
  console.log("\n--- TEST 4: New Teacher 'Continue with Google' and Full Onboarding ---");
  const teacherInitialRes = await fetch(`${API_BASE}/auth/google-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testTeacherEmail,
      name: "Prof. Ananya Sen",
      supabaseUserId: fakeGoogleUidTeacher,
      role: "teacher"
    })
  });

  const teacherInitialData = await teacherInitialRes.json();
  if (!teacherInitialRes.ok || teacherInitialData.isExistingUser !== false) {
    throw new Error(`Test 4 Failed: Expected teacher isExistingUser = false`);
  }

  const teacherSignupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testTeacherEmail,
      name: "Prof. Ananya Sen",
      role: "teacher",
      schoolId: testSchool.id,
      classLevels: [7, 9, 10],
      subjectSpecialization: "Mathematics & Science",
      supabaseUserId: fakeGoogleUidTeacher
    })
  });

  const teacherSignupData = await teacherSignupRes.json();
  console.log("Teacher Signup Response:", {
    user: teacherSignupData.user?.email,
    role: teacherSignupData.user?.role,
    school: teacherSignupData.user?.school
  });

  if (!teacherSignupRes.ok || teacherSignupData.user?.role !== "teacher") {
    throw new Error(`Test 4 Failed: Teacher signup failed: ${JSON.stringify(teacherSignupData)}`);
  }

  const teacherProfileRes = await query(
    `SELECT tp.* FROM teacher_profiles tp JOIN users u ON tp.user_id = u.id WHERE u.email = $1`,
    [testTeacherEmail]
  );
  if (teacherProfileRes.rows.length !== 1 || teacherProfileRes.rows[0].subject_specialization !== "Mathematics & Science") {
    throw new Error(`Test 4 Failed: Teacher profile not found or subject specialization mismatch in DB`);
  }
  console.log("✅ Test 4 Passed: Teacher profile and classrooms successfully created with Google identity.");

  // ==========================================
  // TEST 5: Existing Teacher Login with Google
  // ==========================================
  console.log("\n--- TEST 5: Existing Teacher 'Continue with Google' Login ---");
  const teacherLoginRes = await fetch(`${API_BASE}/auth/google-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testTeacherEmail,
      supabaseUserId: fakeGoogleUidTeacher,
      role: "teacher"
    })
  });

  const teacherLoginData = await teacherLoginRes.json();
  if (!teacherLoginRes.ok || teacherLoginData.isExistingUser !== true || teacherLoginData.user?.role !== "teacher") {
    throw new Error(`Test 5 Failed: Existing teacher login failed`);
  }

  const teacherDbUsers = await query("SELECT * FROM users WHERE email = $1", [testTeacherEmail]);
  if (teacherDbUsers.rows.length !== 1) {
    throw new Error(`Test 5 Failed: Duplicate teacher created in DB.`);
  }
  console.log("✅ Test 5 Passed: Existing teacher logged in seamlessly without duplicate records.");

  // ==========================================
  // TEST 6: Role Authoritativeness Protection
  // ==========================================
  console.log("\n--- TEST 6: Role Authoritativeness Check ---");
  // Try to authenticate the student email while setting requested role to 'teacher'
  const crossRoleRes = await fetch(`${API_BASE}/auth/google-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testStudentEmail,
      supabaseUserId: fakeGoogleUidStudent,
      role: "teacher" // mismatch with actual student role
    })
  });

  const crossRoleData = await crossRoleRes.json();
  console.log("Cross-role attempt response user role:", crossRoleData.user?.role);
  if (crossRoleData.user?.role !== "student") {
    throw new Error(`Test 6 Failed: Role was overridden by client request! Expected 'student', got ${crossRoleData.user?.role}`);
  }
  console.log("✅ Test 6 Passed: Database authoritative role 'student' preserved; cannot be manipulated by client.");

  console.log("\n==================================================");
  console.log("ALL 6 GOOGLE AUTHENTICATION INTEGRITY TESTS PASSED!");
  console.log("==================================================");
  process.exit(0);
}

runGoogleAuthTests().catch((err) => {
  console.error("❌ TEST RUNNER FAILED:", err);
  process.exit(1);
});
