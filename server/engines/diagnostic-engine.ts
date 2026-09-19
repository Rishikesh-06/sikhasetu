import crypto from "crypto";
import { query } from "../db";
import { ScoreEngine, type DiagnosticAnswerItem } from "./score-engine";

export class DiagnosticEngine {
  private static DIAGNOSTIC_QUESTION_COUNT = 5;

  /**
   * Retrieves current diagnostic status for the student
   */
  public static async getStatus(studentId: string) {
    // 1. Fetch student profile
    const profileRes = await query(`SELECT * FROM student_profiles WHERE id = $1`, [studentId]);
    if (profileRes.rows.length === 0) {
      throw new Error(`Student profile not found: ${studentId}`);
    }
    const profile = profileRes.rows[0];
    const classLevel = profile.class_level || 7;
    const school = profile.school || "Delhi Public School, R.K. Puram";

    // 2. Check completed results
    const resultRes = await query(
      `SELECT * FROM diagnostic_results WHERE student_id = $1 AND class_level = $2 ORDER BY completed_at DESC LIMIT 1`,
      [studentId, classLevel]
    );

    if (resultRes.rows.length > 0) {
      return {
        status: "completed" as const,
        classLevel,
        school,
        completedAt: resultRes.rows[0].completed_at
      };
    }

    // 3. Check in-progress attempt
    const attemptRes = await query(
      `SELECT * FROM diagnostic_attempts WHERE student_id = $1 AND class_level = $2 AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1`,
      [studentId, classLevel]
    );

    if (attemptRes.rows.length > 0) {
      const attempt = attemptRes.rows[0];
      let history: string[] = [];
      try {
        history = typeof attempt.question_history === "string" ? JSON.parse(attempt.question_history) : (attempt.question_history || []);
      } catch {
        history = [];
      }

      const currentQId = history[history.length - 1];
      let currentQ: any = null;
      if (currentQId) {
        const qRes = await query(`SELECT * FROM questions WHERE id = $1 AND class_level = $2`, [currentQId, classLevel]);
        if (qRes.rows.length > 0) {
          currentQ = this.sanitizeQuestionForClient(qRes.rows[0]);
        }
      }

      return {
        status: "in_progress" as const,
        classLevel,
        school,
        attemptId: attempt.id,
        questionNumber: history.length,
        totalQuestions: this.DIAGNOSTIC_QUESTION_COUNT,
        currentQuestion: currentQ
      };
    }

    // 4. Not started
    return {
      status: "not_started" as const,
      classLevel,
      school,
      totalQuestions: this.DIAGNOSTIC_QUESTION_COUNT
    };
  }

  /**
   * Initializes or resumes a class-specific adaptive diagnostic for a student
   */
  public static async startDiagnostic(studentId: string, requestedClassLevel?: number) {
    // 1. Fetch authoritative student profile from PostgreSQL
    const profileRes = await query(`SELECT * FROM student_profiles WHERE id = $1`, [studentId]);
    if (profileRes.rows.length === 0) {
      throw new Error(`Student profile not found for id: ${studentId}`);
    }

    const profile = profileRes.rows[0];
    const classLevel = profile.class_level;

    if (!classLevel || classLevel < 6 || classLevel > 12) {
      throw new Error(`Invalid student class level: ${classLevel}. Class must be between 6 and 12.`);
    }

    // 2. Check if student already has a completed diagnostic for this class
    const existingResult = await query(
      `SELECT * FROM diagnostic_results WHERE student_id = $1 AND class_level = $2`,
      [studentId, classLevel]
    );

    if (existingResult.rows.length > 0) {
      return {
        alreadyCompleted: true,
        classLevel,
        message: "Diagnostic already completed for this class level."
      };
    }

    // 3. Check for existing in-progress attempt to resume
    const existingAttempt = await query(
      `SELECT * FROM diagnostic_attempts WHERE student_id = $1 AND class_level = $2 AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1`,
      [studentId, classLevel]
    );

    if (existingAttempt.rows.length > 0) {
      const attempt = existingAttempt.rows[0];
      let history: string[] = [];
      try {
        history = typeof attempt.question_history === "string" ? JSON.parse(attempt.question_history) : (attempt.question_history || []);
      } catch {
        history = [];
      }

      const lastQId = history[history.length - 1];
      const qRes = await query(`SELECT * FROM questions WHERE id = $1 AND class_level = $2`, [lastQId, classLevel]);
      if (qRes.rows.length > 0) {
        return {
          attemptId: attempt.id,
          classLevel,
          questionNumber: history.length,
          totalQuestions: this.DIAGNOSTIC_QUESTION_COUNT,
          question: this.sanitizeQuestionForClient(qRes.rows[0])
        };
      }
    }

    // 4. Query Class-Specific Questions from PostgreSQL (STRICT class filter)
    const questionsRes = await query(
      `SELECT * FROM questions WHERE class_level = $1 ORDER BY id ASC`,
      [classLevel]
    );

    const pool = questionsRes.rows;
    if (pool.length === 0) {
      throw new Error(`No diagnostic questions available in database for Class ${classLevel}`);
    }

    // Select initial question (prefer MEDIUM or EASY or FOUNDATIONAL)
    const initialQuestion = pool.find(q => q.difficulty === "MEDIUM")
      || pool.find(q => q.difficulty === "EASY")
      || pool[0];

    const attemptId = `diag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const initialHistory = [initialQuestion.id];

    await query(
      `INSERT INTO diagnostic_attempts (id, student_id, class_level, status, current_difficulty, question_history, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        attemptId,
        studentId,
        classLevel,
        "in_progress",
        initialQuestion.difficulty,
        JSON.stringify(initialHistory),
        new Date().toISOString()
      ]
    );

