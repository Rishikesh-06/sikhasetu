import { query } from "../db";
import { LEARNING_GROUPS, type LearningGroupCode } from "../config/thresholds";
import { GrokQuestionGenerator, type GeneratedQuestion } from "../services/grok-question-generator";
import { validateTopic } from "../config/curriculum";

export interface CreateAssessmentParams {
  teacherId: string;
  classroomId?: string;
  classLevel: number;
  subject: string;
  topics: string[];
  title: string;
  purpose?: string;
  questionCount?: number;
  instructions?: string;
}

export class AdaptiveAssessmentEngine {
  /**
   * Teacher creates ONE assessment:
   * 1. Evaluates all enrolled classroom students' diagnostic groups.
   * 2. Calls Grok AI once per unique group tier (GROUP_A, GROUP_B, GROUP_C) -> Cost control.
   * 3. Persists generated questions to PostgreSQL questions table.
   * 4. Creates individual personalized assessment_assignments.
   */
  public static async createAndAssignAssessment(params: CreateAssessmentParams) {
    const {
      teacherId,
      classroomId,
      classLevel,
      subject,
      topics,
      title,
      purpose = "Formative Adaptive Check",
      questionCount = 5,
      instructions
    } = params;

    const primaryTopic = topics.length > 0 ? topics[0] : "Curriculum Assessment";

    // 1. Validate topic appropriateness if specified
    if (primaryTopic && !validateTopic(classLevel, subject, primaryTopic)) {
      console.warn(`[Assessment Engine] Topic "${primaryTopic}" may not be standard for Class ${classLevel} ${subject}, proceeding with teacher override.`);
    }

    // 2. Fetch all active students enrolled in this classroom (or class level)
    let students: any[] = [];
    if (classroomId) {
      const enrRes = await query(
        `SELECT sp.* FROM class_enrollments enr
         JOIN student_profiles sp ON enr.student_id = sp.id
         WHERE enr.classroom_id = $1 AND enr.status = 'active'`,
        [classroomId]
      );
      students = enrRes.rows;
    }

    if (students.length === 0) {
      const studentsRes = await query(
        `SELECT * FROM student_profiles WHERE class_level = $1`,
        [classLevel]
      );
      students = studentsRes.rows;
    }

    if (students.length === 0) {
      throw new Error(`No active students found in Class ${classLevel} classroom to assign assessment.`);
    }

    // 3. Determine diagnostic group for each student
    const allDiagRes = await query(`SELECT * FROM diagnostic_results ORDER BY completed_at DESC`);
    const studentGroupMap: Map<string, { student: any; groupType: LearningGroupCode }> = new Map();
    const uniqueGroups = new Set<LearningGroupCode>();

    for (const student of students) {
      const diag = allDiagRes.rows.find((d: any) => d.student_id === student.id);
      const groupType: LearningGroupCode = diag ? (diag.group_type as LearningGroupCode) : "GROUP_B";
      studentGroupMap.set(student.id, { student, groupType });
      uniqueGroups.add(groupType);
    }

    // Generate question sets for all 3 difficulty tiers (Group A, Group B, Group C) - exactly 3 Grok calls
    const targetTiers: LearningGroupCode[] = ["GROUP_A", "GROUP_B", "GROUP_C"];
    for (const tier of targetTiers) {
      uniqueGroups.add(tier);
    }

    // 4. Generate questions via Grok AI for each unique group tier (Max 3 calls total!)
    const groupQuestionIdsMap: Map<LearningGroupCode, string[]> = new Map();

    for (const groupType of uniqueGroups) {
      console.log(`[Assessment Engine] Generating Grok questions for Tier: ${groupType}, Class: ${classLevel}, Topic: ${primaryTopic}`);
      const generatedQuestions = await GrokQuestionGenerator.generateGroupQuestions({
        classLevel,
        subject,
        topic: primaryTopic,
        groupType,
        count: questionCount,
        customInstructions: instructions
      });

      // Persist generated questions in PostgreSQL
      const persistedIds: string[] = [];
      for (const q of generatedQuestions) {
        const questionId = `q-grok-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await query(
          `INSERT INTO questions (id, class_level, subject, topic, skill, difficulty, question_text, question_type, options, correct_answer, explanation, marks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            questionId,
            classLevel,
            subject,
            primaryTopic,
            `${primaryTopic} Concept Application`,
            q.difficulty,
            q.question,
            "choice",
            JSON.stringify(q.options),
            q.correct_answer,
            q.explanation,
            q.marks || 1
          ]
        );
        persistedIds.push(questionId);
      }

      groupQuestionIdsMap.set(groupType, persistedIds);
    }

