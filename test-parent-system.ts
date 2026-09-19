import { query } from "./server/db";
import { parentLinkService, createRandomConnectionCode, hashCode } from "./server/services/parent-link.service";

const API_BASE = "http://localhost:3001/api";

async function runTests() {
  console.log("=========================================");
  console.log("STARTING PARENT SYSTEM INTEGRATION TESTS");
  console.log("=========================================");

  // 1. Get or create two real test students
  const stdRes = await query(`SELECT sp.id, sp.name, u.email FROM student_profiles sp JOIN users u ON sp.user_id = u.id LIMIT 2`);
  if (stdRes.rows.length < 2) {
    console.error("Need at least 2 students in the database to test multi-child and isolation.");
    process.exit(1);
  }

  const studentA = stdRes.rows[0];
  const studentB = stdRes.rows[1];
  console.log(`Student A: ${studentA.name} (${studentA.id})`);
  console.log(`Student B: ${studentB.name} (${studentB.id})`);

  // 2. Student A generates connection code
  console.log("\n[TEST 1] Student A generates connection code");
  const codeResultA = await parentLinkService.generateConnectionCode(studentA.id);
  console.log(`Generated code for Student A: ${codeResultA.code}, expires: ${codeResultA.expiresAt.toISOString()}`);
  if (!codeResultA.code.match(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
    throw new Error(`Code format invalid: ${codeResultA.code}`);
  }
  console.log("✓ Code format validated (XXXX-XXXX)");

  // 3. Test Expired Code rejection
  console.log("\n[TEST 2] Expired code rejection test");
  const expiredCode = createRandomConnectionCode();
  const expHash = hashCode(expiredCode);
  const expId = `plc-exp-${Date.now()}`;
  await query(
    `INSERT INTO parent_link_codes (id, student_id, code_hash, code_preview, expires_at, created_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP - INTERVAL '2 hours')`,
    [expId, studentA.id, expHash, `${expiredCode.slice(0, 4)}-****`]
  );

  let expiredRejected = false;
  try {
    const fakeParentId = `par-test-${Date.now()}`;
    await parentLinkService.verifyAndRedeemCode(expiredCode, fakeParentId);
  } catch (err: any) {
    if (err.message.includes("expired")) {
      expiredRejected = true;
      console.log(`✓ Expired code correctly rejected: "${err.message}"`);
    } else {
      console.log(`Error returned: ${err.message}`);
    }
  }
  if (!expiredRejected) throw new Error("Expired code was not rejected!");

  // 4. Test Parent Signup with Valid Connection Code
  console.log("\n[TEST 3] Parent account creation with valid connection code");
  const parentEmail = `parent.test.${Date.now()}@example.com`;
  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: parentEmail,
      name: "Mrs. Meera Sharma",
      role: "parent",
      parentConnectionCode: codeResultA.code,
      relationshipType: "parent"
    })
  });

  const signupData = await signupRes.json();
  if (!signupRes.ok) {
    throw new Error(`Parent signup failed: ${JSON.stringify(signupData)}`);
  }
  console.log(`✓ Parent registered successfully: Profile ID: ${signupData.user.profileId}, Linked: ${signupData.user.linkedStudent?.name}`);
  const parentToken = signupData.token;
  const parentProfileId = signupData.user.profileId;

  // 5. Verify database records: parent_student_relationships & parent_link_codes
  console.log("\n[TEST 4] Verify DB state (relationship + single-use marked)");
  const relCheck = await query(
    `SELECT * FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2`,
    [parentProfileId, studentA.id]
  );
  if (relCheck.rows.length === 0 || relCheck.rows[0].status !== "active") {
    throw new Error("Active relationship row not found in DB!");
  }
  console.log(`✓ Active relationship row exists in DB (ID: ${relCheck.rows[0].id})`);

  // 6. Test Single-Use: Attempt to redeem the same code again
  console.log("\n[TEST 5] Single-use test (redeem already used code)");
  let reuseRejected = false;
  try {
    const parent2Id = `par-test2-${Date.now()}`;
    await parentLinkService.verifyAndRedeemCode(codeResultA.code, parent2Id);
  } catch (err: any) {
    if (err.message.includes("already been used") || err.message.includes("redeemed")) {
      reuseRejected = true;
      console.log(`✓ Re-use correctly rejected: "${err.message}"`);
    }
  }
  if (!reuseRejected) throw new Error("Single-use code was allowed to be re-used!");

  // 7. Student B generates code & Parent links Student B (Multi-Child)
  console.log("\n[TEST 6] Student B generates code and Parent links second child");
  const codeResultB = await parentLinkService.generateConnectionCode(studentB.id);
  console.log(`Generated code for Student B: ${codeResultB.code}`);

  const linkChildRes = await fetch(`${API_BASE}/parent/link-child`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${parentToken}`
    },
    body: JSON.stringify({
      connectionCode: codeResultB.code,
      relationshipType: "parent"
    })
  });
  const linkChildData = await linkChildRes.json();
  if (!linkChildRes.ok) {
    throw new Error(`Linking second child failed: ${JSON.stringify(linkChildData)}`);
  }
  console.log(`✓ Second child linked: ${linkChildData.student.name}`);

  // 8. List Parent's Children
  console.log("\n[TEST 7] List parent's children (Multi-Child verification)");
  const childrenRes = await fetch(`${API_BASE}/parent/children`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  const childrenData = await childrenRes.json();
  console.log(`Linked children count: ${childrenData.children.length}`);
  const linkedIds = childrenData.children.map((c: any) => c.id);
  if (!linkedIds.includes(studentA.id) || !linkedIds.includes(studentB.id)) {
    throw new Error(`Expected both students to be linked! Got: ${JSON.stringify(linkedIds)}`);
  }
  console.log(`✓ Both children listed correctly: ${childrenData.children.map((c: any) => c.name).join(", ")}`);

  // 9. Fetch Child A Overview & Learning Path
  console.log("\n[TEST 8] Fetch Child A overview and learning path via parent endpoints");
  const overviewRes = await fetch(`${API_BASE}/parent/children/${studentA.id}/overview`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  const overviewData = await overviewRes.json();
  if (!overviewRes.ok) {
    throw new Error(`Failed fetching Child A overview: ${JSON.stringify(overviewData)}`);
  }
  console.log(`✓ Overview loaded for ${overviewData.student.name}: Mastery: ${overviewData.overallMastery ?? "N/A"}%, Streak: ${overviewData.streak.currentStreak}d`);

  // Verify privacy: Group A/B/C and raw diagnostic scores must NOT be present
  if (JSON.stringify(overviewData).includes("GROUP_A") || JSON.stringify(overviewData).includes("GROUP_B") || JSON.stringify(overviewData).includes("GROUP_C")) {
    throw new Error("Diagnostic group classification leaked in parent overview!");
  }
  console.log("✓ Privacy verified: No diagnostic group classification exposed to parent.");

  // 10. Wrong-Child Access Test (Unlinked Student C)
  console.log("\n[TEST 9] Wrong-child authorization test (Accessing unlinked Student C)");
  const fakeStudentId = "std-unlinked-fake-999";
  const unauthRes = await fetch(`${API_BASE}/parent/children/${fakeStudentId}/overview`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  if (unauthRes.status === 403) {
    console.log("✓ Correctly returned 403 Forbidden for unlinked student.");
  } else {
    throw new Error(`Expected 403 Forbidden for unlinked student, got ${unauthRes.status}`);
  }

  // 11. Revoked Relationship Test
  console.log("\n[TEST 10] Revoked relationship test");
  const revokeRes = await fetch(`${API_BASE}/parent/children/${studentA.id}/revoke`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  const revokeData = await revokeRes.json();
  if (!revokeRes.ok) throw new Error(`Revoking link failed: ${JSON.stringify(revokeData)}`);
  console.log("✓ Revoked link for Student A");

  // Attempt to access Student A data immediately after revocation
  const postRevokeRes = await fetch(`${API_BASE}/parent/children/${studentA.id}/overview`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  if (postRevokeRes.status === 403) {
    console.log("✓ Parent immediately denied access (403 Forbidden) after relationship revoked!");
  } else {
    throw new Error(`Expected 403 Forbidden after revocation, got ${postRevokeRes.status}`);
  }

  // Student B access must still work (Role & relationship isolation)
  const studentBRes = await fetch(`${API_BASE}/parent/children/${studentB.id}/overview`, {
    headers: { "Authorization": `Bearer ${parentToken}` }
  });
  if (studentBRes.status === 200) {
    console.log("✓ Student B data still accessible (No data bleed or unintended cascade).");
  } else {
    throw new Error(`Expected 200 for Student B, got ${studentBRes.status}`);
  }

  console.log("\n=========================================");
  console.log("ALL 10 BACKEND INTEGRATION TESTS PASSED!");
  console.log("=========================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
