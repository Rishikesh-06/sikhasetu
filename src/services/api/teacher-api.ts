import { apiClient } from "@/lib/api-client";
import type {
  TeacherOverviewData,
  TeacherStudentItem,
  TeacherStudentDetail,
  LearningGroupItem,
  TeacherClassroomItem,
  TeacherAssessmentItem
} from "@/data/types";

export interface CreateAssessmentPayload {
  classLevel: number;
  classroomId?: string;
  subject: string;
  topics: string[];
  title: string;
  purpose?: string;
  questionCount?: number;
  instructions?: string;
}

export const teacherApi = {
  async getClassrooms(): Promise<{ classrooms: TeacherClassroomItem[] }> {
    return apiClient<{ classrooms: TeacherClassroomItem[] }>("/teacher/classrooms");
  },

  async getOverview(classLevel = 7, classroomId?: string): Promise<TeacherOverviewData> {
    const params = new URLSearchParams({ classLevel: String(classLevel) });
    if (classroomId) params.append("classroomId", classroomId);
    return apiClient<TeacherOverviewData>(`/teacher/overview?${params.toString()}`);
  },

  async getStudents(classLevel = 7, classroomId?: string, group = "All", search = ""): Promise<{ students: TeacherStudentItem[] }> {
    const params = new URLSearchParams({
      classLevel: String(classLevel),
      group,
      search
    });
    if (classroomId) params.append("classroomId", classroomId);
    return apiClient<{ students: TeacherStudentItem[] }>(`/teacher/students?${params.toString()}`);
  },

  async getStudentDetail(studentId: string): Promise<TeacherStudentDetail> {
    return apiClient<TeacherStudentDetail>(`/teacher/students/${studentId}`);
  },

  async getGroups(classLevel = 7, classroomId?: string): Promise<{ groups: LearningGroupItem[] }> {
    const params = new URLSearchParams({ classLevel: String(classLevel) });
    if (classroomId) params.append("classroomId", classroomId);
    return apiClient<{ groups: LearningGroupItem[] }>(`/teacher/groups?${params.toString()}`);
  },

  async createAssessment(payload: CreateAssessmentPayload) {
    return apiClient<{
      success: boolean;
      message: string;
      result: {
        assessmentId: string;
        title: string;
        classLevel: number;
        subject: string;
        topics: string[];
        assignedCount: number;
        assignments: any[];
      };
    }>("/teacher/assessments", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async getAssessments(classLevel = 7): Promise<{ assessments: TeacherAssessmentItem[] }> {
    return apiClient<{ assessments: TeacherAssessmentItem[] }>(`/teacher/assessments?classLevel=${classLevel}`);
  },

  async getAssessmentDetails(assessmentId: string) {
    return apiClient<any>(`/teacher/assessments/${assessmentId}`);
  },

  async getAssessmentResults(assessmentId: string) {
    return apiClient<any>(`/teacher/assessments/${assessmentId}/results`);
  },

  async getReports(classLevel = 7, classroomId?: string) {
    const params = new URLSearchParams({ classLevel: String(classLevel) });
    if (classroomId) params.append("classroomId", classroomId);
    return apiClient(`/teacher/reports?${params.toString()}`);
  }
};