    // 5. Save Master Assessment Record in PostgreSQL
    const assessmentId = `asmt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await query(
      `INSERT INTO adaptive_assessments (id, teacher_id, classroom_id, class_level, subject, topics, title, purpose, question_count, adaptive_mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        assessmentId,
        teacherId,
        classroomId || null,
        classLevel,
        subject,
        JSON.stringify(topics),
        title,
        purpose,
        questionCount,
        true
      ]
    );

    // 6. Create Personalized Assignments for each student
    const assignmentsCreated: any[] = [];
    for (const [studentId, { student, groupType }] of studentGroupMap.entries()) {
      const questionIds = groupQuestionIdsMap.get(groupType) || groupQuestionIdsMap.get("GROUP_B") || [];
      const assignmentId = `asgn-${Date.now()}-${studentId.slice(-6)}-${Math.random().toString(36).slice(2, 5)}`;

      await query(
        `INSERT INTO assessment_assignments (id, assessment_id, student_id, group_type, assigned_question_ids, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          assignmentId,
          assessmentId,
          studentId,
          groupType,
          JSON.stringify(questionIds),
          "pending"
        ]
      );

      assignmentsCreated.push({
        assignmentId,
        studentId,
        studentName: student.name,
        groupType,
        questionCount: questionIds.length,
        tierLabel: LEARNING_GROUPS[groupType]?.label || "Standard"
      });
    }

    return {
      assessmentId,
      title,
      classLevel,
      subject,
      topics,
      assignedCount: assignmentsCreated.length,
      groupDistribution: {
        groupA: assignmentsCreated.filter(a => a.groupType === "GROUP_A").length,
        groupB: assignmentsCreated.filter(a => a.groupType === "GROUP_B").length,
        groupC: assignmentsCreated.filter(a => a.groupType === "GROUP_C").length
      },
      assignments: assignmentsCreated
    };
  }

  /**
   * Retrieves single assessment details with classroom stats & results breakdown
   */
  public static async getAssessmentDetails(assessmentId: string, teacherId?: string) {
    const asmtRes = await query(
      `SELECT asm.*, tp.name as teacher_name
       FROM adaptive_assessments asm
       LEFT JOIN teacher_profiles tp ON asm.teacher_id = tp.id
       WHERE asm.id = $1`,
      [assessmentId]
    );

    if (asmtRes.rows.length === 0) {
      throw new Error("Assessment not found");
    }

    const asmt = asmtRes.rows[0];
    const assignmentsRes = await query(
      `SELECT asg.*, sp.name as student_name, u.email as student_email,
              att.score, att.max_score, att.percentage, att.submitted_at
       FROM assessment_assignments asg
       JOIN student_profiles sp ON asg.student_id = sp.id
       JOIN users u ON sp.user_id = u.id
       LEFT JOIN assessment_attempts att ON asg.id = att.assignment_id
       WHERE asg.assessment_id = $1
       ORDER BY sp.name ASC`,
      [assessmentId]
    );

    const assignments = assignmentsRes.rows;
    const assignedCount = assignments.length;
    const completedCount = assignments.filter((a: any) => a.status === "submitted").length;
    const inProgressCount = assignments.filter((a: any) => a.status === "in_progress").length;
    const notStartedCount = assignments.filter((a: any) => a.status === "pending").length;

    let topics = [];
    try {
      topics = typeof asmt.topics === "string" ? JSON.parse(asmt.topics) : asmt.topics;
    } catch {
      topics = [];
    }

    return {
      id: asmt.id,
      title: asmt.title,
      subject: asmt.subject,
      classLevel: asmt.class_level,
      classroomId: asmt.classroom_id,
      topics,
      purpose: asmt.purpose,
      questionCount: asmt.question_count,
      createdAt: asmt.created_at,
      teacherName: asmt.teacher_name,
      stats: {
        assignedCount,
        completedCount,
        inProgressCount,
        notStartedCount,
        completionRate: assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0,
        groupA: assignments.filter((a: any) => a.group_type === "GROUP_A").length,
        groupB: assignments.filter((a: any) => a.group_type === "GROUP_B").length,
        groupC: assignments.filter((a: any) => a.group_type === "GROUP_C").length
      },
      results: assignments.map((a: any) => ({
        assignmentId: a.id,
        studentId: a.student_id,
        studentName: a.student_name,
        groupType: a.group_type,
        status: a.status,
        score: a.score !== null ? Number(a.score) : null,
        maxScore: a.max_score !== null ? Number(a.max_score) : null,
        percentage: a.percentage !== null ? Number(a.percentage) : null,
        submittedAt: a.submitted_at
      }))
    };
  }

  /**
   * Evaluates student's submitted assessment attempt and updates learning evidence
   */
  public static async submitAssessment(assignmentId: string, studentId: string, answers: Record<string, string>) {
    const assignRes = await query(
      `SELECT a.*, asm.subject, asm.topics, asm.title
       FROM assessment_assignments a
       JOIN adaptive_assessments asm ON a.assessment_id = asm.id
       WHERE a.id = $1 AND a.student_id = $2`,
      [assignmentId, studentId]
    );

    if (assignRes.rows.length === 0) {
      throw new Error("Assessment assignment not found for this student");
    }

    const assignment = assignRes.rows[0];

    // Check if already submitted to prevent duplicate XP
    const existingAttempt = await query(
      `SELECT * FROM assessment_attempts WHERE assignment_id = $1 AND student_id = $2`,
      [assignmentId, studentId]
    );

    let qIds: string[] = [];
    try {
      qIds = typeof assignment.assigned_question_ids === "string"
        ? JSON.parse(assignment.assigned_question_ids)
        : assignment.assigned_question_ids;
    } catch {
      qIds = [];
    }

    // Fetch authoritative questions from PostgreSQL
    const questionsRes = await query(`SELECT * FROM questions`);
    const questions = questionsRes.rows.filter((q: any) => qIds.includes(q.id));

    const responseDetails: any[] = [];
    const pendingResponses: any[] = [];
    const attemptId = `asmt-att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let score = 0;
    let maxScore = 0;

    for (const q of questions) {
      const selected = answers[q.id] ?? "";
      const isCorrect = String(selected).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
      const earned = isCorrect ? (q.marks || 1) : 0;
      score += earned;
      maxScore += (q.marks || 1);

      const respId = `ar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      pendingResponses.push({
        id: respId,
        attemptId,
        questionId: q.id,
        selected,
        isCorrect,
        explanation: q.explanation
      });

      responseDetails.push({
        questionId: q.id,
        questionText: q.question_text,
        skill: q.skill,
        selectedAnswer: selected,
        correctAnswer: q.correct_answer,
        isCorrect,
        explanation: q.explanation
      });
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    if (existingAttempt.rows.length === 0) {
      // 1. Save Attempt Record First (Parent FK)
      await query(
        `INSERT INTO assessment_attempts (id, assignment_id, student_id, score, max_score, percentage, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [attemptId, assignmentId, studentId, score, maxScore, percentage, new Date().toISOString()]
      );

      // 2. Insert Individual Responses (Child FK)
      for (const resp of pendingResponses) {
        await query(
          `INSERT INTO assessment_responses (id, attempt_id, question_id, selected_answer, is_correct, explanation)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [resp.id, resp.attemptId, resp.questionId, resp.selected, resp.isCorrect, resp.explanation]
        );
      }

      // 3. Update Assignment status to submitted
      await query(
        `UPDATE assessment_assignments SET status = 'submitted' WHERE id = $1`,
        [assignmentId]
      );

      // Update Subject Progress in PostgreSQL
      const currentProgressRes = await query(
        `SELECT * FROM subject_progress WHERE student_id = $1 AND subject = $2`,
        [studentId, assignment.subject]
      );

      if (currentProgressRes.rows.length > 0) {
        const cur = currentProgressRes.rows[0];
        const newScore = Math.min(100, Math.round(cur.progress_score * 0.85 + percentage * 0.15));
        const growth = newScore - cur.previous_score;
        await query(
          `UPDATE subject_progress SET progress_score = $1, growth = $2, updated_at = $3 WHERE id = $4`,
          [newScore, growth, new Date().toISOString(), cur.id]
        );
      } else {
        const spId = `sp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await query(
          `INSERT INTO subject_progress (id, student_id, subject, progress_score, previous_score, growth)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [spId, studentId, assignment.subject, percentage, percentage, 0]
        );
      }

      // Update learning evidence for the topic
      let topicsList: string[] = [];
      try {
        topicsList = typeof assignment.topics === "string" ? JSON.parse(assignment.topics) : assignment.topics;
      } catch {
        topicsList = [assignment.subject];
      }
      const primaryTopic = topicsList[0] || "General Topic";

      const evRes = await query(
        `SELECT * FROM learning_evidence WHERE student_id = $1 AND subject = $2 AND topic = $3`,
        [studentId, assignment.subject, primaryTopic]
      );

      if (evRes.rows.length > 0) {
        const curEv = evRes.rows[0];
        const newMastery = Math.min(100, Math.round(curEv.mastery_score * 0.7 + percentage * 0.3));
        const newStatus = newMastery >= 75 ? "Strong" : newMastery >= 60 ? "Good" : "Developing";
        await query(
          `UPDATE learning_evidence SET mastery_score = $1, status = $2, evidence_count = evidence_count + 1, updated_at = $3 WHERE id = $4`,
          [newMastery, newStatus, new Date().toISOString(), curEv.id]
        );
      } else {
        const initialStatus = percentage >= 75 ? "Strong" : percentage >= 60 ? "Good" : "Developing";
        const leId = `le-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await query(
          `INSERT INTO learning_evidence (id, student_id, subject, topic, skill, mastery_score, status, evidence_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [leId, studentId, assignment.subject, primaryTopic, `${primaryTopic} Application`, percentage, initialStatus, 1]
        );
      }

      // Award XP
      const xpGain = Math.max(25, Math.round(percentage * 0.6));
      await query(`UPDATE student_profiles SET xp = xp + $1 WHERE id = $2`, [xpGain, studentId]);

      // Log Activity
      const actId = `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await query(
        `INSERT INTO activity_logs (id, student_id, activity_type, title, xp_earned)
         VALUES ($1, $2, $3, $4, $5)`,
        [actId, studentId, "ASSESSMENT", `Completed ${assignment.title}`, xpGain]
      );

      return {
        attemptId,
        score,
        maxScore,
        percentage,
        xpEarned: xpGain,
        responses: responseDetails
      };
    }

    // Already submitted
    const prev = existingAttempt.rows[0];
    return {
      attemptId: prev.id,
      score: Number(prev.score),
      maxScore: Number(prev.max_score),
      percentage: Number(prev.percentage),
      xpEarned: 0,
      responses: responseDetails
    };
  }
}
