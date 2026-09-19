import { query } from "../db";
import { LearningEvidenceEngine } from "./learning-evidence-engine";
import { StreakAchievementEngine, type FormattedAchievement } from "./streak-achievement-engine";

export interface PracticeRecommendation {
  id: string;
  title: string;
  subject: string;
  topic: string;
  skill: string;
  minutes: number;
  level: "Foundation" | "Build" | "Challenge";
  progress: number;
  reason: string;
}

export interface SanitizedQuestion {
  id: string;
  classLevel: number;
  subject: string;
  topic: string;
  skill: string;
  questionText: string;
  text?: string;
  questionType: string;
  type?: string;
  contextPassage?: string | null;
  options: string[];
  marks: number;
}

export interface PracticeSessionData {
  sessionId: string;
  practiceId?: string;
  title: string;
  subject: string;
  topic: string;
  skill: string;
  level: string;
  minutes: number;
  questions: SanitizedQuestion[];
}

export interface PracticeSubmissionResult {
  sessionId: string;
  score: number;
  maxScore: number;
  percentage: number;
  xpEarned: number;
  skillUpdated: {
    skill: string;
    newMastery: number;
    status: string;
    growth: number;
  };
  newAchievements: FormattedAchievement[];
  responses: Array<{
    questionId: string;
    questionText: string;
    skill: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }>;
}

export class PracticeEngine {
  /**
   * Generates dynamic, evidence-driven recommendations from Supabase
   */
  public static async getRecommendations(studentId: string): Promise<PracticeRecommendation[]> {
    const profileRes = await query(`SELECT * FROM student_profiles WHERE id = $1`, [studentId]);
    if (profileRes.rows.length === 0) {
      throw new Error(`Student not found: ${studentId}`);
    }
    const classLevel = Number(profileRes.rows[0].class_level) || 7;

    // 1. Fetch lowest scoring learning evidence
    const evRes = await query(
      `SELECT * FROM learning_evidence WHERE student_id = $1 ORDER BY mastery_score ASC LIMIT 4`,
      [studentId]
    );

    const recommendations: PracticeRecommendation[] = [];

    if (evRes.rows.length > 0) {
      for (let i = 0; i < evRes.rows.length; i++) {
        const ev = evRes.rows[i];
        const score = Number(ev.mastery_score) || 50;
        const level = score < 50 ? "Foundation" : score < 75 ? "Build" : "Challenge";
        const minutes = score < 50 ? 5 : 7;
        const pId = `prac-${studentId}-${ev.id || i + 1}`;

        let reason = "Your recent evidence shows this skill needs reinforcement.";
        if (ev.status === "Needs Support" || score < 50) {
          reason = `Priority growth area (${score}% mastery). Strengthen core foundation.`;
        } else if (score >= 75) {
          reason = `High mastery (${score}%). Take on advanced challenges.`;
        }

        recommendations.push({
          id: pId,
          title: `${minutes}-Minute ${ev.skill} Booster`,
          subject: ev.subject,
          topic: ev.topic,
          skill: ev.skill,
          minutes,
          level,
          progress: score,
          reason
        });
      }
    } else {
      // If student has no evidence yet, fetch foundational topics for their class
      const qRes = await query(
        `SELECT DISTINCT subject, topic, skill FROM questions WHERE class_level = $1 LIMIT 3`,
        [classLevel]
      );

      for (let i = 0; i < qRes.rows.length; i++) {
        const q = qRes.rows[i];
        const pId = `prac-${studentId}-init-${i + 1}`;
        recommendations.push({
          id: pId,
          title: `Class ${classLevel} ${q.skill} Introduction`,
          subject: q.subject,
          topic: q.topic,
          skill: q.skill,
          minutes: 5,
          level: "Foundation",
          progress: 0,
          reason: "Foundational skill booster calibrated for your enrolled class."
        });
      }
    }

    return recommendations;
  }

