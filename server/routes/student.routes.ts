import { Router, type Response } from "express";
import { query } from "../db";
import { authenticateToken, requireRole, type AuthenticatedRequest } from "../middleware/auth";
import { DiagnosticEngine } from "../engines/diagnostic-engine";
import { AdaptiveAssessmentEngine } from "../engines/adaptive-assessment-engine";
import { LearningEvidenceEngine } from "../engines/learning-evidence-engine";
import { StreakAchievementEngine } from "../engines/streak-achievement-engine";
import { PracticeEngine } from "../engines/practice-engine";
import { LearningPathEngine } from "../engines/learning-path-engine";
import { parentLinkService } from "../services/parent-link.service";

export const studentRouter = Router();

// Enforce student role on all routes
studentRouter.use(authenticateToken);
studentRouter.use(requireRole("student"));

// GET /api/student/learning-path (Data-driven Learning Constellation Path)
studentRouter.get("/learning-path", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const learningPath = await LearningPathEngine.getStudentLearningPath(studentId);
    res.json(learningPath);
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching learning path: ${err.message}` });
  }
});

// GET /api/student/classroom (Your Class & Assigned Teachers)
studentRouter.get("/classroom", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const profileRes = await query(`SELECT * FROM student_profiles WHERE id = $1`, [studentId]);
    if (profileRes.rows.length === 0) {
      res.status(404).json({ error: "Student profile not found" });
      return;
    }
    const profile = profileRes.rows[0];
    const schoolId = profile.school_id;

    let schoolName = profile.school || "Delhi Public School, R.K. Puram";
    if (schoolId) {
      const schRes = await query(`SELECT * FROM schools WHERE id = $1`, [schoolId]);
      if (schRes.rows.length > 0) schoolName = schRes.rows[0].name;
    }

    const enrollRes = await query(
      `SELECT * FROM class_enrollments WHERE student_id = $1 AND status = 'active' LIMIT 1`,
      [studentId]
    );
    const classroomId = enrollRes.rows[0]?.classroom_id;
    let section = "A";

    if (classroomId) {
      const cRes = await query(`SELECT * FROM classrooms WHERE id = $1`, [classroomId]);
      if (cRes.rows.length > 0) {
        section = cRes.rows[0].section || "A";
      }
    }

    let teachers: any[] = [];
    if (classroomId) {
      const tClassRes = await query(
        `SELECT tp.name, tc.subject, u.email
         FROM teacher_classrooms tc
         JOIN teacher_profiles tp ON tc.teacher_id = tp.id
         JOIN users u ON tp.user_id = u.id
         WHERE tc.classroom_id = $1`,
        [classroomId]
      );
      teachers = tClassRes.rows.map(t => ({
        name: t.name,
        subject: t.subject || "Teacher",
        email: t.email
      }));
    }

    res.json({
      school: schoolName,
      schoolId,
      classLevel: profile.class_level,
      section,
      classroomId,
      teachers: teachers.length > 0 ? teachers : [
        { name: "Ms. Sunita Sharma", subject: "Mathematics", email: "teacher@sikshasetu.edu" }
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching classroom: ${err.message}` });
  }
});

// POST /api/student/onboarding (Select class 6-12, name, language)
studentRouter.post("/onboarding", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, classLevel, school, preferredLanguage } = req.body;
  const studentId = req.user!.profileId;

  if (!classLevel || classLevel < 6 || classLevel > 12) {
    res.status(400).json({ error: "Valid Class selection (Class 6 to 12) is required" });
    return;
  }

  try {
    await query(
      `UPDATE student_profiles
       SET name = COALESCE($1, name), class_level = $2, school = COALESCE($3, school), preferred_language = COALESCE($4, preferred_language)
       WHERE id = $5`,
      [name, Number(classLevel), school, preferredLanguage, studentId]
    );

    res.json({
      success: true,
      message: `You've selected Class ${classLevel}. Ready for your learning check.`,
      classLevel: Number(classLevel)
    });
  } catch (err: any) {
    res.status(500).json({ error: `Onboarding update failed: ${err.message}` });
  }
});

// GET /api/student/diagnostic/status
studentRouter.get("/diagnostic/status", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const status = await DiagnosticEngine.getStatus(studentId);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: `Failed checking diagnostic status: ${err.message}` });
  }
});

