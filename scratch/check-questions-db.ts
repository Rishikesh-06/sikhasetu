import { query } from "../server/db";

async function checkQuestions() {
  console.log("=== CHECKING CLASS 7 MATHEMATICS QUESTIONS IN DB ===");
  const allQ = await query(`SELECT id, class_level, subject, topic, skill, question_text, options, correct_answer FROM questions WHERE class_level = 7 ORDER BY subject, topic, id`);
  console.log(`Total Class 7 questions: ${allQ.rows.length}`);
  
  for (const q of allQ.rows) {
    console.log(`[${q.id}] ${q.subject} | Topic: "${q.topic}" | Skill: "${q.skill}" | Text: "${q.question_text.slice(0, 50)}..." | Options: ${q.options}`);
  }

  console.log("\n=== TESTING PRACTICE ENGINE QUESTION SELECTION FOR ONE-STEP EQUATIONS ===");
  const mathQ = await query(
    `SELECT * FROM questions WHERE class_level = 7 AND (skill ILIKE '%One-step Equations%' OR topic ILIKE '%One-step Equations%' OR subject ILIKE '%Mathematics%')`
  );
  console.log(`Matching Math Questions count: ${mathQ.rows.length}`);

  process.exit(0);
}

checkQuestions().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
