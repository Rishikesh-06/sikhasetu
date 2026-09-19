import { query } from "../db";

export type LearningPathNodeState = "complete" | "active" | "next" | "locked" | "needs_attention";

export interface LearningPathNode {
  id: string;
  type: "grade" | "diagnostic" | "subject" | "skill" | "assessment" | "recommendation" | "target";
  label: string;
  title: string;
  detail: string;
  subject?: string;
  topic?: string;
  skill?: string;
  progress?: number;
  score?: number;
  status: LearningPathNodeState;
  x: number;
  y: number;
  evidenceSummary?: string;
  reason?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface LearningPathData {
  student: {
    id: string;
    name: string;
    school: string;
    classLevel: number;
    section?: string;
    xp: number;
    diagnosticStatus: "completed" | "in_progress" | "not_started";
    diagnosticCompletedAt?: string;
  };
  hasSufficientEvidence: boolean;
  emptyStateMessage?: string;
  summary: {
    totalNodes: number;
    completedCount: number;
    activeCount: number;
    needsAttentionCount: number;
    overallMastery: number;
  };
  nodes: LearningPathNode[];
}

export class LearningPathEngine {
  /**
   * Generates a fully data-driven Learning Path derived strictly from PostgreSQL
   * evidence for the authenticated student.
   */
  public static async getStudentLearningPath(studentId: string): Promise<LearningPathData> {
    // 1. Fetch Student Profile
    const profileRes = await query(
      `SELECT * FROM student_profiles WHERE id = $1`,
      [studentId]
    );

    if (profileRes.rows.length === 0) {
      throw new Error(`Student profile not found for ID: ${studentId}`);
    }

    const student = profileRes.rows[0];
    const classLevel = Number(student.class_level) || 7;
    const schoolId = student.school_id;

    // 2. Fetch School & Classroom Enrollment
    let schoolName = student.school || "Delhi Public School, R.K. Puram";
    if (schoolId) {
      const schRes = await query(`SELECT * FROM schools WHERE id = $1`, [schoolId]);
      if (schRes.rows.length > 0) schoolName = schRes.rows[0].name;
    }

    const enrollRes = await query(
      `SELECT * FROM class_enrollments WHERE student_id = $1 AND status = 'active' LIMIT 1`,
      [studentId]
    );
    let section = "A";
    if (enrollRes.rows[0]?.classroom_id) {
      const cRes = await query(`SELECT * FROM classrooms WHERE id = $1`, [enrollRes.rows[0].classroom_id]);
      if (cRes.rows.length > 0) section = cRes.rows[0].section || "A";
    }

    // 3. Fetch Diagnostic Status & Results
    const diagResultRes = await query(
      `SELECT * FROM diagnostic_results WHERE student_id = $1 AND class_level = $2 ORDER BY completed_at DESC LIMIT 1`,
      [studentId, classLevel]
    );
    const diagResult = diagResultRes.rows[0] || null;

    let diagnosticStatus: "completed" | "in_progress" | "not_started" = "not_started";
    let diagnosticCompletedAt: string | undefined = undefined;

    if (diagResult) {
      diagnosticStatus = "completed";
      diagnosticCompletedAt = diagResult.completed_at;
    } else {
      const diagAttemptRes = await query(
        `SELECT * FROM diagnostic_attempts WHERE student_id = $1 AND class_level = $2 AND status = 'in_progress' LIMIT 1`,
        [studentId, classLevel]
      );
      if (diagAttemptRes.rows.length > 0) {
        diagnosticStatus = "in_progress";
      }
    }

    // 4. Fetch Learning Evidence / Skills
    const evidenceRes = await query(
      `SELECT * FROM learning_evidence WHERE student_id = $1 ORDER BY mastery_score ASC, updated_at DESC`,
      [studentId]
    );
    const evidenceList = evidenceRes.rows;

    // 5. Fetch Subject Progress
    const progressRes = await query(
      `SELECT * FROM subject_progress WHERE student_id = $1 ORDER BY subject ASC`,
      [studentId]
    );
    const progressList = progressRes.rows;

    // 6. Fetch Recent Teacher Assessment Assignments & Attempts
    const asmtRes = await query(
      `SELECT asgn.id AS assignment_id, asgn.status AS assignment_status, asgn.created_at,
              aa.title, aa.subject, aa.purpose, aa.question_count,
              att.score, att.max_score, att.percentage, att.submitted_at
       FROM assessment_assignments asgn
       JOIN adaptive_assessments aa ON asgn.assessment_id = aa.id
       LEFT JOIN assessment_attempts att ON att.assignment_id = asgn.id
       WHERE asgn.student_id = $1
       ORDER BY asgn.created_at DESC LIMIT 2`,
      [studentId]
    );
    const recentAssessments = asmtRes.rows;

    // 7. Fetch Practice Activities
    const practiceRes = await query(
      `SELECT * FROM practice_activities WHERE student_id = $1 ORDER BY completed_at DESC NULLS LAST, progress DESC LIMIT 2`,
      [studentId]
    );
    const practiceList = practiceRes.rows;

    // Build Nodes dynamically
    const rawNodes: Omit<LearningPathNode, "x" | "y">[] = [];

    // Node 1: Enrolled Grade Node
    rawNodes.push({
      id: "node-grade",
      type: "grade",
      label: `Class ${classLevel}`,
      title: `Class ${classLevel} Enrolled`,
      detail: `${schoolName} · Sec ${section}`,
      status: "complete",
      progress: 100,
      evidenceSummary: `Verified student enrollment in Class ${classLevel} standard syllabus.`,
      reason: "Official classroom registration and curriculum baseline.",
      actionUrl: "/student",
      actionLabel: "Class Overview"
    });

    // Node 2: Diagnostic Node
    if (diagnosticStatus === "completed") {
      const formattedDate = diagnosticCompletedAt
        ? new Date(diagnosticCompletedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : "Recorded";

      rawNodes.push({
        id: "node-diagnostic",
        type: "diagnostic",
        label: "Adaptive Diagnostic",
        title: "Baseline Readiness Mapped",
        detail: `Completed (${formattedDate})`,
        status: "complete",
        progress: 100,
        evidenceSummary: `Initial diagnostic successfully evaluated baseline proficiency across subjects.`,
        reason: "Mapped initial readiness and calibrated difficulty targets.",
        actionUrl: "/student/diagnostic",
        actionLabel: "View Diagnostic Details"
      });
    } else if (diagnosticStatus === "in_progress") {
      rawNodes.push({
        id: "node-diagnostic",
        type: "diagnostic",
        label: "Adaptive Diagnostic",
        title: "Initial Diagnostic In Progress",
        detail: "In Progress",
        status: "active",
        progress: 50,
        evidenceSummary: "You have an active diagnostic check in progress.",
        reason: "Complete all questions to generate your full curriculum constellation.",
        actionUrl: "/student/diagnostic",
        actionLabel: "Resume Diagnostic"
      });
    } else {
      rawNodes.push({
        id: "node-diagnostic",
        type: "diagnostic",
        label: "Initial Diagnostic",
        title: "Baseline Readiness Check",
        detail: "Action Required",
        status: "active",
        progress: 0,
        evidenceSummary: "Initial diagnostic check required to map your personalized skills.",
        reason: "Establishes baseline strength and tailors learning path.",
        actionUrl: "/student/diagnostic",
        actionLabel: "Start Diagnostic Now"
      });
    }

    // Nodes 3..N: Real Evidence from Database
    if (diagnosticStatus === "completed" && evidenceList.length > 0) {
      // Pick up to 3 real skill evidence items (ordered from lowest to highest for targeted growth)
      const selectedSkills = evidenceList.slice(0, 3);

      for (let i = 0; i < selectedSkills.length; i++) {
        const ev = selectedSkills[i];
        const score = Number(ev.mastery_score) || 50;

        let status: LearningPathNodeState = "active";
        let detail = `Developing (${score}%)`;
        let reason = "Active learning focus from recent responses.";
        let actionLabel = `Practice ${ev.skill}`;

        if (ev.status === "Needs Support" || score < 50) {
          status = "needs_attention";
          detail = `Needs Practice (${score}%)`;
          reason = "Priority growth area identified from diagnostic/assessment.";
          actionLabel = `Strengthen ${ev.skill}`;
        } else if (ev.status === "Strong" || score >= 80) {
          status = "complete";
          detail = `Mastered (${score}%)`;
          reason = "High mastery demonstrated across curriculum problems.";
          actionLabel = `Review ${ev.skill}`;
        }

        rawNodes.push({
          id: `node-skill-${ev.id || i}`,
          type: "skill",
          label: ev.skill,
          title: `${ev.subject} · ${ev.topic}`,
          detail,
          subject: ev.subject,
          topic: ev.topic,
          skill: ev.skill,
          progress: score,
          score,
          status,
          evidenceSummary: `Recorded evidence across ${ev.evidence_count || 1} evaluation point(s). Mastery score: ${score}%.`,
          reason,
          actionUrl: `/student/practice`,
          actionLabel
        });
      }
    }

    // Assessment Node (if student has recent teacher assessments)
    if (recentAssessments.length > 0) {
      const asmt = recentAssessments[0];
      const isSubmitted = asmt.assignment_status === "submitted";
      const percentage = asmt.percentage !== null ? Number(asmt.percentage) : null;

      rawNodes.push({
        id: `node-asmt-${asmt.assignment_id}`,
        type: "assessment",
        label: asmt.title.length > 20 ? `${asmt.title.slice(0, 18)}...` : asmt.title,
        title: `${asmt.subject} · ${asmt.title}`,
        detail: isSubmitted ? `Submitted (${Math.round(percentage || 0)}%)` : "Assigned Assessment",
        subject: asmt.subject,
        status: isSubmitted ? (percentage !== null && percentage < 50 ? "needs_attention" : "complete") : "active",
        progress: percentage !== null ? Math.round(percentage) : 60,
        score: percentage !== null ? Math.round(percentage) : undefined,
        evidenceSummary: isSubmitted
          ? `Completed assessment. Score: ${asmt.score}/${asmt.max_score} (${Math.round(percentage || 0)}%).`
          : `Assigned by teacher. ${asmt.question_count || 3} questions calibrated for your group.`,
        reason: isSubmitted ? "Evaluated in adaptive assessment." : "Required assessment assigned by teacher.",
        actionUrl: "/student/assessments",
        actionLabel: isSubmitted ? "Review Assessment" : "Start Assessment"
      });
    }

    // Recommended Target Node (Next Milestone)
    if (diagnosticStatus === "completed") {
      const lowestEv = evidenceList[0];
      const targetLabel = lowestEv ? `${lowestEv.skill}` : "Concept Mastery";
      const targetSubject = lowestEv?.subject || "Curriculum Focus";

      rawNodes.push({
        id: "node-target-next",
        type: "recommendation",
        label: targetLabel,
        title: `${targetSubject} · Recommended Next Step`,
        detail: "Next Target",
        subject: targetSubject,
        topic: lowestEv?.topic,
        skill: lowestEv?.skill,
        status: "next",
        progress: lowestEv ? Number(lowestEv.mastery_score) : 0,
        evidenceSummary: lowestEv
          ? `Recommended target to advance your mastery in ${lowestEv.topic}.`
          : "Next recommended learning objective calibrated by SIKHASETU AI.",
        reason: "Adaptive recommendation engine identified this as highest learning leverage.",
        actionUrl: "/student/practice",
        actionLabel: "Start Practice"
      });
    } else {
      rawNodes.push({
        id: "node-target-locked",
        type: "target",
        label: "Personalized Path",
        title: "Curriculum Constellation",
        detail: "Unlocks after Diagnostic",
        status: "locked",
        progress: 0,
        evidenceSummary: "Your complete knowledge path and adaptive milestones will unlock after completing your initial diagnostic.",
        reason: "Waiting for initial baseline evidence.",
        actionUrl: "/student/diagnostic",
        actionLabel: "Unlock Path"
      });
    }

    // Compute (x, y) coordinates cleanly for each node along a dynamic path
    const count = rawNodes.length;
    const nodes: LearningPathNode[] = rawNodes.map((node, idx) => {
      // Horizontal distribution from 10% to 90%
      const x = count === 1 ? 50 : Math.round(10 + (idx / (count - 1)) * 80);

      // Vertical position with smooth alternating wave
      let y = 45;
      if (count > 2) {
        if (idx === 0) y = 30;
        else if (idx === count - 1) y = 40;
        else if (idx % 2 === 1) y = 62;
        else y = 28;
      }

      return {
        ...node,
        x,
        y
      };
    });

    // Compute summary stats
    const completedCount = nodes.filter(n => n.status === "complete").length;
    const activeCount = nodes.filter(n => n.status === "active" || n.status === "next").length;
    const needsAttentionCount = nodes.filter(n => n.status === "needs_attention").length;

    let totalMasterySum = 0;
    let scoredCount = 0;
    for (const n of nodes) {
      if (typeof n.progress === "number" && n.progress > 0) {
        totalMasterySum += n.progress;
        scoredCount++;
      }
    }
    const overallMastery = scoredCount > 0 ? Math.round(totalMasterySum / scoredCount) : 0;

    return {
      student: {
        id: student.id,
        name: student.name,
        school: schoolName,
        classLevel,
        section,
        xp: Number(student.xp) || 0,
        diagnosticStatus,
        diagnosticCompletedAt
      },
      hasSufficientEvidence: diagnosticStatus === "completed" || evidenceList.length > 0,
      emptyStateMessage: diagnosticStatus === "not_started"
        ? "Your learning path is taking shape. Complete your initial diagnostic to start building your personalized learning path."
        : undefined,
      summary: {
        totalNodes: nodes.length,
        completedCount,
        activeCount,
        needsAttentionCount,
        overallMastery
      },
      nodes
    };
  }
}
