import { apiClient } from "@/lib/api-client";

export interface KeyConceptItem {
  name: string;
  definition: string;
  importance: string;
  tag: string;
  pageNumber?: number;
}

export interface ChapterSummaryItem {
  id: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  summary: string;
  keyPoints: string[];
  definitions: Array<{ term: string; explanation: string; pageNumber?: number }>;
  suggestedQuestions: string[];
}

export interface DefinitionItem {
  term: string;
  definition: string;
  context: string;
  pageNumber?: number;
}

export interface CorePrincipleItem {
  title: string;
  statement: string;
  explanation: string;
  pageNumber?: number;
}

export interface FormulaItem {
  name: string;
  formula: string;
  variables: Array<{ symbol: string; meaning: string; unit?: string }>;
  usage: string;
  example?: string;
  pageNumber?: number;
}

export interface ProcessItem {
  processName: string;
  objective: string;
  steps: Array<{ stepNumber: number; action: string; details: string }>;
  pageNumber?: number;
}

export interface ExampleItem {
  title: string;
  concept: string;
  problemOrScenario: string;
  solutionOrExplanation: string;
  pageNumber?: number;
}

export interface ImportantFactItem {
  fact: string;
  significance: string;
  pageNumber?: number;
}

export interface QuickRevisionData {
  rememberPoints: string[];
  examFocusPoints: string[];
  commonMistakesToAvoid?: string[];
}

export interface StructuredStudySummary {
  documentOverview: {
    title: string;
    subject: string;
    classLevel: number;
    estimatedReadTimeMinutes: number;
    highLevelSummary: string;
    coreThemes: string[];
  };
  keyConcepts: KeyConceptItem[];
  chapterSummaries: ChapterSummaryItem[];
  importantDefinitions: DefinitionItem[];
  corePrinciples: CorePrincipleItem[];
  formulasAndEquations?: FormulaItem[];
  processesAndSteps?: ProcessItem[];
  examplesAndApplications?: ExampleItem[];
  importantFacts: ImportantFactItem[];
  quickRevision: QuickRevisionData;
}

export interface DishaDocument {
  id: string;
  studentId: string;
  title: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  chapterCount: number;
  subject: string;
  classLevel: number;
  summary: string;
  structuredSummary?: StructuredStudySummary;
  keyConcepts: KeyConceptItem[];
  chapters: ChapterSummaryItem[];
  status: "processing" | "ready" | "failed";
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroundedSource {
  pageNumber: number;
  chapterTitle: string;
  snippet: string;
}

export interface DishaMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  language: string;
  audioUrl?: string;
  sources?: GroundedSource[];
  isGrounded?: boolean;
  createdAt: string;
}

export interface DishaChatResponse {
  success: boolean;
  reply: string;
  language: string;
  sources: GroundedSource[];
  isGrounded: boolean;
  conversationId: string;
  messageId: string;
  modelUsed?: string;
}

export interface DishaQuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctOption: number;
  explanation: string;
  pageNumber: number;
}

export interface DishaQuiz {
  id: string;
  documentId: string;
  title: string;
  questions: DishaQuizQuestion[];
  createdAt: string;
}

export const dishaApi = {
  /**
   * Upload a PDF file (base64) to be processed by Disha.
   */
  async uploadPDF(data: {
    fileName: string;
    fileData: string;
    fileSize: number;
    title?: string;
  }): Promise<{ success: boolean; document: DishaDocument }> {
    return apiClient<{ success: boolean; document: DishaDocument }>("/student/disha/upload", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  /**
   * List all documents uploaded by the authenticated student.
   */
  async getDocuments(): Promise<{ success: boolean; documents: DishaDocument[] }> {
    return apiClient<{ success: boolean; documents: DishaDocument[] }>("/student/disha/documents");
  },

  /**
   * Get single document details by ID.
   */
  async getDocument(id: string): Promise<{ success: boolean; document: DishaDocument }> {
    return apiClient<{ success: boolean; document: DishaDocument }>(`/student/disha/documents/${id}`);
  },

  /**
   * Delete a document and its knowledge base.
   */
  async deleteDocument(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient<{ success: boolean; message: string }>(`/student/disha/documents/${id}`, {
      method: "DELETE"
    });
  },

  /**
   * Translate the structured study summary into Telugu or Hindi.
   */
  async translateSummary(documentId: string, language: "te" | "hi"): Promise<{
    success: boolean;
    language: string;
    structuredSummary: StructuredStudySummary;
  }> {
    return apiClient<{
      success: boolean;
      language: string;
      structuredSummary: StructuredStudySummary;
    }>(`/student/disha/documents/${documentId}/translate-summary`, {
      method: "POST",
      body: JSON.stringify({ language })
    });
  },

  /**
   * Ask Disha a grounded question scoped to a document.
   */
  async sendChatMessage(data: {
    documentId: string;
    message: string;
    language?: string;
    conversationId?: string;
  }): Promise<DishaChatResponse> {
    return apiClient<DishaChatResponse>("/student/disha/chat", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  /**
   * Get messages for a specific conversation.
   */
  async getConversation(id: string): Promise<{
    success: boolean;
    conversation: any;
    messages: DishaMessage[];
  }> {
    return apiClient<{
      success: boolean;
      conversation: any;
      messages: DishaMessage[];
    }>(`/student/disha/conversations/${id}`);
  },

  /**
   * Generate an interactive practice quiz from the document.
   */
  async generateQuiz(documentId: string): Promise<{ success: boolean; quiz: DishaQuiz }> {
    return apiClient<{ success: boolean; quiz: DishaQuiz }>("/student/disha/quiz/generate", {
      method: "POST",
      body: JSON.stringify({ documentId })
    });
  },

  /**
   * Text-to-speech audio generation for summary or responses.
   */
  async getTtsAudio(data: {
    text: string;
    language: string;
    messageId?: string;
  }): Promise<{ success: boolean; audioUrl: string; format: string; cached: boolean; language: string }> {
    return apiClient<{ success: boolean; audioUrl: string; format: string; cached: boolean; language: string }>("/student/disha/tts", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }
};
