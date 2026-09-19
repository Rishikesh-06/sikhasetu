import { Router, type Response } from "express";
import { query } from "../db";
import { authenticateToken, requireRole, type AuthenticatedRequest } from "../middleware/auth";
import { parentLinkService } from "../services/parent-link.service";
import { LearningPathEngine } from "../engines/learning-path-engine";

export const parentRouter = Router();

// Enforce parent role
parentRouter.use(authenticateToken);
parentRouter.use(requireRole("parent"));

/**
 * Middleware/helper to verify active relationship to requested student
 */
async function authorizeParentChild(parentId: string, studentId: string) {
  const authCheck = await parentLinkService.verifyParentChildAccess(parentId, studentId);
  return authCheck;
}

// GET /api/parent/children - List all connected children
parentRouter.get("/children", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parentId = req.user!.profileId;

  try {
    const children = await parentLinkService.getChildrenForParent(parentId);
    res.json({ children });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching children: ${err.message}` });
  }
});

// POST /api/parent/link-child - Link child via connection code
parentRouter.post("/link-child", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parentId = req.user!.profileId;
  const { connectionCode, relationshipType = "parent" } = req.body;

  if (!connectionCode) {
    res.status(400).json({ error: "Connection code is required." });
    return;
  }

  try {
    const result = await parentLinkService.verifyAndRedeemCode(
      connectionCode,
      parentId,
      relationshipType === "guardian" ? "guardian" : "parent"
    );

    res.status(201).json({
      success: true,
      student: result.student,
      relationshipId: result.relationshipId,
      message: `Successfully connected to ${result.student.name}!`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed linking child." });
  }
});

// POST /api/parent/children/:studentId/revoke - Revoke child link
parentRouter.post("/children/:studentId/revoke", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parentId = req.user!.profileId;
  const { studentId } = req.params;

  try {
    const revoked = await parentLinkService.revokeRelationship(parentId, studentId);
    if (!revoked) {
      res.status(404).json({ error: "Active relationship not found or already revoked." });
      return;
    }
    res.json({ success: true, message: "Relationship revoked successfully." });
  } catch (err: any) {
    res.status(500).json({ error: `Failed revoking relationship: ${err.message}` });
  }
});

// GET /api/parent/children/:studentId/overview - Full Child Overview
parentRouter.get("/children/:studentId/overview", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parentId = req.user!.profileId;
  const { studentId } = req.params;

  try {
    // 1. Authoritative relationship verification
    const authCheck = await authorizeParentChild(parentId, studentId);
    if (!authCheck.authorized || !authCheck.student) {
      res.status(403).json({ error: "Access denied. You do not have an active parent relationship with this student." });
      return;
    }

    const student = authCheck.student;

    // 2. Fetch real subject progress
    const subjectProgressRes = await query(
      `SELECT * FROM subject_progress WHERE student_id = $1 ORDER BY subject ASC`,
      [studentId]
    );

    // 3. Fetch real streak
    const streakRes = await query(
      `SELECT * FROM student_streaks WHERE student_id = $1`,
      [studentId]
    );
    const streak = streakRes.rows[0] || { current_streak: 0, longest_streak: 0, active_days: [0, 0, 0, 0, 0, 0, 0] };
    let activeDays = [0, 0, 0, 0, 0, 0, 0];
    try {
      activeDays = typeof streak.active_days === "string" ? JSON.parse(streak.active_days) : (streak.active_days || activeDays);
    } catch {}

    // 4. Fetch recent activity logs (safe student practice/quizzes)
    const activityRes = await query(
      `SELECT * FROM activity_logs WHERE student_id = $1 ORDER BY activity_date DESC LIMIT 5`,
      [studentId]
    );

    // 5. Fetch achievements / milestones
    const achRes = await query(
      `SELECT * FROM student_achievements WHERE student_id = $1 ORDER BY unlocked_at DESC LIMIT 5`,
      [studentId]
    );

    // 6. Fetch recent completed assessment attempts (sanitized)
    const assessRes = await query(
      `SELECT aa.id, aa.score, aa.max_score, aa.percentage, aa.submitted_at,
              a.title as assessment_title, a.subject, a.topics
       FROM assessment_attempts aa
       JOIN assessment_assignments asg ON aa.assignment_id = asg.id
       JOIN adaptive_assessments a ON asg.assessment_id = a.id
       WHERE aa.student_id = $1 AND aa.submitted_at IS NOT NULL
       ORDER BY aa.submitted_at DESC LIMIT 5`,
      [studentId]
    );

    // 7. Fetch areas requiring attention from learning_evidence (status = 'Needs Support')
    const needsSupportRes = await query(
      `SELECT subject, topic, skill, mastery_score, status 
       FROM learning_evidence 
       WHERE student_id = $1 AND (status = 'Needs Support' OR mastery_score < 60)
       ORDER BY mastery_score ASC LIMIT 3`,
      [studentId]
    );

    // Calculate real averages
    const subjects = subjectProgressRes.rows;
    const avgProgress = subjects.length > 0
      ? Math.round(subjects.reduce((sum, s) => sum + Number(s.progress_score), 0) / subjects.length)
      : null;
    const avgGrowth = subjects.length > 0
      ? Math.round(subjects.reduce((sum, s) => sum + Number(s.growth), 0) / subjects.length)
      : null;

    // Generate supportive next focus message based on real data
    let nextFocus = "Begin recommended practice sessions to build foundational mastery.";
    if (needsSupportRes.rows.length > 0) {
      const topNeed = needsSupportRes.rows[0];
      nextFocus = `Support ${student.name.split(" ")[0]} with ${topNeed.subject}: ${topNeed.topic} (${topNeed.skill}).`;
    } else if (subjects.length > 0) {
      nextFocus = `Continue consistent daily practice in ${subjects[0].subject} to maintain upward momentum.`;
    }

    res.json({
      student: {
        id: student.id,
        name: student.name,
        classLevel: student.classLevel,
        school: student.school,
        relationshipType: authCheck.relationship?.type || "parent"
      },
      overallMastery: avgProgress,
      overallGrowth: avgGrowth,
      hasData: subjects.length > 0 || activityRes.rows.length > 0 || assessRes.rows.length > 0,
      subjects: subjects.map(s => ({
        subject: s.subject,
        score: Number(s.progress_score),
        growth: Number(s.growth),
        status: Number(s.progress_score) >= 75 ? "Good" : Number(s.progress_score) >= 60 ? "Developing" : "Needs Support"
      })),
      streak: {
        currentStreak: Number(streak.current_streak) || 0,
        longestStreak: Number(streak.longest_streak) || 0,
        activeDays
      },
      recentActivities: activityRes.rows.map(a => ({
        id: a.id,
        title: a.title,
        type: a.activity_type,
        date: a.activity_date,
        xp: a.xp_earned
      })),
      recentAssessments: assessRes.rows.map(a => ({
        id: a.id,
        title: a.assessment_title,
        subject: a.subject,
        topics: a.topics,
        date: a.submitted_at,
        percentage: Math.round(Number(a.percentage)),
        score: Number(a.score),
        maxScore: Number(a.max_score)
      })),
      milestones: achRes.rows.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        date: m.unlocked_at,
        xpReward: m.xp_reward
      })),
      areasRequiringAttention: needsSupportRes.rows.map(n => ({
        subject: n.subject,
        topic: n.topic,
        skill: n.skill,
        score: n.mastery_score,
        status: n.status
      })),
      nextFocus
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching child overview: ${err.message}` });
  }
});

