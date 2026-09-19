import { RetrievalService, type RetrievedChunk } from "./retrieval-service";

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GroundedSource {
  pageNumber: number;
  chapterTitle: string;
  snippet: string;
}

export interface DishaChatResponse {
  reply: string;
  language: string;
  sources: GroundedSource[];
  isGrounded: boolean;
  modelUsed: string;
}

export class DishaConversationService {
  private static readonly GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

  /**
   * Generates RAG-grounded response with conversational memory, multilingual adaptation, and source citations.
   */
  public static async generateResponse(params: {
    documentId: string;
    documentTitle: string;
    studentName: string;
    studentClass: number;
    history: ConversationMessage[];
    newMessage: string;
    requestedLanguage?: string;
  }): Promise<DishaChatResponse> {
    const {
      documentId,
      documentTitle,
      studentName,
      studentClass,
      history,
      newMessage,
      requestedLanguage = "en"
    } = params;

    // 1. Retrieve top-K relevant chunks strictly scoped to this document
    const retrievedChunks = await RetrievalService.retrieveRelevantChunks({
      documentId,
      searchQuery: newMessage,
      topK: 4
    });

    // 2. Detect language intent or code-switching in user message
    const detectedLang = this.detectLanguageIntent(newMessage, requestedLanguage);

    // 3. Format context from retrieved chunks
    const contextText = retrievedChunks.length > 0
      ? retrievedChunks
          .map((c, i) => `[Source Chunk ${i + 1} | Page ${c.pageNumber} | ${c.chapterTitle}]\n${c.content}`)
          .join("\n\n---\n\n")
      : "No extractable text chunks found in the document.";

    const systemPrompt = this.buildSystemPrompt({
      documentTitle,
      studentName,
      studentClass,
      language: detectedLang,
      contextText
    });

    // 4. Bounded conversation history (last 8 messages)
    const boundedHistory = history.slice(-8).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...boundedHistory,
      { role: "user", content: newMessage }
    ];

    const apiKey = (process.env.GROQ_API_KEY || process.env.XAI_API_KEY || "").trim();

    if (!apiKey) {
      return this.generateFallbackResponse(newMessage, retrievedChunks, detectedLang);
    }

    const models = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b", "groq/compound"];
    let lastError: Error | null = null;

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
            messages,
            temperature: 0.4,
            max_tokens: 1200
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[DishaConversationService] Model ${model} failed (${response.status}): ${errText.slice(0, 100)}`);
          lastError = new Error(`AI Provider HTTP ${response.status}`);
          continue;
        }

        const data: any = await response.json();
        const reply = data.choices?.[0]?.message?.content?.trim();

        if (!reply) {
          throw new Error("Empty reply received from AI provider");
        }

        // Check if reply indicates content was not found in PDF
        const isNotFound = /couldn't find that in your uploaded document|not found in the uploaded|not mentioned in this document/i.test(reply);

        // Filter and compile sources
        const sources: GroundedSource[] = isNotFound
          ? []
          : retrievedChunks.slice(0, 3).map(c => ({
              pageNumber: c.pageNumber,
              chapterTitle: c.chapterTitle,
              snippet: c.snippet
            }));

        return {
          reply,
          language: detectedLang,
          sources,
          isGrounded: !isNotFound,
          modelUsed: model
        };
      } catch (err: any) {
        lastError = err;
      }
    }

    console.warn("[DishaConversationService] Falling back to retrieval summary:", lastError?.message);
    return this.generateFallbackResponse(newMessage, retrievedChunks, detectedLang);
  }

  /**
   * Builds the rigorous pedagogical prompt with grounding, citation, and multilingual rules.
   */
  private static buildSystemPrompt(params: {
    documentTitle: string;
    studentName: string;
    studentClass: number;
    language: string;
    contextText: string;
  }): string {
    const { documentTitle, studentName, studentClass, language, contextText } = params;

    const langGuidance: Record<string, string> = {
      en: "Respond in clear, warm, engaging, and grammatically correct English.",
      hi: "Respond in natural, encouraging Hindi (हिंदी) using Devanagari script. Explain clearly for Indian school students.",
      te: "Respond in natural, fluent, encouraging Telugu (తెలుగు) using Telugu script. Use simple vocabulary and relatable examples."
    };

    const guidance = langGuidance[language] || langGuidance.en;

    return `You are DISHA, a brilliant, warm, and patient personal AI study companion for Indian school students (Class ${studentClass}), created by SIKHASETU.
The student (${studentName}) has uploaded a study PDF titled "${documentTitle}".

YOUR CORE MISSION:
1. Ground your answers STRICTLY in the provided context from the student's uploaded PDF.
2. ${guidance}
3. If the user asks in Telugu, Telugu code-mixing ("Telugu lo cheppu", "ante enti?"), respond naturally in Telugu.
4. If the user asks in Hindi, Hindi code-mixing ("Hindi mein batao", "kya hota hai?"), respond naturally in Hindi.
5. If the user asks in English or requests English explanation ("explain in English"), respond in English.
6. Language switching must NOT reset your memory of the previous conversation or topic.

SOURCE GROUNDING & CITATIONS:
- Whenever answering from the document, cite the source page or chapter naturally (e.g. "According to Page 3...", "As shown in Chapter 1 on Page 5...").
- Do NOT fabricate page numbers that are not in the context.

STRICT NON-HALLUCINATION SAFEGUARD:
- If the requested concept or question is genuinely NOT present in the provided document context, say:
  "I couldn't find that in your uploaded document. Would you like me to explain it using general knowledge?"
- Do NOT make up facts that claim to be in the PDF.

RESPONSE FORMAT:
- Direct, clear explanation calibrated for Class ${studentClass}.
- Use bullet points, bold keywords, or step-by-step numbers for easy reading.
- Warm, motivating tone.

UPLOADED DOCUMENT CONTEXT:
\"\"\"
${contextText}
\"\"\"`;
  }

  /**
   * Detects language intent including code-mixed phrases like "Telugu lo", "Hindi mein".
   */
  private static detectLanguageIntent(query: string, defaultLang: string): string {
    const lower = query.toLowerCase();

    if (/telugu|తెలుగు|\blo\b|cheppu|ivvu|enti|ela|chudu|artham/i.test(lower)) {
      return "te";
    }
    if (/hindi|हिंदी|हिन्दी|\bmein\b|\bme\b|batao|samjhao|kya hai|kaise/i.test(lower)) {
      return "hi";
    }
    if (/english|in english|explain in english/i.test(lower)) {
      return "en";
    }

    return defaultLang;
  }

  /**
   * Fallback response if offline or API is unavailable.
   */
  private static generateFallbackResponse(
    query: string,
    chunks: RetrievedChunk[],
    language: string
  ): DishaChatResponse {
    if (chunks.length === 0) {
      return {
        reply: "I couldn't find relevant information in your uploaded document for this question. Would you like me to explain it using general knowledge?",
        language,
        sources: [],
        isGrounded: false,
        modelUsed: "offline-retrieval"
      };
    }

    const topChunk = chunks[0];
    return {
      reply: `Based on your uploaded document on **Page ${topChunk.pageNumber} (${topChunk.chapterTitle})**:\n\n${topChunk.content.slice(0, 450)}...\n\n*Source: Page ${topChunk.pageNumber}*`,
      language,
      sources: chunks.slice(0, 2).map(c => ({
        pageNumber: c.pageNumber,
        chapterTitle: c.chapterTitle,
        snippet: c.snippet
      })),
      isGrounded: true,
      modelUsed: "offline-retrieval"
    };
  }
}