  /**
   * Starts a real practice session with authenticated questions from the database
   */
  public static async startPracticeSession(
    studentId: string,
    options: { practiceId?: string; skill?: string; topic?: string; subject?: string; count?: number }
  ): Promise<PracticeSessionData> {
    const profileRes = await query(`SELECT * FROM student_profiles WHERE id = $1`, [studentId]);
    if (profileRes.rows.length === 0) {
      throw new Error(`Student not found: ${studentId}`);
    }
    const classLevel = Number(profileRes.rows[0].class_level) || 7;

    let targetSkill = options.skill;
    let targetTopic = options.topic;
    let targetSubject = options.subject;

    if (!targetSkill) {
      const recs = await this.getRecommendations(studentId);
      if (recs.length > 0) {
        targetSkill = recs[0].skill;
        targetTopic = recs[0].topic;
        targetSubject = recs[0].subject;
      } else {
        targetSkill = "One-step Equations";
        targetTopic = "Simple Equations";
        targetSubject = "Mathematics";
      }
    }

    // 1. Fetch matching questions from database:
    // First by exact/partial skill match, then expand by topic, then by subject to provide a full 3-5 question practice session
    const poolMap = new Map<string, any>();

    // A. Skill match
    if (targetSkill) {
      const skillRes = await query(
        `SELECT * FROM questions WHERE class_level = $1 AND skill ILIKE $2 LIMIT 5`,
        [classLevel, `%${targetSkill}%`]
      );
      for (const q of skillRes.rows) {
        poolMap.set(q.id, q);
        if (!targetTopic) targetTopic = q.topic;
        if (!targetSubject) targetSubject = q.subject;
      }
    }

    // B. Topic match if fewer than 3 questions
    if (poolMap.size < 3 && targetTopic) {
      const topicRes = await query(
        `SELECT * FROM questions WHERE class_level = $1 AND topic ILIKE $2 LIMIT 5`,
        [classLevel, `%${targetTopic}%`]
      );
      for (const q of topicRes.rows) {
        if (!poolMap.has(q.id)) poolMap.set(q.id, q);
        if (poolMap.size >= 5) break;
      }
    }

    // C. Subject match if still fewer than 3 questions
    if (poolMap.size < 3 && targetSubject) {
      const subjRes = await query(
        `SELECT * FROM questions WHERE class_level = $1 AND subject ILIKE $2 LIMIT 5`,
        [classLevel, `%${targetSubject}%`]
      );
      for (const q of subjRes.rows) {
        if (!poolMap.has(q.id)) poolMap.set(q.id, q);
        if (poolMap.size >= 5) break;
      }
    }

    // D. General class level fallback if pool is empty
    if (poolMap.size === 0) {
      const genRes = await query(`SELECT * FROM questions WHERE class_level = $1 LIMIT 5`, [classLevel]);
      for (const q of genRes.rows) {
        poolMap.set(q.id, q);
      }
    }

    const selectedQuestions = Array.from(poolMap.values()).slice(0, 5);

    const sessionId = `prac-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const title = `5-Minute ${targetSkill} Practice`;

    // Persist practice activity draft
    await query(
      `INSERT INTO practice_activities (id, student_id, title, subject, topic, skill, minutes, level, progress)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [sessionId, studentId, title, targetSubject || "Mathematics", targetTopic || "Core Concepts", targetSkill, 5, "Foundation", 0]
    );

    const sanitizedQuestions: SanitizedQuestion[] = selectedQuestions.map(q => {
      let opts = q.options;
      if (typeof opts === "string") {
        try { opts = JSON.parse(opts); } catch { opts = []; }
      }
      return {
        id: q.id,
        classLevel: q.class_level,
        subject: q.subject,
        topic: q.topic,
        skill: q.skill,
        questionText: q.question_text,
        text: q.question_text,
        questionType: q.question_type,
        type: q.question_type,
        contextPassage: q.context_passage,
        options: opts,
        marks: q.marks || 1
      };
    });

