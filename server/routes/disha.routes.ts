import { Router, type Response } from "express";
import { authenticateToken, requireRole, type AuthenticatedRequest } from "../middleware/auth";
import { query } from "../db";
import { DocumentService } from "../services/disha/document-service";
import { DishaConversationService } from "../services/disha/conversation-service";
import { SummaryService } from "../services/disha/summary-service";
import { QuizService } from "../services/disha/quiz-service";
import { AITutorService } from "../services/ai-tutor-service";

export const dishaRouter = Router();

dishaRouter.use(authenticateToken);
dishaRouter.use(requireRole("student"));

/**
 * 1. POST /api/student/disha/upload
 * Uploads a PDF, executes text extraction, chunking, and AI analysis.
 */
dishaRouter.post("/upload", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const { fileName, fileData, fileSize, title } = req.body;

  if (!fileName || !fileData) {
    res.status(400).json({ error: "fileName and fileData (base64) are required." });
    return;
  }

  try {
    // Fetch student's class level
    const studentRes = await query(
      `SELECT class_level FROM student_profiles WHERE id = $1`,
      [studentId]
    );
    const studentClass = studentRes.rows[0]?.class_level || 7;

    const doc = await DocumentService.uploadAndProcessDocument({
      studentId,
      studentClass,
      fileName,
      fileData,
      fileSize: Number(fileSize || 0),
      customTitle: title
    });

    res.status(201).json({
      success: true,
      document: doc
    });
  } catch (err: any) {
    console.error("[Disha Route] Upload error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to process uploaded PDF."
    });
  }
});

/**
 * 2. GET /api/student/disha/documents
 * List all documents belonging to the authenticated student.
 */
