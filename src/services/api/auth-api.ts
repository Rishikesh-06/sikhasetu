import { apiClient } from "@/lib/api-client";
import type { User, UserRole, School } from "@/data/types";

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SignupParams {
  email: string;
  name: string;
  role: UserRole;
  classLevel?: number;
  classLevels?: number[];
  schoolId?: string;
  school?: string;
  subjectSpecialization?: string;
  preferredLanguage?: string;
}

export const authApi = {
  async getSchools(): Promise<{ schools: School[] }> {
    return apiClient<{ schools: School[] }>("/auth/schools");
  },

  async createSchool(name: string, location?: string): Promise<{ school: School }> {
    return apiClient<{ school: School }>("/auth/schools", {
      method: "POST",
      body: JSON.stringify({ name, location })
    });
  },

  async signup(params: SignupParams): Promise<AuthResponse> {
    return apiClient<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(params)
    });
  },

  async login(email: string): Promise<AuthResponse> {
    return apiClient<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  },

  async googleAuth(params: {
    email: string;
    name?: string;
    supabaseUserId?: string;
    role?: UserRole;
  }): Promise<{ isExistingUser: boolean; token?: string; user?: User; email: string; name: string; supabaseUserId?: string }> {
    return apiClient<{ isExistingUser: boolean; token?: string; user?: User; email: string; name: string; supabaseUserId?: string }>("/auth/google-auth", {
      method: "POST",
      body: JSON.stringify(params)
    });
  },

  async getMe(): Promise<{ user: User }> {
    return apiClient<{ user: User }>("/auth/me");
  },

  async getDemoAccounts(): Promise<{
    students: Array<User & { diagnosticScore: number | null; group: string | null; token: string }>;
    teachers: Array<User & { school: string; subject: string; token: string }>;
    teacher: (User & { token: string }) | null;
    parent: (User & { token: string }) | null;
  }> {
    return apiClient("/auth/demo-accounts");
  }
};
