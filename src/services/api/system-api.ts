import { apiClient } from "@/lib/api-client";

export const systemApi = {
  async getStatus() {
    return apiClient<{
      databaseReady: boolean;
      questionsCount: number;
      studentsCount: number;
      assessmentsCount: number;
      diagnosticsCount: number;
      isDev: boolean;
    }>("/seed/status");
  },

  async resetSeed() {
    return apiClient<{ success: boolean; message: string }>("/seed/reset", {
      method: "POST"
    });
  }
};
