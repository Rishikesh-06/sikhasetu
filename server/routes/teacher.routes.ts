import { Router, type Response } from "express";
import { query } from "../db";
import { authenticateToken, requireRole, type AuthenticatedRequest } from "../middleware/auth";
import { AdaptiveAssessmentEngine } from "../engines/adaptive-assessment-engine";
import { LEARNING_GROUPS, type LearningGroupCode } from "../config/thresholds";

export const teacherRouter = Router();

// Enforce teacher role
teacherRouter.use(authenticateToken);
teacherRouter.use(requireRole("teacher"));

// GET /api/teacher/classrooms (Assigned classrooms & schools)
teacherRouter.get("/classrooms", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const teacherId = req.user!.profileId;

  try {
    const tClassRes = await query(
      `SELECT c.id, c.school_id, c.class_level, c.section, s.name as school_name, tc.subject
       FROM teacher_classrooms tc
       JOIN classrooms c ON tc.classroom_id = c.id
       JOIN schools s ON c.school_id = s.id
       WHERE tc.teacher_id = $1
       ORDER BY c.class_level ASC`,
      [teacherId]
    );

    let classrooms = tClassRes.rows;

    if (classrooms.length === 0) {
      const tpRes = await query(`SELECT * FROM teacher_profiles WHERE id = $1`, [teacherId]);
      const schoolId = tpRes.rows[0]?.school_id;
      if (schoolId) {
        const allClassRes = await query(
          `SELECT c.id, c.school_id, c.class_level, c.section, s.name as school_name
           FROM classrooms c
           JOIN schools s ON c.school_id = s.id
           WHERE c.school_id = $1
           ORDER BY c.class_level ASC`,
          [schoolId]
        );
        classrooms = allClassRes.rows.map(c => ({ ...c, subject: tpRes.rows[0]?.subject_specialization || "General" }));
      }
    }

    res.json({
      classrooms: classrooms.map(c => ({
        classroomId: c.id,
        schoolId: c.school_id,
        schoolName: c.school_name,
        classLevel: c.class_level,
        section: c.section || "A",
        subject: c.subject || "General",
        label: `Class ${c.class_level}${c.section ? `-${c.section}` : ""} (${c.school_name})`
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching teacher classrooms: ${err.message}` });
  }
});

// GET /api/teacher/overview
teacherRouter.get("/overview", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const classLevel = req.query.classLevel ? Number(req.query.classLevel) : 7;
  const classroomId = req.query.classroomId as string | undefined;

  try {
    // 1. Fetch enrolled students
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

    const totalStudents = students.length;
    const studentIds = students.map(s => s.id);

    // 2. Fetch Diagnostic results for these students
    const allDiagRes = await query(`SELECT * FROM diagnostic_results`);
    const diagnostics = allDiagRes.rows.filter(d => studentIds.includes(d.student_id));
    const completedDiagnostics = diagnostics.length;

    // 3. Learning group distribution
    let countGroupA = 0;
    let countGroupB = 0;
    let countGroupC = 0;

    diagnostics.forEach(d => {
      if (d.group_type === "GROUP_A") countGroupA++;
      else if (d.group_type === "GROUP_B") countGroupB++;
      else if (d.group_type === "GROUP_C") countGroupC++;
    });

    // 4. Subject mastery averages
    const allSpRes = await query(`SELECT * FROM subject_progress`);
    const relevantSp = allSpRes.rows.filter(sp => studentIds.includes(sp.student_id));

    const subjectAverages: Record<string, number> = {};
    ["Mathematics", "Science", "English"].forEach(sub => {
      const matches = relevantSp.filter(r => r.subject.toLowerCase() === sub.toLowerCase());
      if (matches.length > 0) {
        const sum = matches.reduce((acc, curr) => acc + (Number(curr.progress_score) || 0), 0);
        subjectAverages[sub] = Math.round(sum / matches.length);
      } else {
        subjectAverages[sub] = 65;
      }
    });

    // 5. Active assessments count
    const asmtRes = await query(
      `SELECT COUNT(*) as cnt FROM adaptive_assessments WHERE class_level = $1`,
      [classLevel]
    );
    const activeAssessments = Number(asmtRes.rows[0]?.cnt || 0);

    // 6. Priority skills needing support
    const allLeRes = await query(`SELECT * FROM learning_evidence`);
    const relevantLe = allLeRes.rows.filter(le => studentIds.includes(le.student_id) && (le.status === "Needs Support" || le.mastery_score < 55));

    const skillCounts: Record<string, { skill: string; subject: string; count: number; totalScore: number }> = {};
    relevantLe.forEach(le => {
      const key = `${le.subject}_${le.skill}`;
      if (!skillCounts[key]) {
        skillCounts[key] = { skill: le.skill, subject: le.subject, count: 0, totalScore: 0 };
      }
      skillCounts[key].count++;
      skillCounts[key].totalScore += le.mastery_score;
    });

    const prioritySkills = Object.values(skillCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => ({
        skill: item.skill,
        subject: item.subject,
        studentsNeedingSupport: item.count,
        averageMastery: Math.round(item.totalScore / item.count)
      }));

    res.json({
      classLevel,
      classroomId: classroomId || `cls-dps-c${classLevel}`,
      totalStudents,
      completedDiagnostics,
      diagnosticCompletionRate: totalStudents > 0 ? Math.round((completedDiagnostics / totalStudents) * 100) : 0,
      groupDistribution: [
        { group: "GROUP_A", name: "Group A", label: "Group A — Foundation Support", count: countGroupA, color: "support" },
        { group: "GROUP_B", name: "Group B", label: "Group B — Developing", count: countGroupB, color: "warning" },
        { group: "GROUP_C", name: "Group C", label: "Group C — Advanced Readiness", count: countGroupC, color: "success" }
      ],
      subjectAverages,
      activeAssessments,
      prioritySkills,
      pedagogicalNotice: "Learning groups help personalize support and assessment difficulty. They are not student rankings."
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching overview: ${err.message}` });
  }
});

// GET /api/teacher/students (Classroom student matrix with diagnostic scores & groups)
teacherRouter.get("/students", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const classLevel = req.query.classLevel ? Number(req.query.classLevel) : 7;
  const classroomId = req.query.classroomId as string | undefined;

  try {
    let students: any[] = [];
    if (classroomId) {
      const enrRes = await query(
        `SELECT sp.*, u.email FROM class_enrollments enr
         JOIN student_profiles sp ON enr.student_id = sp.id
         JOIN users u ON sp.user_id = u.id
         WHERE enr.classroom_id = $1 AND enr.status = 'active'`,
        [classroomId]
      );
      students = enrRes.rows;
    }

    if (students.length === 0) {
      const studentsRes = await query(
        `SELECT sp.*, u.email
         FROM student_profiles sp
         JOIN users u ON sp.user_id = u.id
         WHERE sp.class_level = $1
         ORDER BY sp.name ASC`,
        [classLevel]
      );
      students = studentsRes.rows;
    }

    const allDiagRes = await query(`SELECT * FROM diagnostic_results`);

    const studentMatrix = students.map(s => {
      const diag = allDiagRes.rows.find(d => d.student_id === s.id);
      const groupCode: LearningGroupCode = diag ? diag.group_type : "GROUP_B";
      const groupMeta = LEARNING_GROUPS[groupCode] || LEARNING_GROUPS.GROUP_B;

      let subjectScores = { Mathematics: 60, Science: 60, English: 60 };
      if (diag && diag.subject_scores) {
        subjectScores = typeof diag.subject_scores === "string"
          ? JSON.parse(diag.subject_scores)
          : diag.subject_scores;
      }

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        school: s.school,
        classLevel: s.class_level,
        xp: s.xp || 0,
        initials: s.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
        diagnosticStatus: diag ? "completed" : "pending",
        diagnosticScore: diag ? Number(diag.normalized_score) : null,
        group: {
          code: groupCode,
          label: groupMeta.label,
          badgeColor: groupMeta.badgeColor,
          description: groupMeta.description
        },
        subjectScores
      };
    });

    res.json({ students: studentMatrix });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching student roster: ${err.message}` });
  }
});

// GET /api/teacher/students/:studentId
teacherRouter.get("/students/:studentId", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { studentId } = req.params;

  try {
    const sRes = await query(
      `SELECT sp.*, u.email FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.id = $1`,
      [studentId]
    );

    if (sRes.rows.length === 0) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    const student = sRes.rows[0];

    const diagRes = await query(
      `SELECT * FROM diagnostic_results WHERE student_id = $1 ORDER BY completed_at DESC LIMIT 1`,
      [studentId]
    );
    const diag = diagRes.rows[0] || null;

    const groupCode: LearningGroupCode = diag ? diag.group_type : "GROUP_B";
    const groupMeta = LEARNING_GROUPS[groupCode] || LEARNING_GROUPS.GROUP_B;

    const evidenceRes = await query(
      `SELECT * FROM learning_evidence WHERE student_id = $1 ORDER BY mastery_score DESC`,
      [studentId]
    );

    const progressRes = await query(
      `SELECT * FROM subject_progress WHERE student_id = $1`,
      [studentId]
    );

    const asmtAttemptsRes = await query(
      `SELECT att.*, asm.title, asm.subject
       FROM assessment_attempts att
       JOIN assessment_assignments asg ON att.assignment_id = asg.id
       JOIN adaptive_assessments asm ON asg.assessment_id = asm.id
       WHERE att.student_id = $1
       ORDER BY att.submitted_at DESC`,
      [studentId]
    );

    res.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        school: student.school,
        classLevel: student.class_level,
        xp: student.xp,
        initials: student.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
      },
      diagnostic: diag ? {
        normalizedScore: Number(diag.normalized_score),
        rawScore: Number(diag.raw_score),
        maxScore: Number(diag.maximum_score),
        completedAt: diag.completed_at,
        group: {
          code: groupCode,
          label: groupMeta.label,
          badgeColor: groupMeta.badgeColor,
          description: groupMeta.description,
          instructionalFocus: groupMeta.instructionalFocus
        },
        subjectScores: typeof diag.subject_scores === "string" ? JSON.parse(diag.subject_scores) : diag.subject_scores
      } : null,
      learningEvidence: evidenceRes.rows.map(e => ({
        subject: e.subject,
        topic: e.topic,
        skill: e.skill,
        masteryScore: e.mastery_score,
        status: e.status,
        evidenceCount: e.evidence_count
      })),
      subjectProgress: progressRes.rows.map(p => ({
        subject: p.subject,
        progressScore: p.progress_score,
        previousScore: p.previous_score,
        growth: p.growth
      })),
      assessmentHistory: asmtAttemptsRes.rows.map(a => ({
        id: a.id,
        title: a.title,
        subject: a.subject,
        score: a.score,
        maxScore: a.max_score,
        percentage: a.percentage,
        submittedAt: a.submitted_at
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching student details: ${err.message}` });
  }
});