    return {
      sessionId,
      practiceId: sessionId,
      title,
      subject: targetSubject || "Mathematics",
      topic: targetTopic || "Core Topic",
      skill: targetSkill,
      level: "Foundation",
      minutes: 5,
      questions: sanitizedQuestions
    };
  }

  /**
   * Submits practice session answers, evaluates score server-side, updates evidence, XP, subject progress & achievements
   */
  public static async submitPracticeSession(
    studentId: string,
    sessionId: string,
    answers: Record<string, string>
  ): Promise<PracticeSubmissionResult> {
    // 1. Fetch practice record
    const pracRes = await query(`SELECT * FROM practice_activities WHERE id = $1 AND student_id = $2`, [sessionId, studentId]);
    if (pracRes.rows.length === 0) {
      throw new Error(`Practice session not found: ${sessionId}`);
    }
    const prac = pracRes.rows[0];

    // 2. Fetch questions from database
    const questionIds = Object.keys(answers);
    const qRes = await query(`SELECT * FROM questions WHERE id = ANY($1::varchar[])`, [questionIds]);

    let rawScore = 0;
    let maxScore = 0;
    const responses: any[] = [];

    for (const q of qRes.rows) {
      const selected = answers[q.id] || "";
      const isCorrect = String(selected).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
      const marks = Number(q.marks) || 1;

      if (isCorrect) rawScore += marks;
      maxScore += marks;

      responses.push({
        questionId: q.id,
        questionText: q.question_text,
        skill: q.skill,
        selectedAnswer: selected,
        correctAnswer: q.correct_answer,
        isCorrect,
        explanation: q.explanation
      });
    }

    const percentage = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
    const baseReward = 20;
    const bonusXp = Math.round((percentage / 100) * 15);
    const xpEarned = baseReward + bonusXp;

    // 3. Mark practice activity completed
    await query(
      `UPDATE practice_activities SET progress = 100, completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [sessionId]
    );

    // 4. Update Student XP
    await query(
      `UPDATE student_profiles SET xp = xp + $1 WHERE id = $2`,
      [xpEarned, studentId]
    );

    // 5. Record activity log
    const logId = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await query(
      `INSERT INTO activity_logs (id, student_id, activity_type, title, xp_earned, activity_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [logId, studentId, "practice_completed", `Completed ${prac.title}`, xpEarned]
    );

    // 6. Update Learning Evidence and Subject Progress
    const evidenceUpdate = await LearningEvidenceEngine.recordEvidenceUpdate(
      studentId,
      prac.subject,
      prac.topic,
      prac.skill,
      percentage
    );

    // 7. Authoritatively evaluate achievements
    const newAchievements = await StreakAchievementEngine.evaluateAchievements(studentId);

    return {
      sessionId,
      score: rawScore,
      maxScore,
      percentage,
      xpEarned,
      skillUpdated: {
        skill: prac.skill,
        newMastery: evidenceUpdate.skillEvidence.score,
        status: evidenceUpdate.skillEvidence.status,
        growth: evidenceUpdate.growth
      },
      newAchievements,
      responses
    };
  }

  /**
   * Starts a real functional quiz (Quick, Topic, Subject, or Challenge)
   */
  public static async startQuiz(
    studentId: string,
    quizType: "Quick" | "Topic" | "Subject" | "Challenge" = "Quick",
    subject?: string,
    topic?: string
  ): Promise<QuizSessionData> {
    const profileRes = await query(`SELECT * FROM student_profiles WHERE id = $1`, [studentId]);
    if (profileRes.rows.length === 0) {
      throw new Error(`Student not found: ${studentId}`);
    }
    const classLevel = Number(profileRes.rows[0].class_level) || 7;
    const targetSubject = subject || "Mathematics";

    let targetCount = 3;
    let timeLimit = 3;
    let title = "5-Minute Rapid Check";
    let isChallenge = false;

    const normType = String(quizType).toLowerCase();
    if (normType === "quick") {
      targetCount = 3;
      timeLimit = 3;
      title = "5-Minute Rapid Check";
    } else if (normType === "topic") {
      targetCount = 5;
      timeLimit = 5;
      title = topic ? `${topic} Core Mastery` : "Core Topic Mastery";
    } else if (normType === "subject") {
      targetCount = 5;
      timeLimit = 7;
      title = `${targetSubject} Comprehensive Review`;
    } else if (normType === "challenge") {
      targetCount = 5;
      timeLimit = 10;
      title = "High-Streak Clash Duel";
      isChallenge = true;
    }

    // Fetch quiz questions
    let qRes = await query(
      `SELECT * FROM questions WHERE class_level = $1 AND subject ILIKE $2 ORDER BY ${isChallenge ? "marks DESC" : "id"} LIMIT $3`,
      [classLevel, `%${targetSubject}%`, targetCount]
    );

    if (qRes.rows.length === 0) {
      qRes = await query(`SELECT * FROM questions WHERE class_level = $1 LIMIT $2`, [classLevel, targetCount]);
    }

    const attemptId = `qatt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const quizId = `quiz-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const qIds = qRes.rows.map(q => q.id);
    const dbQuizType = normType === "quick" ? "Quick" : normType === "topic" ? "Topic" : normType === "subject" ? "Subject" : "Challenge";

    // Create quiz record matching schema
    await query(
      `INSERT INTO quizzes (id, class_level, subject, topic, title, quiz_type, question_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [quizId, classLevel, targetSubject, topic || "Core Concepts", title, dbQuizType, JSON.stringify(qIds)]
    );

    // Create quiz attempt
    await query(
      `INSERT INTO quiz_attempts (id, student_id, quiz_id, score, max_score, percentage, started_at)
       VALUES ($1, $2, $3, 0, $4, 0, CURRENT_TIMESTAMP)`,
      [attemptId, studentId, quizId, qRes.rows.length]
    );

    const sanitizedQuestions: SanitizedQuestion[] = qRes.rows.map(q => {
      let opts = q.options;
      if (typeof opts === "string") {
        try { opts = JSON.parse(opts); } catch { opts = []; }
      }
      return {
        id: q.id,
        classLevel: q.class_level,
        subject: q.subject,
        topic: q.topic,
        skill: q.skill,
        questionText: q.question_text,
        text: q.question_text,
        questionType: q.question_type,
        type: q.question_type,
        contextPassage: q.context_passage,
        options: opts,
        marks: q.marks || 1
      };
    });

    return {
      attemptId,
      quizId,
      quizTitle: title,
      quizType: normType as any,
      subject: targetSubject,
      topic: topic || "Curriculum Focus",
      timeLimitMinutes: timeLimit,
      totalQuestions: sanitizedQuestions.length,
      questions: sanitizedQuestions
    };
  }

  /**
   * Submits quiz answers, awards XP, updates streaks, evidence and evaluates achievements
   */
  public static async submitQuiz(
    studentId: string,
    attemptId: string,
    answers: Record<string, string>
  ): Promise<QuizSubmissionResult> {
    const attRes = await query(`SELECT * FROM quiz_attempts WHERE id = $1 AND student_id = $2`, [attemptId, studentId]);
    if (attRes.rows.length === 0) {
      throw new Error(`Quiz attempt not found: ${attemptId}`);
    }
    const attempt = attRes.rows[0];

    // Prevent duplicate scoring
    if (attempt.submitted_at) {
      return {
        attemptId,
        score: Number(attempt.score) || 0,
        totalQuestions: Number(attempt.max_score) || 0,
        percentage: Number(attempt.percentage) || 0,
        xpEarned: 0,
        results: []
      };
    }

    const questionIds = Object.keys(answers);
    const qRes = await query(`SELECT * FROM questions WHERE id = ANY($1::varchar[])`, [questionIds]);

    let rawScore = 0;
    let maxScore = 0;
    const responses: any[] = [];
    let subject = "Mathematics";
    let topic = "Core Concepts";
    let skill = "General Skill";

    for (const q of qRes.rows) {
      const selected = answers[q.id] || "";
      const isCorrect = String(selected).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
      const marks = Number(q.marks) || 1;

      if (isCorrect) rawScore += marks;
      maxScore += marks;

      subject = q.subject || subject;
      topic = q.topic || topic;
      skill = q.skill || skill;

      responses.push({
        questionId: q.id,
        questionText: q.question_text,
        selectedAnswer: selected,
        correctAnswer: q.correct_answer,
        isCorrect,
        explanation: q.explanation
      });
    }

    const percentage = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
    const baseReward = 25;
    const bonusXp = Math.round((percentage / 100) * 25);
    const xpEarned = baseReward + bonusXp;

    // Update quiz attempt
    await query(
      `UPDATE quiz_attempts SET score = $1, max_score = $2, percentage = $3, submitted_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [rawScore, maxScore, percentage, attemptId]
    );

    // Update student XP
    await query(`UPDATE student_profiles SET xp = xp + $1 WHERE id = $2`, [xpEarned, studentId]);

    // Log activity
    const logId = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await query(
      `INSERT INTO activity_logs (id, student_id, activity_type, title, xp_earned, activity_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [logId, studentId, "quiz_completed", `Completed Learning Quiz (${percentage}%)`, xpEarned]
    );

    // Update evidence
    await LearningEvidenceEngine.recordEvidenceUpdate(studentId, subject, topic, skill, percentage);

    // Check newly unlocked achievements
    const newlyUnlocked = await StreakAchievementEngine.evaluateAchievements(studentId);

    return {
      attemptId,
      score: rawScore,
      totalQuestions: maxScore,
      percentage,
      xpEarned,
      results: responses,
      newlyUnlocked: newlyUnlocked.map(a => ({
        code: a.code,
        title: a.title,
        xpReward: a.xpReward
      }))
    };
  }
}
