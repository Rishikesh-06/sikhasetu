import type { ExtractedPage } from "./pdf-service";

export interface DocumentChunk {
  chunkIndex: number;
  pageNumber: number;
  chapterTitle: string;
  content: string;
  keywords: string[];
}

export class ChunkingService {
  private static readonly TARGET_CHUNK_SIZE = 600; // characters per chunk
  private static readonly OVERLAP_SIZE = 100;

  /**
   * Chunks extracted pages while preserving page bounds and detecting chapter headings.
   */
  public static chunkPages(pages: ExtractedPage[]): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let currentChapter = "General Overview";
    let globalIndex = 0;

    for (const page of pages) {
      if (!page.text || page.text.trim().length === 0) continue;

      // Detect potential chapter heading on this page
      const detectedHeading = this.detectChapterHeading(page.text);
      if (detectedHeading) {
        currentChapter = detectedHeading;
      }

      // Split page text into paragraphs/sections
      const paragraphs = page.text
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      let currentChunkText = "";

      for (const para of paragraphs) {
        if ((currentChunkText + "\n" + para).length > this.TARGET_CHUNK_SIZE && currentChunkText.length > 150) {
          chunks.push({
            chunkIndex: globalIndex++,
            pageNumber: page.pageNumber,
            chapterTitle: currentChapter,
            content: currentChunkText.trim(),
            keywords: this.extractKeywords(currentChunkText)
          });

          // Retain overlap from end of previous chunk
          const words = currentChunkText.split(/\s+/);
          const overlap = words.slice(-15).join(" ");
          currentChunkText = overlap + "\n" + para;
        } else {
          currentChunkText = currentChunkText ? `${currentChunkText}\n${para}` : para;
        }
      }

      if (currentChunkText.trim().length > 0) {
        chunks.push({
          chunkIndex: globalIndex++,
          pageNumber: page.pageNumber,
          chapterTitle: currentChapter,
          content: currentChunkText.trim(),
          keywords: this.extractKeywords(currentChunkText)
        });
      }
    }

    // Fallback if no chunks were generated
    if (chunks.length === 0 && pages.length > 0) {
      chunks.push({
        chunkIndex: 0,
        pageNumber: 1,
        chapterTitle: "Introduction",
        content: pages.map(p => p.text).join(" ").slice(0, 1000) || "Empty document text",
        keywords: ["document", "overview"]
      });
    }

    return chunks;
  }

  /**
   * Detects chapter / unit headings in the text.
   */
  private static detectChapterHeading(text: string): string | null {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const firstLines = lines.slice(0, 5);

    for (const line of firstLines) {
      // Matches "Chapter 1: Nutrition in Plants", "UNIT 3 - Electric Current", "Lesson 4. Algebra", etc.
      const chapterMatch = line.match(/^(?:chapter|unit|lesson|topic|section)\s*[\dIVXLCDM]+[:.\s-]+(.+)/i);
      if (chapterMatch) {
        return line.slice(0, 80);
      }

      // Check for standalone "Chapter 1", "Unit 2"
      if (/^(?:chapter|unit|lesson)\s*[\dIVXLCDM]+/i.test(line) && line.length < 40) {
        return line;
      }
    }

    return null;
  }

  /**
   * Extracts salient keywords for term frequency matching.
   */
  public static extractKeywords(text: string): string[] {
    const stopWords = new Set([
      "the", "and", "that", "have", "for", "not", "with", "you", "this", "but",
      "his", "from", "they", "say", "her", "she", "will", "one", "all", "would",
      "there", "their", "what", "out", "about", "who", "get", "which", "when",
      "make", "can", "like", "time", "just", "him", "know", "take", "people",
      "into", "year", "your", "good", "some", "could", "them", "see", "other",
      "than", "then", "now", "look", "only", "come", "its", "over", "think",
      "also", "back", "after", "use", "two", "how", "our", "work", "first",
      "well", "way", "even", "new", "want", "because", "any", "these", "give"
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    const freqMap: Record<string, number> = {};
    for (const w of words) {
      freqMap[w] = (freqMap[w] || 0) + 1;
    }

    return Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
  }
}
