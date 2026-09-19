import { query } from "../../db";
import { RetrievalService } from "./retrieval-service";

export interface DishaQuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctOption: number;
  explanation: string;
  pageNumber: number;
}

export interface DishaQuizResult {
  id: string;
  documentId: string;
  title: string;
  questions: DishaQuizQuestion[];
  createdAt: string;
}

export class QuizService {
  private static readonly GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

  /**
   * Generates a 5-question multiple choice practice quiz derived directly from the uploaded PDF.
   */
  public static async generateQuiz(params: {
    documentId: string;
    documentTitle: string;
    studentId: string;
    studentClass?: number;
  }): Promise<DishaQuizResult> {
    const { documentId, documentTitle, studentId, studentClass = 7 } = params;

    // Fetch sample chunks from the document
    const chunks = await RetrievalService.retrieveRelevantChunks({
      documentId,
      searchQuery: "important definitions principles concepts questions exam",
      topK: 6
    });

    const contextSample = chunks.map(c => `[Page ${c.pageNumber}] ${c.content}`).join("\n\n");
    const quizId = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const quizTitle = `${documentTitle.replace(/\.pdf$/i, "")} — Practice Quiz`;

    const apiKey = (process.env.GROQ_API_KEY || process.env.XAI_API_KEY || "").trim();

    if (!apiKey || chunks.length === 0) {
      const fallbackQuestions = this.generateFallbackQuiz(documentTitle, chunks);
      await this.saveQuiz(quizId, documentId, studentId, quizTitle, fallbackQuestions);
      return {
        id: quizId,
        documentId,
        title: quizTitle,
        questions: fallbackQuestions,
        createdAt: new Date().toISOString()
      };
    }

    const prompt = `You are DISHA's Quiz Engine for Indian school students in Class ${studentClass}.
Create a 5-question multiple choice quiz STRICTLY based on the following extracted PDF text from "${documentTitle}".

EXTRACTED PDF CONTEXT:
"""
${contextSample}
"""

Return a strict JSON object with this format:
{
  "questions": [
    {
      "id": "q1",
      "questionText": "Clear, engaging question text based on the document?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOption": 0,
      "explanation": "Clear explanation of why this answer is correct citing the document concept.",
      "pageNumber": 1
    }
  ]
}

Ensure all 5 questions are directly grounded in the provided text. Return valid JSON only.`;

    const models = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b", "groq/compound"];
    let raw: string | null = null;

    for (const model of models) {
      try {
        const response = await fetch(this.GROQ_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "You are a quiz generator. Return valid JSON only." },
              { role: "user", content: prompt }
            ],
            temperature: 0.3,
            response_format: { type: "json_object" }
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          raw = data.choices?.[0]?.message?.content?.trim() || null;
          if (raw) break;
        }
      } catch (e: any) {
        console.warn(`[QuizService] Model ${model} failed, trying next...`);
      }
    }

    try {
      if (!raw) throw new Error("No model produced quiz output");
      const parsed = JSON.parse(raw);

      const questions: DishaQuizQuestion[] = (parsed.questions || []).map((q: any, idx: number) => ({
        id: q.id || `q-${idx + 1}`,
        questionText: q.questionText || "Question",
        options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ["Option A", "Option B", "Option C", "Option D"],
        correctOption: typeof q.correctOption === "number" && q.correctOption >= 0 && q.correctOption < 4 ? q.correctOption : 0,
        explanation: q.explanation || "Correct answer according to the study material.",
        pageNumber: typeof q.pageNumber === "number" ? q.pageNumber : (chunks[0]?.pageNumber || 1)
      }));

      await this.saveQuiz(quizId, documentId, studentId, quizTitle, questions);

      return {
        id: quizId,
        documentId,
        title: quizTitle,
        questions,
        createdAt: new Date().toISOString()
      };
    } catch (err: any) {
      console.warn("[QuizService] Error generating quiz via LLM, using fallback:", err.message);
      const fallbackQuestions = this.generateFallbackQuiz(documentTitle, chunks);
      await this.saveQuiz(quizId, documentId, studentId, quizTitle, fallbackQuestions);
      return {
        id: quizId,
        documentId,
        title: quizTitle,
        questions: fallbackQuestions,
        createdAt: new Date().toISOString()
      };
    }
  }

  private static async saveQuiz(
    quizId: string,
    documentId: string,
    studentId: string,
    title: string,
    questions: DishaQuizQuestion[]
  ) {
    try {
      await query(
        `INSERT INTO disha_quizzes (id, document_id, student_id, title, questions, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [quizId, documentId, studentId, title, JSON.stringify(questions)]
      );
    } catch (err: any) {
      console.error("[QuizService] Error saving quiz to database:", err.message);
    }
  }

  private static generateFallbackQuiz(
    documentTitle: string,
    chunks: Array<{ pageNumber: number; content: string }>
  ): DishaQuizQuestion[] {
    const pageNum = chunks[0]?.pageNumber || 1;
    return [
      {
        id: "q-1",
        questionText: `What is the primary subject explored in "${documentTitle.replace(/\.pdf$/i, "")}"?`,
        options: [
          "Core educational concepts and definitions",
          "Unrelated historical stories",
          "Advanced astronomy",
          "Language linguistics"
        ],
        correctOption: 0,
        explanation: "The document establishes foundational principles and applications for students.",
        pageNumber: pageNum
      },
      {
        id: "q-2",
        questionText: "Why is review and practice of key concepts important after reading the document?",
        options: [
          "It reinforces memory and strengthens mastery",
          "It is not recommended",
          "It reduces retention",
          "Only formulas need to be memorized"
        ],
        correctOption: 0,
        explanation: "Active recall and concept synthesis solidify knowledge transfer.",
        pageNumber: pageNum
      }
    ];
  }
}