    return {
      attemptId,
      classLevel,
      questionNumber: 1,
      totalQuestions: this.DIAGNOSTIC_QUESTION_COUNT,
      question: this.sanitizeQuestionForClient(initialQuestion)
    };
  }

  /**
   * Submits student answer, evaluates correctness in database, and adaptively picks next question
   */
  public static async submitAnswer(attemptId: string, questionId: string, selectedAnswer: string) {
    const attemptRes = await query(
      `SELECT * FROM diagnostic_attempts WHERE id = $1`,
      [attemptId]
    );

    if (attemptRes.rows.length === 0) {
      throw new Error(`Diagnostic attempt not found: ${attemptId}`);
    }

    const attempt = attemptRes.rows[0];
    if (attempt.status === "completed") {
      // Idempotency: If this attempt was already finalized, return completion cleanly
      const existingRes = await query(
        `SELECT * FROM diagnostic_results WHERE attempt_id = $1`,
        [attemptId]
      );
      if (existingRes.rows.length > 0) {
        return {
          isCompleted: true,
          summary: {
            title: "Your learning map is ready.",
            message: "We've identified the skills you can build on and the areas where your next learning steps can begin.",
            cta: "Continue to my learning path"
          }
        };
      }
      throw new Error("Diagnostic attempt is already completed");
    }

    const questionRes = await query(
      `SELECT * FROM questions WHERE id = $1 AND class_level = $2`,
      [questionId, attempt.class_level]
    );

    if (questionRes.rows.length === 0) {
      throw new Error(`Question not found for Class ${attempt.class_level}: ${questionId}`);
    }

    const question = questionRes.rows[0];
    const isCorrect = String(selectedAnswer).trim().toLowerCase() === String(question.correct_answer).trim().toLowerCase();
    const marksAwarded = isCorrect ? question.marks : 0;

    // Record or update response in database (idempotent against double-clicks)
    const existingResp = await query(
      `SELECT id FROM diagnostic_responses WHERE attempt_id = $1 AND question_id = $2`,
      [attemptId, questionId]
    );

    if (existingResp.rows.length > 0) {
      await query(
        `UPDATE diagnostic_responses SET selected_answer = $1, is_correct = $2, marks_awarded = $3, answered_at = $4 WHERE id = $5`,
        [selectedAnswer, isCorrect, marksAwarded, new Date().toISOString(), existingResp.rows[0].id]
      );
    } else {
      const responseId = `resp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await query(
        `INSERT INTO diagnostic_responses (id, attempt_id, question_id, selected_answer, is_correct, marks_awarded, answered_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          responseId,
          attemptId,
          questionId,
          selectedAnswer,
          isCorrect,
          marksAwarded,
          new Date().toISOString()
        ]
      );
    }

    let history: string[] = [];
    try {
      history = typeof attempt.question_history === "string" ? JSON.parse(attempt.question_history) : (attempt.question_history || []);
    } catch {
      history = [];
    }
    if (!history.includes(questionId)) {
      history.push(questionId);
    }

    // Check if reached question limit
    if (history.length >= this.DIAGNOSTIC_QUESTION_COUNT) {
      // 1. Finalize diagnostic results, evidence, and subject progress
      await this.finalizeDiagnostic(attempt.student_id, attemptId, attempt.class_level);

      // 2. Mark attempt completed in database
      await query(
        `UPDATE diagnostic_attempts SET status = $1, question_history = $2, completed_at = $3 WHERE id = $4`,
        ["completed", JSON.stringify(history), new Date().toISOString(), attemptId]
      );

      return {
        isCompleted: true,
        summary: {
          title: "Your learning map is ready.",
          message: "We've identified the skills you can build on and the areas where your next learning steps can begin.",
          cta: "Continue to my learning path"
        }
      };
    }

    // Adaptively choose next question strictly for this declared class_level
    const poolRes = await query(
      `SELECT * FROM questions WHERE class_level = $1`,
      [attempt.class_level]
    );
    const available = poolRes.rows.filter(q => !history.includes(q.id));

    let nextDifficulty = question.difficulty;
    if (isCorrect) {
      if (question.difficulty === "FOUNDATIONAL") nextDifficulty = "EASY";
      else if (question.difficulty === "EASY") nextDifficulty = "MEDIUM";
      else if (question.difficulty === "MEDIUM") nextDifficulty = "HARD";
      else if (question.difficulty === "HARD") nextDifficulty = "ADVANCED";
    } else {
      if (question.difficulty === "ADVANCED") nextDifficulty = "HARD";
      else if (question.difficulty === "HARD") nextDifficulty = "MEDIUM";
      else if (question.difficulty === "MEDIUM") nextDifficulty = "EASY";
      else if (question.difficulty === "EASY") nextDifficulty = "FOUNDATIONAL";
    }

    let nextQuestion = available.find(q => q.difficulty === nextDifficulty && q.subject !== question.subject)
      || available.find(q => q.difficulty === nextDifficulty)
      || available.find(q => q.subject !== question.subject)
      || available[0];

    if (!nextQuestion) {
      // Complete early if questions for this class level exhausted
      await this.finalizeDiagnostic(attempt.student_id, attemptId, attempt.class_level);
      await query(
        `UPDATE diagnostic_attempts SET status = $1, question_history = $2, completed_at = $3 WHERE id = $4`,
        ["completed", JSON.stringify(history), new Date().toISOString(), attemptId]
      );
      return {
        isCompleted: true,
        summary: {
          title: "Your learning map is ready.",
          message: "We've identified the skills you can build on and the areas where your next learning steps can begin.",
          cta: "Continue to my learning path"
        }
      };
    }

    history.push(nextQuestion.id);
    await query(
      `UPDATE diagnostic_attempts SET current_difficulty = $1, question_history = $2 WHERE id = $3`,
      [nextDifficulty, JSON.stringify(history), attemptId]
    );

    return {
      isCompleted: false,
      questionNumber: history.length,
      totalQuestions: this.DIAGNOSTIC_QUESTION_COUNT,
      question: this.sanitizeQuestionForClient(nextQuestion)
    };
  }

  /**
   * Finalizes score calculations, persists results to PostgreSQL and updates learning evidence
   */
  public static async finalizeDiagnostic(studentId: string, attemptId: string, classLevel: number) {
    // 1. Get all responses with question metadata
    const respRes = await query(
      `SELECT r.*, q.subject, q.topic, q.skill, q.marks
       FROM diagnostic_responses r
       JOIN questions q ON r.question_id = q.id
       WHERE r.attempt_id = $1`,
      [attemptId]
    );

    const answerItems: DiagnosticAnswerItem[] = respRes.rows.map(row => ({
      questionId: row.question_id,
      subject: row.subject,
      topic: row.topic,
      skill: row.skill,
      isCorrect: Boolean(row.is_correct),
      marks: Number(row.marks || 1)
    }));

    const scoreResult = ScoreEngine.calculateDiagnosticResult(answerItems);

    // Upsert diagnostic_results for this attempt
    const existingResult = await query(
      `SELECT id FROM diagnostic_results WHERE attempt_id = $1`,
      [attemptId]
    );

    let resultId = existingResult.rows[0]?.id;
    if (!resultId) {
      resultId = `dr_${crypto.createHash("md5").update(attemptId).digest("hex").slice(0, 30)}`;
      await query(
        `INSERT INTO diagnostic_results (id, attempt_id, student_id, class_level, raw_score, maximum_score, normalized_score, group_type, subject_scores, skill_evidence, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          resultId,
          attemptId,
          studentId,
          classLevel,
          scoreResult.rawScore,
          scoreResult.maximumScore,
          scoreResult.normalizedScore,
          scoreResult.groupType,
          JSON.stringify(scoreResult.subjectScores),
          JSON.stringify(scoreResult.skillEvidence),
          new Date().toISOString()
        ]
      );
    }

    // Update / Insert Subject Progress in PostgreSQL (UPSERT)
    for (const [subject, score] of Object.entries(scoreResult.subjectScores)) {
      const spId = `sp_${crypto.createHash("md5").update(`${studentId}_${subject.toLowerCase()}`).digest("hex").slice(0, 30)}`;
      await query(
        `INSERT INTO subject_progress (id, student_id, subject, progress_score, previous_score, growth, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           progress_score = EXCLUDED.progress_score,
           previous_score = EXCLUDED.previous_score,
           growth = EXCLUDED.growth,
           updated_at = CURRENT_TIMESTAMP`,
        [spId, studentId, subject, score, Math.max(0, score - 5), 5]
      );
    }

    // Update / Insert Learning Evidence in PostgreSQL (UPSERT)
    for (const ev of scoreResult.skillEvidence) {
      const evId = `le_${crypto.createHash("md5").update(`${studentId}_${ev.skill.toLowerCase()}`).digest("hex").slice(0, 30)}`;
      const masteryScore = (ev as any).masteryScore ?? (ev as any).score ?? 50;
      await query(
        `INSERT INTO learning_evidence (id, student_id, subject, topic, skill, mastery_score, status, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           mastery_score = EXCLUDED.mastery_score,
           status = EXCLUDED.status,
           updated_at = CURRENT_TIMESTAMP`,
        [
          evId,
          studentId,
          ev.subject,
          ev.topic,
          ev.skill,
          masteryScore,
          ev.status
        ]
      );
    }

    // Award Onboarding XP (only once if first diagnostic)
    const priorResults = await query(
      `SELECT COUNT(*) as cnt FROM diagnostic_results WHERE student_id = $1 AND attempt_id != $2`,
      [studentId, attemptId]
    );
    if (Number(priorResults.rows[0]?.cnt || 0) === 0) {
      await query(
        `UPDATE student_profiles SET xp = xp + 100 WHERE id = $1`,
        [studentId]
      );
    }

    // Initialize or update streak (UPSERT)
    const strkId = `st_${crypto.createHash("md5").update(studentId).digest("hex").slice(0, 30)}`;
    await query(
      `INSERT INTO student_streaks (id, student_id, current_streak, longest_streak, last_activity_date)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)
       ON CONFLICT (student_id) DO UPDATE SET
         last_activity_date = CURRENT_DATE`,
      [strkId, studentId, 1, 1]
    );

    return {
      resultId,
      normalizedScore: scoreResult.normalizedScore,
      groupType: scoreResult.groupType
    };
  }

  /**
   * Sanitizes question object before sending to client (removes correct_answer, explanation)
   */
  private static sanitizeQuestionForClient(q: any) {
    let options: string[] = [];
    try {
      options = typeof q.options === "string" ? JSON.parse(q.options) : (q.options || []);
    } catch {
      options = [];
    }

    return {
      id: q.id,
      classLevel: q.class_level,
      subject: q.subject,
      topic: q.topic,
      skill: q.skill,
      difficulty: q.difficulty,
      questionText: q.question_text,
      questionType: q.question_type,
      contextPassage: q.context_passage,
      options,
      marks: q.marks
    };
  }
}