// POST /api/student/diagnostic/start
studentRouter.post("/diagnostic/start", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const requestedClass = req.body?.classLevel;

  try {
    const result = await DiagnosticEngine.startDiagnostic(studentId, requestedClass);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Failed starting diagnostic: ${err.message}` });
  }
});

// POST /api/student/diagnostic/submit-answer
studentRouter.post("/diagnostic/submit-answer", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { attemptId, questionId, selectedAnswer } = req.body;

  if (!attemptId || !questionId || selectedAnswer === undefined) {
    res.status(400).json({ error: "Missing attemptId, questionId, or selectedAnswer" });
    return;
  }

  try {
    const result = await DiagnosticEngine.submitAnswer(attemptId, questionId, selectedAnswer);
    if (result.isCompleted) {
      // Trigger authoritative achievement check
      await StreakAchievementEngine.evaluateAchievements(req.user!.profileId);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Failed submitting answer: ${err.message}` });
  }
});

// GET /api/student/profile (Strict privacy: NO diagnostic scores or Group A/B/C)
studentRouter.get("/profile", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const profile = await LearningEvidenceEngine.getStudentEvidenceProfile(studentId);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching profile: ${err.message}` });
  }
});

// GET /api/student/progress/subject-wise (Dedicated Subject Progress Page)
studentRouter.get("/progress/subject-wise", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const detailedProgress = await LearningEvidenceEngine.getDetailedSubjectProgress(studentId);
    res.json(detailedProgress);
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching subject progress: ${err.message}` });
  }
});

// GET /api/student/progress (Comprehensive Student Progress)
studentRouter.get("/progress", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const detailedProgress = await LearningEvidenceEngine.getDetailedSubjectProgress(studentId);
    const achievementsData = await StreakAchievementEngine.getStudentAchievements(studentId);

    res.json({
      hasSufficientEvidence: detailedProgress.hasSufficientEvidence,
      emptyMessage: detailedProgress.emptyMessage,
      subjects: detailedProgress.subjects,
      streak: achievementsData.streak,
      achievements: achievementsData.achievements,
      totalXp: achievementsData.student.totalXp,
      learningLevel: achievementsData.student.learningLevel
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching student progress: ${err.message}` });
  }
});

// GET /api/student/practice/recommendations (Personalized Practice & Quizzes)
studentRouter.get("/practice/recommendations", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const recommendations = await PracticeEngine.getRecommendations(studentId);
    const quizOptions = [
      { id: "quick", type: "Quick Quiz", title: "5-Minute Rapid Check", minutes: 5, description: "Fast 3-question booster" },
      { id: "topic", type: "Topic Quiz", title: "Core Topic Mastery", minutes: 10, description: "Focused on current active topic" },
      { id: "subject", type: "Subject Quiz", title: "Comprehensive Subject Review", minutes: 15, description: "Across all active skills" },
      { id: "challenge", type: "Challenge Quiz", title: "High-Streak Clash Duel", minutes: 20, description: "Advanced practice mode with bonus XP" },
    ];

    res.json({
      recommendations,
      quizOptions
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching practice recommendations: ${err.message}` });
  }
});

// POST /api/student/practice/start (Start real interactive practice session)
studentRouter.post("/practice/start", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const session = await PracticeEngine.startPracticeSession(studentId, req.body || {});
    res.json({
      practiceId: session.sessionId,
      sessionId: session.sessionId,
      ...session
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed starting practice session: ${err.message}` });
  }
});

// POST /api/student/practice/:sessionId/submit (Submit practice session and update evidence)
studentRouter.post("/practice/:sessionId/submit", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const { sessionId } = req.params;
  const { answers } = req.body;

  if (!answers || typeof answers !== "object") {
    res.status(400).json({ error: "Answers object is required" });
    return;
  }

  try {
    const result = await PracticeEngine.submitPracticeSession(studentId, sessionId, answers);
    const subProgRes = await query(`SELECT subject, progress_score, growth FROM subject_progress WHERE student_id = $1`, [studentId]);
    res.json({
      success: true,
      score: result.score,
      totalQuestions: result.maxScore || Object.keys(answers).length,
      percentage: result.percentage,
      xpEarned: result.xpEarned,
      skillUpdated: result.skillUpdated,
      results: result.responses,
      progressUpdates: subProgRes.rows.map(r => ({
        subject: r.subject,
        progressScore: Number(r.progress_score) || 0,
        growth: Number(r.growth) || 0
      })),
      newAchievements: result.newAchievements
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed submitting practice: ${err.message}` });
  }
});

