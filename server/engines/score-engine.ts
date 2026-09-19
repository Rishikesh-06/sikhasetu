import { getGroupByScore, getGroupCode, type LearningGroupCode } from "../config/thresholds";

export interface DiagnosticAnswerItem {
  questionId: string;
  subject: string;
  skill: string;
  topic: string;
  isCorrect: boolean;
  marks: number;
}

export interface ScoreEngineResult {
  rawScore: number;
  maximumScore: number;
  normalizedScore: number;
  groupType: LearningGroupCode;
  groupLabel: string;
  subjectScores: Record<string, number>;
  skillEvidence: Array<{
    subject: string;
    topic: string;
    skill: string;
    score: number;
    status: "Needs Support" | "Developing" | "Good" | "Strong";
  }>;
}

export class ScoreEngine {
  /**
   * Calculates the authoritative normalized score (0-100) and learning group
   */
  public static calculateDiagnosticResult(responses: DiagnosticAnswerItem[]): ScoreEngineResult {
    if (responses.length === 0) {
      return {
        rawScore: 0,
        maximumScore: 100,
        normalizedScore: 0,
        groupType: "GROUP_A",
        groupLabel: "Group A — Foundation Support",
        subjectScores: {},
        skillEvidence: []
      };
    }

    let rawScore = 0;
    let maximumScore = 0;

    const subjectStats: Record<string, { raw: number; max: number }> = {};
    const skillStats: Record<string, { subject: string; topic: string; skill: string; raw: number; max: number }> = {};

    for (const r of responses) {
      const earned = r.isCorrect ? r.marks : 0;
      rawScore += earned;
      maximumScore += r.marks;

      // Subject aggregation
      if (!subjectStats[r.subject]) {
        subjectStats[r.subject] = { raw: 0, max: 0 };
      }
      subjectStats[r.subject].raw += earned;
      subjectStats[r.subject].max += r.marks;

      // Skill aggregation
      const skillKey = `${r.subject}__${r.skill}`;
      if (!skillStats[skillKey]) {
        skillStats[skillKey] = {
          subject: r.subject,
          topic: r.topic,
          skill: r.skill,
          raw: 0,
          max: 0
        };
      }
      skillStats[skillKey].raw += earned;
      skillStats[skillKey].max += r.marks;
    }

    const normalizedScore = maximumScore > 0
      ? Math.min(100, Math.max(0, Math.round((rawScore / maximumScore) * 100)))
      : 0;

    const groupMeta = getGroupByScore(normalizedScore);

    const subjectScores: Record<string, number> = {};
    for (const [subj, data] of Object.entries(subjectStats)) {
      subjectScores[subj] = data.max > 0 ? Math.round((data.raw / data.max) * 100) : 50;
    }

    const skillEvidence = Object.values(skillStats).map(s => {
      const skillPct = s.max > 0 ? Math.round((s.raw / s.max) * 100) : 50;
      let status: "Needs Support" | "Developing" | "Good" | "Strong" = "Developing";
      if (skillPct >= 80) status = "Strong";
      else if (skillPct >= 65) status = "Good";
      else if (skillPct >= 50) status = "Developing";
      else status = "Needs Support";

      return {
        subject: s.subject,
        topic: s.topic,
        skill: s.skill,
        score: skillPct,
        status
      };
    });

    return {
      rawScore,
      maximumScore,
      normalizedScore,
      groupType: groupMeta.code,
      groupLabel: groupMeta.label,
      subjectScores,
      skillEvidence
    };
  }
}
