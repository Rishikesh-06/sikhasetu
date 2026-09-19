// Centralized Configuration for SIKHASETU Learning Groups & Thresholds

export const GROUP_A_MAX = 50;
export const GROUP_B_MAX = 70;
export const GROUP_C_MAX = 100;

export type LearningGroupCode = "GROUP_A" | "GROUP_B" | "GROUP_C";

export interface LearningGroupMetadata {
  code: LearningGroupCode;
  name: string;
  label: string;
  minScore: number;
  maxScore: number;
  instructionalFocus: string;
  difficultyProfile: ("FOUNDATIONAL" | "EASY" | "MEDIUM" | "HARD" | "ADVANCED")[];
  description: string;
  badgeTone: "support" | "warning" | "success";
}

export const LEARNING_GROUPS: Record<LearningGroupCode, LearningGroupMetadata> = {
  GROUP_A: {
    code: "GROUP_A",
    name: "Group A",
    label: "Group A — Foundation Support",
    minScore: 0,
    maxScore: GROUP_A_MAX,
    instructionalFocus: "Foundational concepts, prerequisite reinforcement, and guided practice routines",
    difficultyProfile: ["FOUNDATIONAL", "EASY", "MEDIUM"],
    description: "Foundational support required",
    badgeTone: "support"
  },
  GROUP_B: {
    code: "GROUP_B",
    name: "Group B",
    label: "Group B — Developing",
    minScore: GROUP_A_MAX + 1,
    maxScore: GROUP_B_MAX,
    instructionalFocus: "Standard grade-level reasoning, core applications, and multi-step problem solving",
    difficultyProfile: ["EASY", "MEDIUM", "HARD"],
    description: "Developing/moderate readiness",
    badgeTone: "warning"
  },
  GROUP_C: {
    code: "GROUP_C",
    name: "Group C",
    label: "Group C — Advanced Readiness",
    minScore: GROUP_B_MAX + 1,
    maxScore: GROUP_C_MAX,
    instructionalFocus: "Higher-order application, advanced inquiry, and deep conceptual extension",
    difficultyProfile: ["MEDIUM", "HARD", "ADVANCED"],
    description: "Strong readiness / advanced challenge",
    badgeTone: "success"
  }
};

export function getGroupByScore(normalizedScore: number): LearningGroupMetadata {
  if (normalizedScore <= GROUP_A_MAX) {
    return LEARNING_GROUPS.GROUP_A;
  }
  if (normalizedScore <= GROUP_B_MAX) {
    return LEARNING_GROUPS.GROUP_B;
  }
  return LEARNING_GROUPS.GROUP_C;
}

export function getGroupCode(normalizedScore: number): LearningGroupCode {
  return getGroupByScore(normalizedScore).code;
}
