import { apiClient } from "@/lib/api-client";

export interface AITutorConversation {
  id: string;
  title: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface AITutorMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  language: string;
  audio_url?: string;
  created_at: string;
}

export interface ChatResponse {
  success: boolean;
  reply: string;
  conversationId: string;
  messageId: string;
  language: string;
  modelUsed?: string;
}

export const aiTutorApi = {
  async sendMessage(data: {
    message: string;
    language?: string;
    conversationId?: string;
  }): Promise<ChatResponse> {
    return apiClient<ChatResponse>("/student/ai-tutor/chat", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async getConversations(): Promise<{ conversations: AITutorConversation[] }> {
    return apiClient<{ conversations: AITutorConversation[] }>("/student/ai-tutor/conversations");
  },

  async getConversation(conversationId: string): Promise<{
    conversation: AITutorConversation;
    messages: AITutorMessage[];
  }> {
    return apiClient<{
      conversation: AITutorConversation;
      messages: AITutorMessage[];
    }>(`/student/ai-tutor/conversations/${conversationId}`);
  },

  async deleteConversation(conversationId: string): Promise<{ success: boolean; message: string }> {
    return apiClient<{ success: boolean; message: string }>(`/student/ai-tutor/conversations/${conversationId}`, {
      method: "DELETE"
    });
  },

  async getTtsAudio(data: {
    text: string;
    language: string;
    messageId?: string;
  }): Promise<{ success: boolean; audioUrl: string; format: string; cached: boolean; language: string }> {
    return apiClient<{ success: boolean; audioUrl: string; format: string; cached: boolean; language: string }>("/student/ai-tutor/tts", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }
};