// POST /api/student/quizzes/start (Start real interactive quiz)
studentRouter.post("/quizzes/start", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const { quizType = "Quick", subject, topic } = req.body || {};

  try {
    const quizSession = await PracticeEngine.startQuiz(studentId, quizType, subject, topic);
    res.json(quizSession);
  } catch (err: any) {
    res.status(500).json({ error: `Failed starting quiz: ${err.message}` });
  }
});

// POST /api/student/quizzes/:attemptId/submit (Submit quiz answers and award XP)
studentRouter.post("/quizzes/:attemptId/submit", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const { attemptId } = req.params;
  const { answers } = req.body;

  if (!answers || typeof answers !== "object") {
    res.status(400).json({ error: "Answers object is required" });
    return;
  }

  try {
    const result = await PracticeEngine.submitQuiz(studentId, attemptId, answers);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: `Failed submitting quiz: ${err.message}` });
  }
});

// GET /api/student/achievements (Redesigned gamified trophy room & progress)
studentRouter.get("/achievements", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const overview = await StreakAchievementEngine.getStudentAchievements(studentId);
    res.json({
      stats: {
        totalXp: overview.student.totalXp,
        streakDays: overview.streak.currentStreak,
        achievementsUnlocked: overview.summary.unlockedCount,
        totalAchievements: overview.summary.totalAchievements,
        learningLevel: overview.student.learningLevel.level
      },
      student: overview.student,
      streak: overview.streak,
      summary: overview.summary,
      categories: overview.categories,
      featuredAchievement: overview.featuredAchievement ? {
        id: overview.featuredAchievement.code,
        code: overview.featuredAchievement.code,
        title: overview.featuredAchievement.title,
        description: overview.featuredAchievement.description,
        category: overview.featuredAchievement.category,
        icon: overview.featuredAchievement.iconName,
        xpReward: overview.featuredAchievement.xpReward,
        isUnlocked: overview.featuredAchievement.isUnlocked,
        unlockedAt: overview.featuredAchievement.unlockedAt || null,
        progressText: overview.featuredAchievement.progressLabel,
        progressPercent: overview.featuredAchievement.progressPercentage
      } : null,
      achievements: overview.achievements.map((a) => ({
        id: a.code,
        code: a.code,
        title: a.title,
        description: a.description,
        category: a.category,
        icon: a.iconName,
        xpReward: a.xpReward,
        isUnlocked: a.isUnlocked,
        unlockedAt: a.unlockedAt || null,
        progressText: a.progressLabel,
        progressPercent: a.progressPercentage
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching achievements: ${err.message}` });
  }
});

// GET /api/student/competition/connections (Active battles and pending challenges)
studentRouter.get("/competition/connections", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const connRes = await query(
      `SELECT cc.id, cc.status, cc.created_at, cc.accepted_at,
              cc.requester_student_id, cc.recipient_student_id,
              req_sp.name as requester_name, req_sp.xp as requester_xp, req_strk.current_streak as requester_streak,
              rec_sp.name as recipient_name, rec_sp.xp as recipient_xp, rec_strk.current_streak as recipient_streak
       FROM competition_connections cc
       JOIN student_profiles req_sp ON cc.requester_student_id = req_sp.id
       JOIN student_profiles rec_sp ON cc.recipient_student_id = rec_sp.id
       LEFT JOIN student_streaks req_strk ON req_sp.id = req_strk.student_id
       LEFT JOIN student_streaks rec_strk ON rec_sp.id = rec_strk.student_id
       WHERE cc.requester_student_id = $1 OR cc.recipient_student_id = $1
       ORDER BY cc.created_at DESC`,
      [studentId]
    );

    const competitors: any[] = [];
    const pendingIncoming: any[] = [];
    const pendingOutgoing: any[] = [];

    for (const c of connRes.rows) {
      const isRequester = c.requester_student_id === studentId;
      const competitorId = isRequester ? c.recipient_student_id : c.requester_student_id;
      const competitorName = isRequester ? c.recipient_name : c.requester_name;
      const competitorXp = isRequester ? c.recipient_xp : c.requester_xp;
      const competitorStreak = isRequester ? c.recipient_streak : c.requester_streak;

      if (c.status === "accepted") {
        competitors.push({
          connectionId: c.id,
          competitorId,
          name: competitorName,
          xp: competitorXp || 0,
          streak: competitorStreak || 1,
          acceptedAt: c.accepted_at
        });
      } else if (c.status === "pending") {
        if (isRequester) {
          pendingOutgoing.push({
            connectionId: c.id,
            competitorId,
            name: competitorName,
            createdAt: c.created_at
          });
        } else {
          pendingIncoming.push({
            connectionId: c.id,
            competitorId,
            name: competitorName,
            createdAt: c.created_at
          });
        }
      }
    }

    res.json({
      competitors,
      pendingIncoming,
      pendingOutgoing
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching competition connections: ${err.message}` });
  }
});

// POST /api/student/competition/request (Send Friendly Fire challenge)
studentRouter.post("/competition/request", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requesterId = req.user!.profileId;
  const recipientStudentId = req.body.recipientStudentId || req.body.targetStudentId || req.body.studentId;

  if (!recipientStudentId || recipientStudentId === requesterId) {
    res.status(400).json({ error: "Invalid recipient student ID" });
    return;
  }

  try {
    // Check if existing connection
    const existing = await query(
      `SELECT * FROM competition_connections
       WHERE (requester_student_id = $1 AND recipient_student_id = $2)
          OR (requester_student_id = $2 AND recipient_student_id = $1)`,
      [requesterId, recipientStudentId]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: `Connection already exists with status: ${existing.rows[0].status}` });
      return;
    }

    const connId = `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await query(
      `INSERT INTO competition_connections (id, requester_student_id, recipient_student_id, status)
       VALUES ($1, $2, $3, $4)`,
      [connId, requesterId, recipientStudentId, "pending"]
    );

    res.status(201).json({
      success: true,
      message: "Friendly Fire challenge sent!",
      connectionId: connId
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed sending competition request: ${err.message}` });
  }
});