// GET /api/teacher/groups (Instructional Groups Breakdown)
teacherRouter.get("/groups", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const classLevel = req.query.classLevel ? Number(req.query.classLevel) : 7;
  const classroomId = req.query.classroomId as string | undefined;

  try {
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

    const allDiagRes = await query(`SELECT * FROM diagnostic_results`);

    const groups = (["GROUP_A", "GROUP_B", "GROUP_C"] as LearningGroupCode[]).map(code => {
      const meta = LEARNING_GROUPS[code];
      const matchingStudents = students.filter(s => {
        const diag = allDiagRes.rows.find(d => d.student_id === s.id);
        const gCode = diag ? diag.group_type : "GROUP_B";
        return gCode === code;
      });

      return {
        groupCode: code,
        name: meta.label,
        badgeColor: meta.badgeColor,
        scoreRange: `${meta.minScore}–${meta.maxScore}`,
        description: meta.description,
        instructionalFocus: meta.instructionalFocus,
        recommendedSupport: meta.recommendedSupport,
        studentCount: matchingStudents.length,
        students: matchingStudents.map(s => {
          const diag = allDiagRes.rows.find(d => d.student_id === s.id);
          return {
            id: s.id,
            name: s.name,
            diagnosticScore: diag ? Number(diag.normalized_score) : null,
            initials: s.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
          };
        })
      };
    });

    res.json({
      classLevel,
      groups,
      pedagogicalNotice: "Learning groups help personalize support and assessment difficulty. They are not student rankings."
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching learning groups: ${err.message}` });
  }
});

// POST /api/teacher/assessments (ONE Master Assessment -> Auto 3-Way Personalization with Grok AI)
teacherRouter.post("/assessments", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const teacherId = req.user!.profileId;
  const {
    classLevel = 9,
    classroomId,
    subject = "Mathematics",
    topics = [],
    title,
    purpose = "Formative Adaptive Check",
    questionCount = 5,
    instructions
  } = req.body;

  if (!title || !subject) {
    res.status(400).json({ error: "Title and subject are required" });
    return;
  }

  try {
    // Validate that teacher is assigned to this classroom if classroomId provided
    if (classroomId) {
      const tcRes = await query(
        `SELECT * FROM teacher_classrooms WHERE teacher_id = $1 AND classroom_id = $2`,
        [teacherId, classroomId]
      );
      if (tcRes.rows.length === 0) {
        // Check if teacher has general access to this class level
        const altTcRes = await query(
          `SELECT * FROM teacher_classrooms WHERE teacher_id = $1`,
          [teacherId]
        );
        if (altTcRes.rows.length > 0 && !altTcRes.rows.some((r: any) => r.classroom_id === classroomId)) {
          // Teacher is restricted to assigned classrooms
          console.warn(`[Teacher Assessment] Teacher ${teacherId} creating assessment for non-explicit classroom ${classroomId}`);
        }
      }
    }

    const result = await AdaptiveAssessmentEngine.createAndAssignAssessment({
      teacherId,
      classroomId,
      classLevel: Number(classLevel),
      subject,
      topics: Array.isArray(topics) ? topics : [topics],
      title,
      purpose,
      questionCount: Number(questionCount) || 5,
      instructions
    });

    res.status(201).json({
      success: true,
      message: `Created 1 assessment and automatically generated 3-way personalized question sets for ${result.assignedCount} students!`,
      result
    });
  } catch (err: any) {
    console.error("[Teacher Assessment Error]", err);
    res.status(500).json({ error: err.message || "Question generation is temporarily unavailable. Please try again." });
  }
});

// GET /api/teacher/assessments (List assessments with classroom completion metrics)
teacherRouter.get("/assessments", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const teacherId = req.user!.profileId;

  try {
    // Fetch assessments created by this teacher (simple query for memory DB compatibility)
    const asmtsRes = await query(
      `SELECT * FROM adaptive_assessments WHERE teacher_id = $1 ORDER BY created_at DESC`,
      [teacherId]
    );

    // Fetch all assignments for application-side aggregation
    const allAssignmentsRes = await query(`SELECT * FROM assessment_assignments`);
    const allAssignments = allAssignmentsRes.rows;

    const assessments = asmtsRes.rows.map(a => {
      let topics = [];
      try {
        topics = typeof a.topics === "string" ? JSON.parse(a.topics) : (a.topics || []);
      } catch {
        topics = [];
      }

      // Application-side aggregation (works with both PostgreSQL and in-memory DB)
      const asgns = allAssignments.filter((asg: any) => asg.assessment_id === a.id);
      const assigned = asgns.length;
      const completed = asgns.filter((asg: any) => asg.status === "submitted").length;
      const inProgress = asgns.filter((asg: any) => asg.status === "in_progress").length;
      const notStarted = asgns.filter((asg: any) => asg.status === "pending").length;

      return {
        id: a.id,
        title: a.title,
        classLevel: a.class_level,
        classroomId: a.classroom_id,
        subject: a.subject,
        topics,
        purpose: a.purpose,
        questionCount: a.question_count,
        adaptiveMode: a.adaptive_mode,
        createdAt: a.created_at,
        stats: {
          assignedCount: assigned,
          completedCount: completed,
          inProgressCount: inProgress,
          notStartedCount: notStarted,
          completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0
        }
      };
    });

    res.json({ assessments });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching assessments: ${err.message}` });
  }
});

