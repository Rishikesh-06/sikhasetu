import { apiClient } from "@/lib/api-client";
import type {
  StudentProfileData,
  DiagnosticStartResponse,
  DiagnosticAnswerResponse,
  AssignedAssessment,
  PracticeItem,
  StudentProgressData,
  QuestionData,
  StudentClassroomInfo,
  DetailedSubjectProgress,
  CompetitionClassmate,
  CompetitionOverview,
  LearningPathData
} from "@/data/types";

export const studentApi = {
  async getLearningPath(): Promise<LearningPathData> {
    return apiClient<LearningPathData>("/student/learning-path");
  },

  async getClassroom(): Promise<StudentClassroomInfo> {
    return apiClient<StudentClassroomInfo>("/student/classroom");
  },

  async completeOnboarding(data: { name: string; classLevel: number; school?: string; preferredLanguage?: string }) {
    return apiClient<{ success: boolean; message: string; classLevel: number }>("/student/onboarding", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async getDiagnosticStatus(): Promise<DiagnosticStatusResponse> {
    return apiClient<DiagnosticStatusResponse>("/student/diagnostic/status");
  },

  async startDiagnostic(classLevel?: number): Promise<DiagnosticStartResponse> {
    return apiClient<DiagnosticStartResponse>("/student/diagnostic/start", {
      method: "POST",
      body: JSON.stringify({ classLevel })
    });
  },

  async submitDiagnosticAnswer(attemptId: string, questionId: string, selectedAnswer: string): Promise<DiagnosticAnswerResponse> {
    return apiClient<DiagnosticAnswerResponse>("/student/diagnostic/submit-answer", {
      method: "POST",
      body: JSON.stringify({ attemptId, questionId, selectedAnswer })
    });
  },

  async getProfile(): Promise<StudentProfileData> {
    return apiClient<StudentProfileData>("/student/profile");
  },

  async getAssessments(): Promise<{ assessments: AssignedAssessment[] }> {
    return apiClient<{ assessments: AssignedAssessment[] }>("/student/assessments");
  },

  async getAssessmentDetails(assignmentId: string): Promise<{
    assignmentId: string;
    title: string;
    subject: string;
    purpose: string;
    status: string;
    questions: QuestionData[];
  }> {
    return apiClient(`/student/assessments/${assignmentId}`);
  },

  async submitAssessment(assignmentId: string, answers: Record<string, string>) {
    return apiClient<{
      success: boolean;
      message: string;
      score: number;
      maxScore: number;
      percentage: number;
      xpEarned: number;
      responses: any[];
    }>(`/student/assessments/${assignmentId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers })
    });
  },

  async getSubjectWiseProgress(): Promise<{ subjects: DetailedSubjectProgress[] }> {
    return apiClient<{ subjects: DetailedSubjectProgress[] }>("/student/progress/subject-wise");
  },

  async getPracticeRecommendations(): Promise<{
    recommendations: PracticeItem[];
    quizzes: any[];
    quizOptions: Array<{ id: string; type: string; title: string; minutes: number; description: string }>;
  }> {
    return apiClient("/student/practice/recommendations");
  },

  async completePractice(practiceId: string) {
    return apiClient<{ success: boolean; message: string; xpEarned: number }>(`/student/practice/${practiceId}/complete`, {
      method: "POST"
    });
  },

  async getQuizzes(): Promise<{ quizzes: any[] }> {
    return apiClient<{ quizzes: any[] }>("/student/quizzes");
  },

  async getProgress(): Promise<StudentProgressData> {
    return apiClient<StudentProgressData>("/student/progress");
  },

  async startPractice(params: { subject?: string; topic?: string; skill?: string; count?: number }) {
    return apiClient<PracticeSessionData>("/student/practice/start", {
      method: "POST",
      body: JSON.stringify(params)
    });
  },

  async submitPractice(sessionId: string, answers: Record<string, string>) {
    return apiClient<PracticeSubmitResponse>(`/student/practice/${sessionId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers })
    });
  },

  async startQuiz(params: { quizType: "quick" | "topic" | "subject" | "challenge"; subject?: string; topic?: string }) {
    return apiClient<QuizSessionData>("/student/quizzes/start", {
      method: "POST",
      body: JSON.stringify(params)
    });
  },

  async submitQuiz(attemptId: string, answers: Record<string, string>) {
    return apiClient<QuizSubmitResponse>(`/student/quizzes/${attemptId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers })
    });
  },

  async getAchievements(): Promise<AchievementsResponse> {
    return apiClient<AchievementsResponse>("/student/achievements");
  },

  // Friendly Fire Competition APIs
  async getCompetitionClassmates(): Promise<{ classmates: CompetitionClassmate[] }> {
    return apiClient<{ classmates: CompetitionClassmate[] }>("/student/competition/classmates");
  },

  async getCompetitionConnections(): Promise<CompetitionOverview> {
    return apiClient<CompetitionOverview>("/student/competition/connections");
  },

  async sendCompetitionRequest(recipientStudentId: string): Promise<{ success: boolean; message: string; connectionId: string }> {
    return apiClient("/student/competition/request", {
      method: "POST",
      body: JSON.stringify({ recipientStudentId })
    });
  },

  async acceptCompetitionRequest(connectionId: string): Promise<{ success: boolean; message: string }> {
    return apiClient(`/student/competition/${connectionId}/accept`, {
      method: "POST"
    });
  },

  async declineCompetitionRequest(connectionId: string): Promise<{ success: boolean; message: string }> {
    return apiClient(`/student/competition/${connectionId}/decline`, {
      method: "POST"
    });
  },

  // Parent Connection APIs
  async getParentCodeStatus(): Promise<{ hasActiveCode: boolean; preview?: string; expiresAt?: string; createdAt?: string }> {
    return apiClient("/student/parent-link-code");
  },

  async generateParentCode(): Promise<{ success: boolean; code: string; expiresAt: string; message: string }> {
    return apiClient("/student/parent-link-code/generate", {
      method: "POST"
    });
  },

  async revokeParentCode(): Promise<{ success: boolean; revoked: boolean }> {
    return apiClient("/student/parent-link-code/revoke", {
      method: "POST"
    });
  },

  async getLinkedParents(): Promise<{ parents: Array<{
    relationshipId: string;
    parentProfileId: string;
    parentName: string;
    parentEmail: string;
    relationshipType: string;
    status: string;
    verifiedAt: string;
  }> }> {
    return apiClient("/student/linked-parents");
  }
};
