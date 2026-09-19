import { query } from "../db";

export interface SkillEvidenceItem {
  id: string;
  subject: string;
  topic: string;
  skill: string;
  score: number;
  status: "Needs Support" | "Developing" | "Good" | "Strong";
  evidenceCount: number;
  updatedAt?: string;
}

export interface DetailedSubjectProgress {
  subject: string;
  progressScore: number;
  previousScore: number;
  growth: number;
  strengthenedSkills: Array<{ skill: string; mastery: number; status: string }>;
  developingSkills: Array<{ skill: string; mastery: number; status: string }>;
  allSkills: SkillEvidenceItem[];
  nextRecommendedSkill: string;
  nextRecommendedTopic?: string;
  recentActivityCount: number;
}

export class LearningEvidenceEngine {
  /**
   * Records or updates learning evidence for a skill and recalculates subject progress
   */
  public static async recordEvidenceUpdate(
    studentId: string,
    subject: string,
    topic: string,
    skill: string,
    activityScorePct: number
  ): Promise<{ skillEvidence: SkillEvidenceItem; subjectScore: number; growth: number }> {
    const cleanSubject = subject.trim();
    const cleanTopic = topic.trim();
    const cleanSkill = skill.trim();
    const score = Math.max(0, Math.min(100, Math.round(activityScorePct)));

    // 1. Check existing learning evidence for this student + skill
    const evRes = await query(
      `SELECT * FROM learning_evidence WHERE student_id = $1 AND skill ILIKE $2`,
      [studentId, cleanSkill]
    );

    let updatedScore = score;
    let evidenceCount = 1;
    let evidenceId = `le-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

    if (evRes.rows.length > 0) {
      const existing = evRes.rows[0];
      evidenceId = existing.id;
      evidenceCount = (existing.evidence_count || 1) + 1;
      // Weighted rolling average: 60% previous mastery + 40% new activity
      updatedScore = Math.round(Number(existing.mastery_score) * 0.6 + score * 0.4);

      let status: "Needs Support" | "Developing" | "Good" | "Strong" = "Developing";
      if (updatedScore >= 80) status = "Strong";
      else if (updatedScore >= 70) status = "Good";
      else if (updatedScore >= 50) status = "Developing";
      else status = "Needs Support";

      await query(
        `UPDATE learning_evidence
         SET mastery_score = $1, status = $2, evidence_count = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [updatedScore, status, evidenceCount, evidenceId]
      );
    } else {
      let status: "Needs Support" | "Developing" | "Good" | "Strong" = "Developing";
      if (updatedScore >= 80) status = "Strong";
      else if (updatedScore >= 70) status = "Good";
      else if (updatedScore >= 50) status = "Developing";
      else status = "Needs Support";

      await query(
        `INSERT INTO learning_evidence (id, student_id, subject, topic, skill, mastery_score, status, evidence_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [evidenceId, studentId, cleanSubject, cleanTopic, cleanSkill, updatedScore, status, evidenceCount]
      );
    }

    // 2. Recalculate Subject Progress for this Subject
    const allSubjectEvRes = await query(
      `SELECT mastery_score FROM learning_evidence WHERE student_id = $1 AND subject ILIKE $2`,
      [studentId, cleanSubject]
    );

    let newSubjectScore = updatedScore;
    if (allSubjectEvRes.rows.length > 0) {
      const sum = allSubjectEvRes.rows.reduce((acc, r) => acc + Number(r.mastery_score), 0);
      newSubjectScore = Math.round(sum / allSubjectEvRes.rows.length);
    }

    // Check existing subject_progress
    const spRes = await query(
      `SELECT * FROM subject_progress WHERE student_id = $1 AND subject ILIKE $2`,
      [studentId, cleanSubject]
    );

    let previousScore = newSubjectScore;
    let growth = 0;

    if (spRes.rows.length > 0) {
      previousScore = Number(spRes.rows[0].progress_score);
      growth = newSubjectScore - previousScore;
      await query(
        `UPDATE subject_progress
         SET progress_score = $1, previous_score = $2, growth = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [newSubjectScore, previousScore, growth, spRes.rows[0].id]
      );
    } else {
      const spId = `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      previousScore = Math.max(20, newSubjectScore - 10);
      growth = newSubjectScore - previousScore;
      await query(
        `INSERT INTO subject_progress (id, student_id, subject, progress_score, previous_score, growth)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [spId, studentId, cleanSubject, newSubjectScore, previousScore, growth]
      );
    }

    let finalStatus: "Needs Support" | "Developing" | "Good" | "Strong" = "Developing";
    if (updatedScore >= 80) finalStatus = "Strong";
    else if (updatedScore >= 70) finalStatus = "Good";
    else if (updatedScore >= 50) finalStatus = "Developing";
    else finalStatus = "Needs Support";

    return {
      skillEvidence: {
        id: evidenceId,
        subject: cleanSubject,
        topic: cleanTopic,
        skill: cleanSkill,
        score: updatedScore,
        status: finalStatus,
        evidenceCount
      },
      subjectScore: newSubjectScore,
      growth
    };
  }

  /**
   * Fetches data-driven Subject-Wise Progress for the authenticated student
   */
  public static async getDetailedSubjectProgress(studentId: string): Promise<{
    hasSufficientEvidence: boolean;
    emptyMessage?: string;
    subjects: DetailedSubjectProgress[];
  }> {
    // 1. Fetch Diagnostic results to check if baseline check was completed
    const diagRes = await query(
      `SELECT * FROM diagnostic_results WHERE student_id = $1`,
      [studentId]
    );

    // 2. Fetch all learning evidence for student
    const leRes = await query(
      `SELECT * FROM learning_evidence WHERE student_id = $1 ORDER BY mastery_score ASC, updated_at DESC`,
      [studentId]
    );

    // 3. Fetch subject progress
    const spRes = await query(
      `SELECT * FROM subject_progress WHERE student_id = $1`,
      [studentId]
    );

    const evidenceList = leRes.rows;
    const hasEvidence = diagRes.rows.length > 0 || evidenceList.length > 0;

    if (!hasEvidence) {
      return {
        hasSufficientEvidence: false,
        emptyMessage: "Complete your diagnostic to begin building your subject profile.",
        subjects: []
      };
    }

    const standardSubjects = ["Mathematics", "Science", "English"];
    const subjects: DetailedSubjectProgress[] = standardSubjects.map(subName => {
      const sp = spRes.rows.find(r => r.subject.toLowerCase() === subName.toLowerCase());
      const subEvidence = evidenceList.filter(r => r.subject.toLowerCase() === subName.toLowerCase());

      const strengthened = subEvidence
        .filter(r => Number(r.mastery_score) >= 70)
        .map(s => ({ skill: s.skill, mastery: Number(s.mastery_score), status: s.status }));

      const developing = subEvidence
        .filter(r => Number(r.mastery_score) < 70)
        .map(s => ({ skill: s.skill, mastery: Number(s.mastery_score), status: s.status }));

      const allSkills: SkillEvidenceItem[] = subEvidence.map(s => ({
        id: s.id,
        subject: s.subject,
        topic: s.topic,
        skill: s.skill,
        score: Number(s.mastery_score),
        status: s.status,
        evidenceCount: s.evidence_count || 1,
        updatedAt: s.updated_at
      }));

      // Calculate real score from subskills or subject_progress
      let calculatedScore = 50;
      if (subEvidence.length > 0) {
        const sum = subEvidence.reduce((acc, r) => acc + Number(r.mastery_score), 0);
        calculatedScore = Math.round(sum / subEvidence.length);
      } else if (sp) {
        calculatedScore = Number(sp.progress_score);
      }

      const previousScore = sp ? Number(sp.previous_score) : Math.max(30, calculatedScore - 8);
      const growth = sp ? Number(sp.growth) : (calculatedScore - previousScore);

      // Lowest scoring skill is recommended next step
      const lowestDeveloping = subEvidence.find(r => Number(r.mastery_score) < 70);
      const nextSkill = lowestDeveloping ? lowestDeveloping.skill : (subEvidence[0]?.skill || `${subName} Core Concepts`);
      const nextTopic = lowestDeveloping ? lowestDeveloping.topic : subEvidence[0]?.topic;

      return {
        subject: subName,
        progressScore: calculatedScore,
        previousScore,
        growth,
        strengthenedSkills: strengthened,
        developingSkills: developing,
        allSkills,
        nextRecommendedSkill: nextSkill,
        nextRecommendedTopic: nextTopic,
        recentActivityCount: subEvidence.length
      };
    });

    return {
      hasSufficientEvidence: true,
      subjects
    };
  }

  /**
   * Fetches overview profile for student
   */
  public static async getStudentEvidenceProfile(studentId: string) {
    const profileRes = await query(`SELECT * FROM student_profiles WHERE id = $1`, [studentId]);
    if (profileRes.rows.length === 0) {
      throw new Error(`Student not found: ${studentId}`);
    }
    const student = profileRes.rows[0];

    const progressData = await this.getDetailedSubjectProgress(studentId);

    return {
      student: {
        id: student.id,
        name: student.name,
        school: student.school,
        classLevel: student.class_level,
        preferredLanguage: student.preferred_language,
        xp: Number(student.xp) || 0
      },
      hasSufficientEvidence: progressData.hasSufficientEvidence,
      emptyMessage: progressData.emptyMessage,
      subjects: progressData.subjects
    };
  }
}