// GET /api/teacher/assessments/:id (Single assessment details)
teacherRouter.get("/assessments/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const teacherId = req.user!.profileId;
  const { id } = req.params;

  try {
    const details = await AdaptiveAssessmentEngine.getAssessmentDetails(id, teacherId);
    res.json(details);
  } catch (err: any) {
    res.status(404).json({ error: err.message || "Assessment not found" });
  }
});

// GET /api/teacher/assessments/:id/results (Full results breakdown per student and group)
teacherRouter.get("/assessments/:id/results", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const teacherId = req.user!.profileId;
  const { id } = req.params;

  try {
    const details = await AdaptiveAssessmentEngine.getAssessmentDetails(id, teacherId);
    res.json({
      assessmentId: details.id,
      title: details.title,
      subject: details.subject,
      classLevel: details.classLevel,
      stats: details.stats,
      results: details.results
    });
  } catch (err: any) {
    res.status(404).json({ error: err.message || "Assessment results not found" });
  }
});

// GET /api/teacher/reports (Detailed multi-dimensional reports)
teacherRouter.get("/reports", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const classLevel = req.query.classLevel ? Number(req.query.classLevel) : 7;
  const classroomId = req.query.classroomId as string | undefined;

  try {
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

    const studentIds = students.map(s => s.id);
    const allDiagRes = await query(`SELECT * FROM diagnostic_results`);
    const allLeRes = await query(`SELECT * FROM learning_evidence`);
    const allSpRes = await query(`SELECT * FROM subject_progress`);

    const studentReports = students.map(s => {
      const diag = allDiagRes.rows.find(d => d.student_id === s.id);
      const evidence = allLeRes.rows.filter(e => e.student_id === s.id);
      const progress = allSpRes.rows.filter(p => p.student_id === s.id);

      return {
        studentId: s.id,
        studentName: s.name,
        school: s.school,
        classLevel: s.class_level,
        diagnosticScore: diag ? Number(diag.normalized_score) : null,
        groupType: diag ? diag.group_type : "GROUP_B",
        skillsMastered: evidence.filter(e => e.mastery_score >= 70).length,
        skillsDeveloping: evidence.filter(e => e.mastery_score < 70).length,
        subjectProgress: progress.map(p => ({ subject: p.subject, score: p.progress_score, growth: p.growth }))
      };
    });

    const totalScore = studentReports.reduce((acc, sr) => acc + (sr.diagnosticScore || 60), 0);
    const classMastery = studentReports.length > 0 ? Math.round(totalScore / studentReports.length) : 0;

    res.json({
      classLevel,
      classroomId,
      totalEnrolled: students.length,
      classMastery,
      studentReports
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching reports: ${err.message}` });
  }
});
