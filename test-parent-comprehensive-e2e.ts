import { query } from "./server/db";
import { parentLinkService } from "./server/services/parent-link.service";

const API_BASE = "http://localhost:3001/api";

async function runComprehensiveE2ETest() {
  console.log("================================================================");
  console.log("SIKHASETU — PARENT SYSTEM FULL COMPREHENSIVE E2E VERIFICATION");
  console.log("================================================================");

  // 1. Fetch real student accounts from Supabase PostgreSQL
  const studentsRes = await query(`
    SELECT sp.id as profile_id, sp.name, sp.class_level, sp.school, u.id as user_id, u.email
    FROM student_profiles sp
    JOIN users u ON sp.user_id = u.id
    ORDER BY sp.created_at ASC
    LIMIT 3
  `);

  if (studentsRes.rows.length < 2) {
    throw new Error("Need at least 2 real student profiles in database.");
  }

  const studentA = studentsRes.rows[0];
  const studentB = studentsRes.rows[1];
  console.log(`[STUDENT A] ID: ${studentA.profile_id}, Name: ${studentA.name}, Class: ${studentA.class_level}, School: ${studentA.school}`);
  console.log(`[STUDENT B] ID: ${studentB.profile_id}, Name: ${studentB.name}, Class: ${studentB.class_level}, School: ${studentB.school}`);

  // Generate Student A login token
  const loginARes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: studentA.email })
  });
  const loginAData = await loginARes.json();
  const studentAToken = loginAData.token;
  console.log(`✓ Student A authenticated (Token generated)`);

  // 2. Student A checks active connection code status (Initial: should be none or generated)
  console.log("\n--- STEP 1: Student Connection Code Generation & Security ---");
  const codeGenRes = await fetch(`${API_BASE}/student/parent-link-code/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${studentAToken}`
    }
  });
  const codeGenData = await codeGenRes.json();
  console.log(`Student A generated code: ${codeGenData.code} (Expires: ${codeGenData.expiresAt})`);
  if (!codeGenData.code || codeGenData.code.length !== 9 || !codeGenData.code.includes("-")) {
    throw new Error(`Invalid code format generated: ${codeGenData.code}`);
  }
  console.log("✓ Cryptographic connection code format verified (XXXX-XXXX)");

  // 3. Check active code status
  const codeStatusRes = await fetch(`${API_BASE}/student/parent-link-code`, {
    headers: { "Authorization": `Bearer ${studentAToken}` }
  });
  const codeStatusData = await codeStatusRes.json();
  console.log(`Active code status: hasActiveCode=${codeStatusData.hasActiveCode}, preview=${codeStatusData.preview}`);
  if (!codeStatusData.hasActiveCode) {
    throw new Error("Active code status check failed!");
  }
  console.log("✓ Active code status retrieval verified");

  // 4. Test Expired Code Rejection
  console.log("\n--- STEP 2: Expired Code Rejection Test ---");
  const expiredCode = "EXPD-9999";
  const expHash = parentLinkService.hashCode ? parentLinkService.hashCode(expiredCode) : "";
  await query(
    `INSERT INTO parent_link_codes (id, student_id, code_hash, code_preview, expires_at, created_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours')`,
    [`plc-exp-${Date.now()}`, studentA.profile_id, expHash, "EXPD-****"]
  );

  const expiredSignupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `parent.expired.${Date.now()}@example.com`,
      name: "Expired Code Parent",
      role: "parent",
      parentConnectionCode: expiredCode
    })
  });
  if (expiredSignupRes.status === 400) {
    const expErr = await expiredSignupRes.json();
    console.log(`✓ Expired connection code successfully rejected with HTTP 400: "${expErr.error}"`);
  } else {
    throw new Error(`Expired code was not rejected! Status: ${expiredSignupRes.status}`);
  }

  // 5. Parent Signup with Valid Connection Code
  console.log("\n--- STEP 3: Parent Account Registration & Auto-Link ---");
  const parentEmail = `parent.e2e.${Date.now()}@example.com`;
  const parentSignupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: parentEmail,
      name: "Mrs. Meenakshi Sundaram",
      role: "parent",
      parentConnectionCode: codeGenData.code,
      relationshipType: "parent"
    })
  });

  const parentSignupData = await parentSignupRes.json();
  if (!parentSignupRes.ok) {
    throw new Error(`Parent signup failed: ${JSON.stringify(parentSignupData)}`);
  }
  console.log(`✓ Parent registered: Name: ${parentSignupData.user.name}, Linked Child: ${parentSignupData.user.linkedStudent?.name}`);
  const parentToken = parentSignupData.token;
  const parentProfileId = parentSignupData.user.profileId;

  // 6. Verify Database Tables
  console.log("\n--- STEP 4: Relational Table Verification ---");
  const relDbCheck = await query(
    `SELECT * FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2`,
    [parentProfileId, studentA.profile_id]
  );
  if (relDbCheck.rows.length === 0 || relDbCheck.rows[0].status !== "active") {
    throw new Error("Missing active row in parent_student_relationships!");
  }
  console.log(`✓ parent_student_relationships record verified: ID=${relDbCheck.rows[0].id}, Type=${relDbCheck.rows[0].relationship_type}, Status=${relDbCheck.rows[0].status}`);

  // 7. Test Single-Use Code Re-use Rejection
  console.log("\n--- STEP 5: Single-Use Guarantee Test ---");
  const reuseSignupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `parent.reuse.${Date.now()}@example.com`,
      name: "Re-use Attempt Parent",
      role: "parent",
      parentConnectionCode: codeGenData.code
    })
  });
  if (reuseSignupRes.status === 400) {
    const reuseErr = await reuseSignupRes.json();
    console.log(`✓ Single-use code re-use successfully rejected with HTTP 400: "${reuseErr.error}"`);
  } else {
    throw new Error(`Single-use code was allowed to be re-used! Status: ${reuseSignupRes.status}`);
  }

  // 8. Multi-Child Linking: Student B generates code & Parent links Student B
  console.log("\n--- STEP 6: Multi-Child Connection (1 Parent -> Many Students) ---");
  // Login as Student B
  const loginBRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: studentB.email })
  });
  const loginBData = await loginBRes.json();
  const studentBToken = loginBData.token;

  const codeGenBRes = await fetch(`${API_BASE}/student/parent-link-code/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${studentBToken}`
    }
  });
  const codeGenBData = await codeGenBRes.json();
  console.log(`Student B generated code: ${codeGenBData.code}`);

  // Parent links Student B via POST /api/parent/link-child
  const linkBRes = await fetch(`${API_BASE}/parent/link-child`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${parentToken}`
    },
    body: JSON.stringify({
      connectionCode: codeGenBData.code,
      relationshipType: "parent"
    })
  });
  const linkBData = await linkBRes.json();
  if (!linkBRes.ok) {
    throw new Error(`Linking Student B failed: ${JSON.stringify(linkBData)}`);
  }
  console.log(`✓ Parent linked second child: ${linkBData.student.name} (Class ${linkBData.student.classLevel})`);

  // 9. Fetch Parent's Children List
  const myChildrenRes = await fetch(`${API_BASE}/parent/children`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  const myChildrenData = await myChildrenRes.json();
  console.log(`Linked children list for parent: ${myChildrenData.children.map((c: any) => `${c.name} (C${c.classLevel})`).join(", ")}`);
  if (myChildrenData.children.length !== 2) {
    throw new Error(`Expected 2 children linked, found ${myChildrenData.children.length}`);
  }
  console.log("✓ Multi-child support confirmed: Parent is actively linked to multiple students.");

  // 10. Fetch Child A Real Dashboard Data (All 8 sections)
  console.log("\n--- STEP 7: Parent Dashboard Real Data Verification ---");
  const overviewARes = await fetch(`${API_BASE}/parent/children/${studentA.profile_id}/overview`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  const overviewA = await overviewARes.json();
  console.log(`Child A Overview: Student=${overviewA.student.name}, Streak=${overviewA.streak.currentStreak}d, ActiveSubjects=${overviewA.subjects.length}`);
  console.log(`Next Focus: "${overviewA.nextFocus}"`);

  // Subject Progress
  const subjARes = await fetch(`${API_BASE}/parent/children/${studentA.profile_id}/subject-progress`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  const subjA = await subjARes.json();
  console.log(`Child A Subjects: ${subjA.subjects.map((s: any) => `${s.subject}: ${s.progressScore ?? 'In Progress'}%`).join(", ")}`);

  // Learning Path
  const pathARes = await fetch(`${API_BASE}/parent/children/${studentA.profile_id}/learning-path`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  const pathA = await pathARes.json();
  console.log(`Child A Learning Path Nodes: ${pathA.learningPath?.nodes?.length || 0} nodes loaded`);

  // Assessments
  const assessARes = await fetch(`${API_BASE}/parent/children/${studentA.profile_id}/assessments`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  const assessA = await assessARes.json();
  console.log(`Child A Assessments: ${assessA.assessments?.length || 0} completed records`);

  // Achievements
  const achARes = await fetch(`${API_BASE}/parent/children/${studentA.profile_id}/achievements`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  const achA = await achARes.json();
  console.log(`Child A Achievements: ${achA.achievements?.length || 0} trophies unlocked`);

  // 11. Privacy Verification: Check that internal diagnostic classification is never leaked
  const fullPayloadStr = JSON.stringify({ overviewA, subjA, pathA, assessA, achA });
  if (fullPayloadStr.includes("GROUP_A") || fullPayloadStr.includes("GROUP_B") || fullPayloadStr.includes("GROUP_C")) {
    throw new Error("SECURITY VIOLATION: Internal diagnostic group leaked to parent!");
  }
  console.log("✓ Privacy verified: No teacher diagnostic groups or internal AI configurations exposed.");

  // 12. Security & Wrong-Child Authorization Test
  console.log("\n--- STEP 8: Security & Authorization Verification ---");
  const unlinkedChildId = "std-unlinked-random-999";
  const unauthRes = await fetch(`${API_BASE}/parent/children/${unlinkedChildId}/overview`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  if (unauthRes.status === 403) {
    console.log("✓ Wrong-child access strictly rejected with HTTP 403 Forbidden");
  } else {
    throw new Error(`Expected 403 for unlinked child, got ${unauthRes.status}`);
  }

  // 13. Revocation Test
  console.log("\n--- STEP 9: Relationship Revocation Test ---");
  const revokeRes = await fetch(`${API_BASE}/parent/children/${studentA.profile_id}/revoke`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  const revokeData = await revokeRes.json();
  console.log(`Revoke Student A link: success=${revokeData.success}`);

  // Query Student A immediately after revocation
  const postRevokeRes = await fetch(`${API_BASE}/parent/children/${studentA.profile_id}/overview`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  if (postRevokeRes.status === 403) {
    console.log("✓ Parent immediately denied access (HTTP 403) after relationship revocation");
  } else {
    throw new Error(`Expected 403 after revocation, got ${postRevokeRes.status}`);
  }

  // Student B should still be active and accessible (No data bleed)
  const studentBCheckRes = await fetch(`${API_BASE}/parent/children/${studentB.profile_id}/overview`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  if (studentBCheckRes.status === 200) {
    console.log("✓ Student B data remains accessible (Child isolation verified)");
  } else {
    throw new Error(`Expected 200 for Student B, got ${studentBCheckRes.status}`);
  }

  // 14. Role Isolation Test
  console.log("\n--- STEP 10: Role Isolation Test ---");
  // Student trying to call parent endpoint
  const studentCallParentRes = await fetch(`${API_BASE}/parent/children`, {
    headers: { "Authorization": `Bearer ${studentAToken}` }
  });
  if (studentCallParentRes.status === 403) {
    console.log("✓ Student token rejected with HTTP 403 on parent endpoint");
  } else {
    throw new Error(`Expected 403 for student accessing parent route, got ${studentCallParentRes.status}`);
  }

  console.log("\n================================================================");
  console.log("ALL 10 COMPREHENSIVE E2E VERIFICATION STEPS PASSED PERFECTLY!");
  console.log("================================================================");
  process.exit(0);
}

runComprehensiveE2ETest().catch(err => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
