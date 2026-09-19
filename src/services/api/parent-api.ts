import { apiClient } from "@/lib/api-client";
import type {
  ParentOverviewData,
  ParentChildSummary,
  ParentSubjectProgressData,
  ParentAssessmentItem,
  ParentAchievementItem
} from "@/data/types";
import type { StudentLearningPath } from "@/types/learning-path";

export const parentApi = {
  /**
   * Get all children linked to the active parent
   */
  async getChildren(): Promise<{ children: ParentChildSummary[] }> {
    return apiClient<{ children: ParentChildSummary[] }>("/parent/children");
  },

  /**
   * Get full overview for a specific linked child
   */
  async getChildOverview(studentId: string): Promise<ParentOverviewData> {
    return apiClient<ParentOverviewData>(`/parent/children/${studentId}/overview`);
  },

  /**
   * Get detailed subject progress & topics for a specific linked child
   */
  async getChildSubjectProgress(studentId: string): Promise<ParentSubjectProgressData> {
    return apiClient<ParentSubjectProgressData>(`/parent/children/${studentId}/subject-progress`);
  },

  /**
   * Get child's safe learning path constellation
   */
  async getChildLearningPath(studentId: string): Promise<{
    student: { id: string; name: string; classLevel: number; school: string };
    learningPath: StudentLearningPath;
  }> {
    return apiClient<{
      student: { id: string; name: string; classLevel: number; school: string };
      learningPath: StudentLearningPath;
    }>(`/parent/children/${studentId}/learning-path`);
  },

  /**
   * Get sanitized completed assessments for child
   */
  async getChildAssessments(studentId: string): Promise<{
    student: { id: string; name: string; classLevel: number; school: string };
    assessments: ParentAssessmentItem[];
  }> {
    return apiClient<{
      student: { id: string; name: string; classLevel: number; school: string };
      assessments: ParentAssessmentItem[];
    }>(`/parent/children/${studentId}/assessments`);
  },

  /**
   * Get unlocked achievements for child
   */
  async getChildAchievements(studentId: string): Promise<{
    student: { id: string; name: string; classLevel: number; school: string };
    achievements: ParentAchievementItem[];
  }> {
    return apiClient<{
      student: { id: string; name: string; classLevel: number; school: string };
      achievements: ParentAchievementItem[];
    }>(`/parent/children/${studentId}/achievements`);
  },

  /**
   * Link an additional child using a connection code
   */
  async linkChild(connectionCode: string, relationshipType: "parent" | "guardian" = "parent"): Promise<{
    success: boolean;
    student: { id: string; name: string; classLevel: number; school: string };
    relationshipId: string;
    message: string;
  }> {
    return apiClient<{
      success: boolean;
      student: { id: string; name: string; classLevel: number; school: string };
      relationshipId: string;
      message: string;
    }>("/parent/link-child", {
      method: "POST",
      body: JSON.stringify({ connectionCode, relationshipType })
    });
  },

  /**
   * Revoke connection to a child
   */
  async revokeChild(studentId: string): Promise<{ success: boolean; message: string }> {
    return apiClient<{ success: boolean; message: string }>(`/parent/children/${studentId}/revoke`, {
      method: "POST"
    });
  },

  /**
   * Legacy overview fallback
   */
  async getOverview(): Promise<ParentOverviewData> {
    return apiClient<ParentOverviewData>("/parent/overview");
  }
};