dishaRouter.get("/documents", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const documents = await DocumentService.getStudentDocuments(studentId);
    res.json({ success: true, documents });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. GET /api/student/disha/documents/:id
 * Retrieve a specific document by ID.
 */
dishaRouter.get("/documents/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const documentId = req.params.id;

  try {
    const doc = await DocumentService.getDocumentById(documentId, studentId);
    if (!doc) {
      res.status(404).json({ success: false, error: "Document not found or access denied." });
      return;
    }
    res.json({ success: true, document: doc });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. DELETE /api/student/disha/documents/:id
 * Delete a document and all related chunks and conversations.
 */
dishaRouter.delete("/documents/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const documentId = req.params.id;

  try {
    const deleted = await DocumentService.deleteDocument(documentId, studentId);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Document not found or access denied." });
      return;
    }
    res.json({ success: true, message: "Document successfully deleted." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. POST /api/student/disha/chat
 * Ask Disha a grounded question scoped to the selected document.
 */
dishaRouter.post("/chat", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const { documentId, message, language = "en", conversationId } = req.body;

  if (!documentId || !message || !message.trim()) {
    res.status(400).json({ error: "documentId and message are required." });
    return;
  }

  try {
    // 1. Validate student owns document
    const doc = await DocumentService.getDocumentById(documentId, studentId);
    if (!doc) {
      res.status(404).json({ error: "Document not found or access denied." });
      return;
    }

    // 2. Fetch student info
    const studentRes = await query(
      `SELECT name, class_level FROM student_profiles WHERE id = $1`,
      [studentId]
    );
    const student = studentRes.rows[0] || { name: "Student", class_level: 7 };

    // 3. Resolve or create conversation
    let convId = conversationId;
    if (convId) {
      const convCheck = await query(
        `SELECT id FROM disha_conversations WHERE id = $1 AND student_id = $2`,
        [convId, studentId]
      );
      if (convCheck.rows.length === 0) convId = null;
    }

    if (!convId) {
      convId = `conv-${documentId}`;
      await query(
        `INSERT INTO disha_conversations (id, student_id, document_id, title, language, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO NOTHING`,
        [convId, studentId, documentId, `Study: ${doc.title}`, language]
      );
    }

    // 4. Fetch history messages
    const historyRes = await query(
      `SELECT role, content FROM disha_messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC 
       LIMIT 10`,
      [convId]
    );

    const history = historyRes.rows.map(r => ({
      role: r.role as "user" | "assistant",
      content: r.content
    }));

    // 5. Generate RAG Response
    const chatResult = await DishaConversationService.generateResponse({
      documentId,
      documentTitle: doc.title,
      studentName: student.name,
      studentClass: student.class_level || 7,
      history,
      newMessage: message.trim(),
      requestedLanguage: language
    });

    // 6. Save user message
    const userMsgId = `msg-u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await query(
      `INSERT INTO disha_messages (id, conversation_id, role, content, language, created_at)
       VALUES ($1, $2, 'user', $3, $4, CURRENT_TIMESTAMP)`,
      [userMsgId, convId, message.trim(), language]
    );

    // 7. Save assistant response
    const assistantMsgId = `msg-a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await query(
      `INSERT INTO disha_messages (id, conversation_id, role, content, language, sources, is_grounded, created_at)
       VALUES ($1, $2, 'assistant', $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [
        assistantMsgId,
        convId,
        chatResult.reply,
        chatResult.language,
        JSON.stringify(chatResult.sources),
        chatResult.isGrounded
      ]
    );

    res.json({
      success: true,
      reply: chatResult.reply,
      language: chatResult.language,
      sources: chatResult.sources,
      isGrounded: chatResult.isGrounded,
      conversationId: convId,
      messageId: assistantMsgId,
      modelUsed: chatResult.modelUsed
    });
  } catch (err: any) {
    console.error("[Disha Route] Chat error:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to generate answer." });
  }
});

/**
 * 6. GET /api/student/disha/conversations/:id
 * Retrieve message history for a conversation.
 */
dishaRouter.get("/conversations/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const conversationId = req.params.id;

  try {
    const convRes = await query(
      `SELECT * FROM disha_conversations WHERE id = $1 AND student_id = $2`,
      [conversationId, studentId]
    );

    if (convRes.rows.length === 0) {
      res.status(404).json({ error: "Conversation not found or access denied." });
      return;
    }

    const messagesRes = await query(
      `SELECT * FROM disha_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId]
    );

    const messages = messagesRes.rows.map(r => ({
      id: r.id,
      role: r.role,
      content: r.content,
      language: r.language,
      sources: typeof r.sources === "string" ? JSON.parse(r.sources) : (r.sources || []),
      isGrounded: r.is_grounded !== false,
      audioUrl: r.audio_url,
      createdAt: r.created_at
    }));

    res.json({
      success: true,
      conversation: convRes.rows[0],
      messages
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 7. POST /api/student/disha/quiz/generate
 * Generate practice quiz based on PDF content.
 */
dishaRouter.post("/quiz/generate", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const { documentId } = req.body;

  if (!documentId) {
    res.status(400).json({ error: "documentId is required." });
    return;
  }

  try {
    const doc = await DocumentService.getDocumentById(documentId, studentId);
    if (!doc) {
      res.status(404).json({ error: "Document not found or access denied." });
      return;
    }

    const studentRes = await query(
      `SELECT class_level FROM student_profiles WHERE id = $1`,
      [studentId]
    );
    const studentClass = studentRes.rows[0]?.class_level || 7;

    const quiz = await QuizService.generateQuiz({
      documentId,
      documentTitle: doc.title,
      studentId,
      studentClass
    });

    res.json({ success: true, quiz });
  } catch (err: any) {
    console.error("[Disha Route] Quiz generation error:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to generate quiz." });
  }
});

/**
 * 8. POST /api/student/disha/tts
 * Generate or cache text-to-speech audio for summaries or tutor responses.
 */
dishaRouter.post("/tts", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { text, language = "en", messageId } = req.body;

  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Text is required for TTS." });
    return;
  }

  try {
    const speech = await AITutorService.generateSpeechAudio({
      text,
      language,
      messageId
    });

    res.json({ success: true, speech });
  } catch (err: any) {
    console.error("[Disha Route] TTS error:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to generate TTS audio." });
  }
});

/**
 * 9. POST /api/student/disha/documents/:id/translate-summary
 * Translate the complete structured study guide to Telugu or Hindi.
 */
dishaRouter.post("/documents/:id/translate-summary", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const documentId = req.params.id;
  const { language } = req.body;

  if (!language || !["te", "hi"].includes(language)) {
    res.status(400).json({ error: "Language must be 'te' or 'hi'." });
    return;
  }

  try {
    const doc = await DocumentService.getDocumentById(documentId, studentId);
    if (!doc) {
      res.status(404).json({ error: "Document not found or access denied." });
      return;
    }

    if (!doc.structuredSummary) {
      res.status(400).json({ error: "Document does not have a structured summary yet." });
      return;
    }

    // 1. Check if translation is already cached in database
    if (doc.translatedSummaries && doc.translatedSummaries[language]) {
      const cached = doc.translatedSummaries[language];
      if (cached.keyConcepts && cached.keyConcepts.length > 0) {
        res.json({
          success: true,
          language,
          structuredSummary: cached,
          cached: true
        });
        return;
      }
    }

    // 2. Generate complete translation
    const translated = await SummaryService.translateStructuredSummary({
      structuredSummary: doc.structuredSummary,
      targetLanguage: language as "te" | "hi",
      studentClass: doc.classLevel
    });

    // 3. Persist to database cache
    await DocumentService.saveTranslatedSummary(doc.id, studentId, language, translated);

    res.json({
      success: true,
      language,
      structuredSummary: translated,
      cached: false
    });
  } catch (err: any) {
    console.error("[Disha Route] Translate summary error:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to translate summary." });
  }
});

export default dishaRouter;