// POST /api/student/competition/:id/accept
studentRouter.post("/competition/:id/accept", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const { id } = req.params;

  try {
    const connRes = await query(
      `SELECT * FROM competition_connections WHERE id = $1 AND recipient_student_id = $2`,
      [id, studentId]
    );

    if (connRes.rows.length === 0) {
      res.status(404).json({ error: "Pending challenge not found or unauthorized" });
      return;
    }

    await query(
      `UPDATE competition_connections SET status = 'accepted', accepted_at = $1 WHERE id = $2`,
      [new Date().toISOString(), id]
    );

    res.json({ success: true, message: "Challenge accepted! Friendly Fire is ON 🔥" });
  } catch (err: any) {
    res.status(500).json({ error: `Failed accepting challenge: ${err.message}` });
  }
});

// POST /api/student/competition/:id/decline
studentRouter.post("/competition/:id/decline", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const { id } = req.params;

  try {
    const connRes = await query(
      `SELECT * FROM competition_connections WHERE id = $1 AND (recipient_student_id = $2 OR requester_student_id = $2)`,
      [id, studentId]
    );

    if (connRes.rows.length === 0) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }

    await query(`DELETE FROM competition_connections WHERE id = $1`, [id]);
    res.json({ success: true, message: "Challenge removed" });
  } catch (err: any) {
    res.status(500).json({ error: `Failed declining challenge: ${err.message}` });
  }
});

