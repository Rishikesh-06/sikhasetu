import { Router, type Response } from "express";
import { authenticateToken, requireRole, type AuthenticatedRequest } from "../middleware/auth";
import { query } from "../db";
import { AITutorService, type ChatMessage } from "../services/ai-tutor-service";

export const aiTutorRouter = Router();

aiTutorRouter.use(authenticateToken);
aiTutorRouter.use(requireRole("student"));

// 1. POST /api/student/ai-tutor/chat
aiTutorRouter.post("/chat", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const { message, language = "en", conversationId } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "Message is required and cannot be empty." });
    return;
  }

  const cleanMessage = message.trim();
  const validLanguage = ["en", "hi", "te"].includes(language) ? language : "en";

  try {
    // 1. Fetch authenticated student's profile context
    const studentRes = await query(
      `SELECT sp.*, u.email FROM student_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.id = $1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) {
      res.status(404).json({ error: "Student profile not found." });
      return;
    }

    const studentRow = studentRes.rows[0];
    const studentContext = {
      id: studentRow.id,
      name: studentRow.name,
      classLevel: studentRow.class_level || 7,
      school: studentRow.school || "Delhi Public School",
      preferredLanguage: studentRow.preferred_language || "English"
    };

    // 2. Resolve or Create Conversation
    let activeConvId = conversationId;
    let convTitle = cleanMessage.slice(0, 45);

    if (activeConvId) {
      const convCheck = await query(
        `SELECT * FROM ai_tutor_conversations WHERE id = $1 AND student_id = $2`,
        [activeConvId, studentId]
      );
      if (convCheck.rows.length === 0) {
        // Not found or not owned by student -> start new conversation
        activeConvId = null;
      }
    }

    if (!activeConvId) {
      activeConvId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await query(
        `INSERT INTO ai_tutor_conversations (id, student_id, title, language, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [activeConvId, studentId, convTitle, validLanguage, new Date().toISOString(), new Date().toISOString()]
      );
    }

    // 3. Save User Message
    const userMsgId = `msg-${Date.now()}-u-${Math.random().toString(36).slice(2, 6)}`;
    await query(
      `INSERT INTO ai_tutor_messages (id, conversation_id, role, content, language, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userMsgId, activeConvId, "user", cleanMessage, validLanguage, new Date().toISOString()]
    );

    // 4. Fetch recent conversation history for memory
    const historyRes = await query(
      `SELECT role, content FROM ai_tutor_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [activeConvId]
    );

    const history: ChatMessage[] = historyRes.rows.map(r => ({
      role: r.role as "user" | "assistant",
      content: r.content
    }));

    // Remove the last message we just inserted from history to pass as newMessage
    const previousHistory = history.slice(0, -1);

    // 5. Generate AI Tutor Response
    const aiResult = await AITutorService.generateTutorResponse({
      student: studentContext,
      history: previousHistory,
      newMessage: cleanMessage,
      language: validLanguage
    });

    // 6. Save Assistant Message
    const assistantMsgId = `msg-${Date.now()}-a-${Math.random().toString(36).slice(2, 6)}`;
    await query(
      `INSERT INTO ai_tutor_messages (id, conversation_id, role, content, language, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [assistantMsgId, activeConvId, "assistant", aiResult.reply, validLanguage, new Date().toISOString()]
    );

    // 7. Update conversation timestamp & language
    await query(
      `UPDATE ai_tutor_conversations SET updated_at = $1, language = $2 WHERE id = $3`,
      [new Date().toISOString(), validLanguage, activeConvId]
    );

    res.json({
      success: true,
      reply: aiResult.reply,
      conversationId: activeConvId,
      messageId: assistantMsgId,
      language: validLanguage,
      modelUsed: aiResult.modelUsed
    });
  } catch (err: any) {
    console.error("[AI Tutor Error]", err);
    res.status(500).json({
      error: "I'm having trouble connecting right now. Please try again.",
      details: process.env.NODE_ENV !== "production" ? err.message : undefined
    });
  }
});

// 2. GET /api/student/ai-tutor/conversations
aiTutorRouter.get("/conversations", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;

  try {
    const convRes = await query(
      `SELECT id, title, language, created_at, updated_at
       FROM ai_tutor_conversations
       WHERE student_id = $1
       ORDER BY updated_at DESC`,
      [studentId]
    );

    res.json({
      conversations: convRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching conversations: ${err.message}` });
  }
});

// 3. GET /api/student/ai-tutor/conversations/:conversationId
aiTutorRouter.get("/conversations/:conversationId", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const { conversationId } = req.params;

  try {
    const convRes = await query(
      `SELECT * FROM ai_tutor_conversations WHERE id = $1 AND student_id = $2`,
      [conversationId, studentId]
    );

    if (convRes.rows.length === 0) {
      res.status(404).json({ error: "Conversation not found or unauthorized." });
      return;
    }

    const messagesRes = await query(
      `SELECT id, role, content, language, audio_url, created_at
       FROM ai_tutor_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    res.json({
      conversation: convRes.rows[0],
      messages: messagesRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed loading conversation messages: ${err.message}` });
  }
});

// 4. DELETE /api/student/ai-tutor/conversations/:conversationId
aiTutorRouter.delete("/conversations/:conversationId", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user!.profileId;
  const { conversationId } = req.params;

  try {
    await query(
      `DELETE FROM ai_tutor_conversations WHERE id = $1 AND student_id = $2`,
      [conversationId, studentId]
    );

    res.json({ success: true, message: "Conversation deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: `Failed deleting conversation: ${err.message}` });
  }
});

// 5. POST /api/student/ai-tutor/tts
aiTutorRouter.post("/tts", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { text, language = "en", messageId } = req.body;

  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Text is required for TTS." });
    return;
  }

  try {
    const result = await AITutorService.generateSpeechAudio({
      text,
      language,
      messageId
    });

    res.json({
      success: true,
      audioUrl: result.audioUrl,
      format: result.format,
      cached: result.cached,
      language
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed generating speech audio: ${err.message}` });
  }
});
