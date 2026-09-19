import { query } from "../server/db";

async function inspect() {
  console.log("=== INSPECTING DIAGNOSTIC DB STATE ===");
  const students = await query(`SELECT id, user_id, name, class_level, xp FROM student_profiles LIMIT 5`);
  console.log("Students:", students.rows);

  const attempts = await query(`SELECT id, student_id, class_level, status, started_at, completed_at, question_history FROM diagnostic_attempts ORDER BY started_at DESC LIMIT 5`);
  console.log("Recent Attempts:", attempts.rows);

  const results = await query(`SELECT id, attempt_id, student_id, class_level, normalized_score, group_type, completed_at FROM diagnostic_results ORDER BY completed_at DESC LIMIT 5`);
  console.log("Recent Results:", results.rows);

  const responses = await query(`SELECT id, attempt_id, question_id, selected_answer, is_correct FROM diagnostic_responses ORDER BY answered_at DESC LIMIT 10`);
  console.log("Recent Responses count:", responses.rows.length);

  process.exit(0);
}

inspect().catch(err => {
  console.error("Error inspecting:", err);
  process.exit(1);
});