// GET /api/parent/children/:studentId/subject-progress - Detailed Subject Evidence
parentRouter.get("/children/:studentId/subject-progress", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parentId = req.user!.profileId;
  const { studentId } = req.params;

  try {
    const authCheck = await authorizeParentChild(parentId, studentId);
    if (!authCheck.authorized || !authCheck.student) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    const progressRes = await query(
      `SELECT * FROM subject_progress WHERE student_id = $1 ORDER BY subject ASC`,
      [studentId]
    );

    const evidenceRes = await query(
      `SELECT * FROM learning_evidence WHERE student_id = $1 ORDER BY subject ASC, topic ASC`,
      [studentId]
    );

    // Group evidence by subject
    const subjectList = ["Mathematics", "Science", "English"];
    const subjectData = subjectList.map(subj => {
      const prog = progressRes.rows.find(p => p.subject.toLowerCase() === subj.toLowerCase());
      const evidence = evidenceRes.rows.filter(e => e.subject.toLowerCase() === subj.toLowerCase());

      return {
        subject: subj,
        progressScore: prog ? Number(prog.progress_score) : null,
        growth: prog ? Number(prog.growth) : 0,
        status: prog
          ? (Number(prog.progress_score) >= 75 ? "Good" : Number(prog.progress_score) >= 60 ? "Developing" : "Needs Support")
          : "Not Started",
        topics: evidence.map(e => ({
          topic: e.topic,
          skill: e.skill,
          masteryScore: Number(e.mastery_score),
          status: e.status,
          evidenceCount: e.evidence_count
        }))
      };
    });

    res.json({
      student: authCheck.student,
      subjects: subjectData
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching subject progress: ${err.message}` });
  }
});

// GET /api/parent/children/:studentId/learning-path - Child's Safe Learning Path
parentRouter.get("/children/:studentId/learning-path", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parentId = req.user!.profileId;
  const { studentId } = req.params;

  try {
    const authCheck = await authorizeParentChild(parentId, studentId);
    if (!authCheck.authorized || !authCheck.student) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    const learningPath = await LearningPathEngine.getStudentLearningPath(studentId);
    res.json({
      student: authCheck.student,
      learningPath
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching learning path: ${err.message}` });
  }
});

