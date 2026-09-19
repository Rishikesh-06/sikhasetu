import { query } from "../../db";
import { PDFService } from "./pdf-service";
import { ChunkingService } from "./chunking-service";
import { SummaryService, type StructuredStudySummary } from "./summary-service";

export interface DishaDocumentRecord {
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
  translatedSummaries?: Record<string, StructuredStudySummary>;
  keyConcepts: any[];
  chapters: any[];
  status: "processing" | "ready" | "failed";
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export class DocumentService {
  /**
   * Uploads and executes the complete PDF processing pipeline.
   */
  public static async uploadAndProcessDocument(params: {
    studentId: string;
    studentClass?: number;
    fileName: string;
    fileData: string; // base64 string
    fileSize: number;
    customTitle?: string;
  }): Promise<DishaDocumentRecord> {
    const { studentId, studentClass = 7, fileName, fileData, fileSize, customTitle } = params;

    const documentId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = customTitle || fileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim();

    // 1. Initial document record in 'processing' status
    await query(
      `INSERT INTO disha_documents (
        id, student_id, title, file_name, file_size, page_count, chapter_count,
        subject, class_level, summary, structured_summary, key_concepts, chapters, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        documentId,
        studentId,
        title,
        fileName,
        fileSize,
        1,
        0,
        "Science",
        studentClass,
        "Processing study material...",
        JSON.stringify({}),
        JSON.stringify([]),
        JSON.stringify([]),
        "processing"
      ]
    );

    try {
      // 2. Extract PDF text and pages
      const extraction = await PDFService.extractTextFromPDF(fileData);

      if (!extraction.success || extraction.pages.length === 0) {
        throw new Error(extraction.error || "Could not extract text from the provided PDF.");
      }

      // 3. Chunk the extracted pages
      const chunks = ChunkingService.chunkPages(extraction.pages);

      // 4. Generate AI summary, key concepts, and chapter breakdowns
      const analysis = await SummaryService.analyzeDocument({
        title,
        fullText: extraction.fullText,
        pageCount: extraction.pageCount,
        studentClass
      });

      // 5. Save all chunks to database
      for (const chunk of chunks) {
        const chunkId = `chk-${documentId}-${chunk.chunkIndex}`;
        await query(
          `INSERT INTO disha_document_chunks (
            id, document_id, chunk_index, page_number, chapter_title, content, keywords, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
          [
            chunkId,
            documentId,
            chunk.chunkIndex,
            chunk.pageNumber,
            chunk.chapterTitle,
            chunk.content,
            JSON.stringify(chunk.keywords)
          ]
        );
      }

      // 6. Create initial conversation for this document
      const initialConvId = `conv-${documentId}`;
      await query(
        `INSERT INTO disha_conversations (
          id, student_id, document_id, title, language, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING`,
        [initialConvId, studentId, documentId, `Study Session: ${title}`, "en"]
      );

      // 7. Update document record to 'ready'
      await query(
        `UPDATE disha_documents SET
          page_count = $1,
          chapter_count = $2,
          subject = $3,
          class_level = $4,
          summary = $5,
          structured_summary = $6,
          key_concepts = $7,
          chapters = $8,
          status = 'ready',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9`,
        [
          extraction.pageCount,
          analysis.chapters.length,
          analysis.detectedSubject,
          analysis.detectedClass,
          analysis.summary,
          JSON.stringify(analysis.structuredSummary),
          JSON.stringify(analysis.keyConcepts),
          JSON.stringify(analysis.chapters),
          documentId
        ]
      );

      return {
        id: documentId,
        studentId,
        title,
        fileName,
        fileSize,
        pageCount: extraction.pageCount,
        chapterCount: analysis.chapters.length,
        subject: analysis.detectedSubject,
        classLevel: analysis.detectedClass,
        summary: analysis.summary,
        structuredSummary: analysis.structuredSummary,
        keyConcepts: analysis.keyConcepts,
        chapters: analysis.chapters,
        status: "ready",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (err: any) {
      console.error(`[DocumentService] Error processing document ${documentId}:`, err);
      await query(
        `UPDATE disha_documents SET
          status = 'failed',
          error_message = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
        [err.message || "Failed to process PDF", documentId]
      );

      throw err;
    }
  }

  /**
   * Retrieves all documents owned by the student.
   */
  public static async getStudentDocuments(studentId: string): Promise<DishaDocumentRecord[]> {
    const res = await query(
      `SELECT * FROM disha_documents 
       WHERE student_id = $1 
       ORDER BY created_at DESC`,
      [studentId]
    );

    return res.rows.map(this.mapRowToDocument);
  }

  /**
   * Retrieves a single document by ID, validating student ownership.
   */
  public static async getDocumentById(documentId: string, studentId: string): Promise<DishaDocumentRecord | null> {
    const res = await query(
      `SELECT * FROM disha_documents 
       WHERE id = $1 AND student_id = $2`,
      [documentId, studentId]
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToDocument(res.rows[0]);
  }

  /**
   * Deletes a document and its associated chunks, conversations, and quizzes.
   */
  public static async deleteDocument(documentId: string, studentId: string): Promise<boolean> {
    const res = await query(
      `DELETE FROM disha_documents 
       WHERE id = $1 AND student_id = $2`,
      [documentId, studentId]
    );

    return (res.rowCount || 0) > 0;
  }

  /**
   * Persists a translated structured summary for instant cached retrieval.
   */
  public static async saveTranslatedSummary(
    documentId: string,
    studentId: string,
    language: string,
    translatedSummary: StructuredStudySummary
  ): Promise<void> {
    try {
      await query(
        `UPDATE disha_documents 
         SET translated_summaries = COALESCE(translated_summaries, '{}'::jsonb) || jsonb_build_object($1::text, $2::jsonb),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND student_id = $4`,
        [language, JSON.stringify(translatedSummary), documentId, studentId]
      );
    } catch (err: any) {
      console.error("[DocumentService] Failed to cache translated summary:", err.message);
    }
  }

  private static mapRowToDocument(row: any): DishaDocumentRecord {
    let structuredSummary: any = undefined;
    if (row.structured_summary) {
      structuredSummary = typeof row.structured_summary === "string"
        ? JSON.parse(row.structured_summary)
        : row.structured_summary;
    }

    let translatedSummaries: Record<string, StructuredStudySummary> = {};
    if (row.translated_summaries) {
      translatedSummaries = typeof row.translated_summaries === "string"
        ? JSON.parse(row.translated_summaries)
        : row.translated_summaries;
    }

    return {
      id: row.id,
      studentId: row.student_id,
      title: row.title,
      fileName: row.file_name,
      fileSize: Number(row.file_size || 0),
      pageCount: Number(row.page_count || 1),
      chapterCount: Number(row.chapter_count || 0),
      subject: row.subject || "Science",
      classLevel: Number(row.class_level || 7),
      summary: row.summary || "",
      structuredSummary,
      translatedSummaries,
      keyConcepts: typeof row.key_concepts === "string" ? JSON.parse(row.key_concepts) : (row.key_concepts || []),
      chapters: typeof row.chapters === "string" ? JSON.parse(row.chapters) : (row.chapters || []),
      status: row.status || "ready",
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