// GET /api/student/leaderboard (Friendly competition leaderboard)
studentRouter.get("/leaderboard", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const leaderboard = await StreakAchievementEngine.getFriendlyLeaderboard(studentId);
    res.json({ leaderboard });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching leaderboard: ${err.message}` });
  }
});

// GET /api/student/parent-link-code (Check active connection code status)
studentRouter.get("/parent-link-code", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const status = await parentLinkService.getActiveCodeStatus(studentId);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: `Failed checking connection code: ${err.message}` });
  }
});

// POST /api/student/parent-link-code/generate (Generate new cryptographic code)
studentRouter.post("/parent-link-code/generate", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const result = await parentLinkService.generateConnectionCode(studentId);
    res.json({
      success: true,
      code: result.code,
      expiresAt: result.expiresAt,
      message: "Share this code with your parent or guardian. It will expire in 48 hours."
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed generating connection code: ${err.message}` });
  }
});

// POST /api/student/parent-link-code/revoke (Revoke active code)
studentRouter.post("/parent-link-code/revoke", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const revoked = await parentLinkService.revokeActiveCode(studentId);
    res.json({ success: true, revoked });
  } catch (err: any) {
    res.status(500).json({ error: `Failed revoking connection code: ${err.message}` });
  }
});

// GET /api/student/linked-parents (View connected parents/guardians)
studentRouter.get("/linked-parents", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const parents = await parentLinkService.getLinkedParentsForStudent(studentId);
    res.json({ parents });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching connected parents: ${err.message}` });
  }
});

// GET /api/student/assessments (List teacher-assigned adaptive assessments for this student)
studentRouter.get("/assessments", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const studentProfileRes = await query(`SELECT * FROM student_profiles WHERE id = $1`, [studentId]);
    if (studentProfileRes.rows.length === 0) {
      res.status(404).json({ error: "Student profile not found" });
      return;
    }
    const student = studentProfileRes.rows[0];

    // Check classroom enrollment
    const enrollRes = await query(
      `SELECT classroom_id FROM class_enrollments WHERE student_id = $1 AND status = 'active'`,
      [studentId]
    );
    const classroomId = enrollRes.rows[0]?.classroom_id;

    // Check if there are active adaptive assessments for the student's class level not yet assigned to this student
    const unassignedAsmtsRes = await query(
      `SELECT asm.*, tp.name as teacher_name
       FROM adaptive_assessments asm
       LEFT JOIN teacher_profiles tp ON asm.teacher_id = tp.id
       WHERE (asm.class_level = $1 OR (asm.classroom_id = $2 AND $2 IS NOT NULL))
         AND asm.id NOT IN (
           SELECT assessment_id FROM assessment_assignments WHERE student_id = $3
         )`,
      [student.class_level, classroomId || null, studentId]
    );

    // Auto-create missing assignment record for newly joined or unassigned students
    if (unassignedAsmtsRes.rows.length > 0) {
      const diagRes = await query(
        `SELECT group_type FROM diagnostic_results WHERE student_id = $1 ORDER BY completed_at DESC LIMIT 1`,
        [studentId]
      );
      const groupType = diagRes.rows[0]?.group_type || "GROUP_B";

      for (const asmt of unassignedAsmtsRes.rows) {
        const peerAssignRes = await query(
          `SELECT assigned_question_ids FROM assessment_assignments WHERE assessment_id = $1 AND group_type = $2 LIMIT 1`,
          [asmt.id, groupType]
        );

        let questionIds: string[] = [];
        if (peerAssignRes.rows.length > 0) {
          try {
            questionIds = typeof peerAssignRes.rows[0].assigned_question_ids === "string"
              ? JSON.parse(peerAssignRes.rows[0].assigned_question_ids)
              : peerAssignRes.rows[0].assigned_question_ids;
          } catch {
            questionIds = [];
          }
        }

        if (questionIds.length === 0) {
          const qRes = await query(
            `SELECT id FROM questions WHERE class_level = $1 AND subject = $2 LIMIT 5`,
            [asmt.class_level, asmt.subject]
          );
          questionIds = qRes.rows.map(q => q.id);
        }

        const assignmentId = `asgn-${Date.now()}-${studentId.slice(-6)}-${Math.random().toString(36).slice(2, 5)}`;
        await query(
          `INSERT INTO assessment_assignments (id, assessment_id, student_id, group_type, assigned_question_ids, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [assignmentId, asmt.id, studentId, groupType, JSON.stringify(questionIds), "pending"]
        );
      }
    }

    // Now fetch all assignments for this student
    const assignRes = await query(
      `SELECT asg.*, asm.title, asm.subject, asm.topics, asm.purpose, asm.question_count, asm.created_at,
              tp.name as teacher_name, att.score, att.max_score, att.percentage, att.submitted_at
       FROM assessment_assignments asg
       JOIN adaptive_assessments asm ON asg.assessment_id = asm.id
       LEFT JOIN teacher_profiles tp ON asm.teacher_id = tp.id
       LEFT JOIN assessment_attempts att ON asg.id = att.assignment_id
       WHERE asg.student_id = $1
       ORDER BY asm.created_at DESC`,
      [studentId]
    );

    const assessments = assignRes.rows.map(row => {
      let topics: string[] = [];
      try {
        topics = typeof row.topics === "string" ? JSON.parse(row.topics) : row.topics;
      } catch {
        topics = [row.subject];
      }

      return {
        assignmentId: row.id,
        assessmentId: row.assessment_id,
        title: row.title,
        subject: row.subject,
        topics,
        teacherName: row.teacher_name || "Class Teacher",
        purpose: row.purpose || "Formative Adaptive Check",
        questionCount: Number(row.question_count) || (Array.isArray(topics) ? topics.length : 5),
        status: row.status as "pending" | "in_progress" | "submitted",
        createdAt: row.created_at,
        result: row.score !== null && row.score !== undefined ? {
          score: Number(row.score),
          maxScore: Number(row.max_score),
          percentage: Number(row.percentage),
          submittedAt: row.submitted_at
        } : null
      };
    });

    res.json({ assessments });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching assessments: ${err.message}` });
  }
});

// GET /api/student/assessments/:assignmentId (Fetch individual assessment questions)
studentRouter.get("/assessments/:assignmentId", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const { assignmentId } = req.params;

  try {
    const assignRes = await query(
      `SELECT asg.*, asm.title, asm.subject, asm.purpose, asm.topics, tp.name as teacher_name
       FROM assessment_assignments asg
       JOIN adaptive_assessments asm ON asg.assessment_id = asm.id
       LEFT JOIN teacher_profiles tp ON asm.teacher_id = tp.id
       WHERE asg.id = $1 AND asg.student_id = $2`,
      [assignmentId, studentId]
    );

    if (assignRes.rows.length === 0) {
      res.status(404).json({ error: "Assessment assignment not found" });
      return;
    }

    const assignment = assignRes.rows[0];
    let qIds: string[] = [];
    try {
      qIds = typeof assignment.assigned_question_ids === "string"
        ? JSON.parse(assignment.assigned_question_ids)
        : assignment.assigned_question_ids;
    } catch {
      qIds = [];
    }

    const questionsRes = await query(`SELECT * FROM questions`);
    const questions = questionsRes.rows
      .filter((q: any) => qIds.includes(q.id))
      .map((q: any) => {
        let options: string[] = [];
        try {
          options = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
        } catch {
          options = [];
        }

        const isSubmitted = assignment.status === "submitted";
        return {
          id: q.id,
          text: q.question_text,
          questionText: q.question_text,
          options,
          skill: q.skill,
          marks: q.marks || 1,
          type: q.question_type || "MCQ",
          correctAnswer: isSubmitted ? q.correct_answer : undefined,
          explanation: isSubmitted ? q.explanation : undefined
        };
      });

    res.json({
      assignmentId: assignment.id,
      assessmentId: assignment.assessment_id,
      title: assignment.title,
      subject: assignment.subject,
      purpose: assignment.purpose,
      status: assignment.status,
      teacherName: assignment.teacher_name || "Teacher",
      questions
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching assessment details: ${err.message}` });
  }
});

// POST /api/student/assessments/:assignmentId/submit (Submit test answers)
studentRouter.post("/assessments/:assignmentId/submit", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const { assignmentId } = req.params;
  const { answers } = req.body;

  if (!answers || typeof answers !== "object") {
    res.status(400).json({ error: "Answers object is required" });
    return;
  }

  try {
    const result = await AdaptiveAssessmentEngine.submitAssessment(assignmentId, studentId, answers);
    await StreakAchievementEngine.evaluateAchievements(studentId);

    res.json({
      success: true,
      message: "Assessment submitted successfully! Progress and evidence updated.",
      result,
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed submitting assessment: ${err.message}` });
  }
});
