import { query } from "../../db";

export interface RetrievedChunk {
  chunkIndex: number;
  pageNumber: number;
  chapterTitle: string;
  content: string;
  score: number;
  snippet: string;
}

export class RetrievalService {
  /**
   * Retrieves top-K most relevant chunks strictly scoped to a specific document.
   */
  public static async retrieveRelevantChunks(params: {
    documentId: string;
    searchQuery: string;
    topK?: number;
  }): Promise<RetrievedChunk[]> {
    const { documentId, searchQuery, topK = 4 } = params;

    // Fetch chunks strictly for this document
    const res = await query(
      `SELECT chunk_index, page_number, chapter_title, content, keywords 
       FROM disha_document_chunks 
       WHERE document_id = $1 
       ORDER BY chunk_index ASC`,
      [documentId]
    );

    if (res.rows.length === 0) {
      return [];
    }

    const rawQuery = searchQuery.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    const queryTerms = rawQuery
      .split(/\s+/)
      .filter(t => t.length > 2);

    if (queryTerms.length === 0) {
      // Return first few chunks if query is empty or punctuation-only
      return res.rows.slice(0, topK).map(r => ({
        chunkIndex: r.chunk_index,
        pageNumber: r.page_number,
        chapterTitle: r.chapter_title || "General",
        content: r.content,
        score: 1.0,
        snippet: r.content.slice(0, 160) + "..."
      }));
    }

    // Calculate term frequencies & BM25-like scoring across document chunks
    const totalChunks = res.rows.length;
    const docFreq: Record<string, number> = {};

    for (const row of res.rows) {
      const lowerContent = row.content.toLowerCase();
      const seenTerms = new Set<string>();
      for (const term of queryTerms) {
        if (lowerContent.includes(term)) {
          seenTerms.add(term);
        }
      }
      for (const term of seenTerms) {
        docFreq[term] = (docFreq[term] || 0) + 1;
      }
    }

    const scoredChunks: RetrievedChunk[] = res.rows.map(row => {
      const lowerContent = row.content.toLowerCase();
      let score = 0;

      for (const term of queryTerms) {
        // Count occurrences
        const matches = (lowerContent.match(new RegExp(`\\b${term}`, "gi")) || []).length;
        if (matches > 0) {
          const idf = Math.log((totalChunks + 1) / ((docFreq[term] || 0) + 1)) + 1;
          const tf = (matches * 2.2) / (matches + 1.2 * (1 - 0.75 + 0.75 * (row.content.length / 500)));
          score += tf * idf;
        }
      }

      // Bonus for chapter title match
      if (row.chapter_title && queryTerms.some(t => row.chapter_title.toLowerCase().includes(t))) {
        score += 3.0;
      }

      // Check if page number was explicitly requested (e.g. "page 4", "on page 12")
      const pageMatch = searchQuery.match(/\bpage\s*(\d+)\b/i);
      if (pageMatch && parseInt(pageMatch[1], 10) === row.page_number) {
        score += 10.0;
      }

      // Generate highlighted snippet around best matching term
      let snippet = row.content.slice(0, 200) + "...";
      for (const term of queryTerms) {
        const idx = lowerContent.indexOf(term);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(row.content.length, idx + 140);
          snippet = (start > 0 ? "..." : "") + row.content.slice(start, end) + (end < row.content.length ? "..." : "");
          break;
        }
      }

      return {
        chunkIndex: row.chunk_index,
        pageNumber: row.page_number,
        chapterTitle: row.chapter_title || "General",
        content: row.content,
        score,
        snippet
      };
    });

    // Sort descending by score
    scoredChunks.sort((a, b) => b.score - a.score);

    // If highest score is 0, return first K chunks
    if (scoredChunks[0].score === 0) {
      return scoredChunks.slice(0, topK);
    }

    return scoredChunks.slice(0, topK);
  }
}