// GET /api/parent/children/:studentId/assessments - Completed Assessments (Sanitized)
parentRouter.get("/children/:studentId/assessments", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parentId = req.user!.profileId;
  const { studentId } = req.params;

  try {
    const authCheck = await authorizeParentChild(parentId, studentId);
    if (!authCheck.authorized || !authCheck.student) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    const assessRes = await query(
      `SELECT aa.id, aa.score, aa.max_score, aa.percentage, aa.submitted_at,
              a.title as assessment_title, a.subject, a.topics, a.purpose
       FROM assessment_attempts aa
       JOIN assessment_assignments asg ON aa.assignment_id = asg.id
       JOIN adaptive_assessments a ON asg.assessment_id = a.id
       WHERE aa.student_id = $1 AND aa.submitted_at IS NOT NULL
       ORDER BY aa.submitted_at DESC`,
      [studentId]
    );

    res.json({
      student: authCheck.student,
      assessments: assessRes.rows.map(a => ({
        id: a.id,
        title: a.assessment_title,
        subject: a.subject,
        topics: a.topics,
        purpose: a.purpose || "Assessment",
        submittedAt: a.submitted_at,
        score: Number(a.score),
        maxScore: Number(a.max_score),
        percentage: Math.round(Number(a.percentage))
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching assessments: ${err.message}` });
  }
});

// GET /api/parent/children/:studentId/achievements - Child Unlocked Achievements
parentRouter.get("/children/:studentId/achievements", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parentId = req.user!.profileId;
  const { studentId } = req.params;

  try {
    const authCheck = await authorizeParentChild(parentId, studentId);
    if (!authCheck.authorized || !authCheck.student) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    const achRes = await query(
      `SELECT * FROM student_achievements WHERE student_id = $1 ORDER BY unlocked_at DESC`,
      [studentId]
    );

    res.json({
      student: authCheck.student,
      achievements: achRes.rows.map(m => ({
        id: m.id,
        badgeId: m.badge_id,
        title: m.title,
        description: m.description,
        icon: m.icon,
        xpReward: m.xp_reward,
        unlockedAt: m.unlocked_at
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching achievements: ${err.message}` });
  }
});

// Backward-compatible GET /api/parent/overview - Resolves first active child
parentRouter.get("/overview", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parentId = req.user!.profileId;

  try {
    const children = await parentLinkService.getChildrenForParent(parentId);
    if (children.length === 0) {
      res.status(404).json({ error: "No active children linked to this parent account." });
      return;
    }

    const firstStudentId = children[0].id;
    // Forward internally
    req.params = { studentId: firstStudentId };
    const authCheck = await authorizeParentChild(parentId, firstStudentId);
    if (!authCheck.authorized || !authCheck.student) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    // Reuse overview logic
    const student = authCheck.student;
    const subjectProgressRes = await query(`SELECT * FROM subject_progress WHERE student_id = $1 ORDER BY subject ASC`, [firstStudentId]);
    const streakRes = await query(`SELECT * FROM student_streaks WHERE student_id = $1`, [firstStudentId]);
    const streak = streakRes.rows[0] || { current_streak: 0, longest_streak: 0, active_days: [0, 0, 0, 0, 0, 0, 0] };
    let activeDays = [0, 0, 0, 0, 0, 0, 0];
    try {
      activeDays = typeof streak.active_days === "string" ? JSON.parse(streak.active_days) : (streak.active_days || activeDays);
    } catch {}

    const activityRes = await query(`SELECT * FROM activity_logs WHERE student_id = $1 ORDER BY activity_date DESC LIMIT 5`, [firstStudentId]);
    const achRes = await query(`SELECT * FROM student_achievements WHERE student_id = $1 ORDER BY unlocked_at DESC LIMIT 5`, [firstStudentId]);

    const subjects = subjectProgressRes.rows;
    const avgProgress = subjects.length > 0
      ? Math.round(subjects.reduce((sum, s) => sum + Number(s.progress_score), 0) / subjects.length)
      : null;
    const avgGrowth = subjects.length > 0
      ? Math.round(subjects.reduce((sum, s) => sum + Number(s.growth), 0) / subjects.length)
      : null;

    res.json({
      student: {
        id: student.id,
        name: student.name,
        classLevel: student.classLevel,
        school: student.school
      },
      overallMastery: avgProgress,
      overallGrowth: avgGrowth,
      hasData: subjects.length > 0 || activityRes.rows.length > 0,
      subjects: subjects.map(s => ({
        subject: s.subject,
        score: Number(s.progress_score),
        growth: Number(s.growth),
        status: Number(s.progress_score) >= 75 ? "Good" : Number(s.progress_score) >= 60 ? "Developing" : "Needs Support"
      })),
      streak: {
        currentStreak: Number(streak.current_streak) || 0,
        activeDays
      },
      recentActivities: activityRes.rows.map(a => ({
        id: a.id,
        title: a.title,
        date: a.activity_date
      })),
      milestones: achRes.rows.map(m => ({
        title: m.title,
        description: m.description,
        date: m.unlocked_at
      })),
      nextFocus: "Consistent daily practice in active subjects."
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching overview: ${err.message}` });
  }
});
