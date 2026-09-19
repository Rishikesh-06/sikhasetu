import { PDFParse } from "pdf-parse";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  charCount: number;
}

export interface PDFExtractionResult {
  success: boolean;
  pageCount: number;
  pages: ExtractedPage[];
  fullText: string;
  totalCharacters: number;
  isScannedOrEmpty: boolean;
  error?: string;
}

export class PDFService {
  /**
   * Extracts text and structured page streams from a base64 or Buffer PDF payload.
   */
  public static async extractTextFromPDF(data: string | Buffer | Uint8Array): Promise<PDFExtractionResult> {
    try {
      let rawBuf: Buffer;

      if (typeof data === "string") {
        if (data.startsWith("data:")) {
          const base64Clean = data.includes(",") ? data.split(",")[1] : data;
          rawBuf = Buffer.from(base64Clean, "base64");
        } else if (data.includes("--- Page ") || data.includes("\n") || !/^[A-Za-z0-9+/=]+$/.test(data.slice(0, 100))) {
          // Plain text study document
          rawBuf = Buffer.from(data, "utf-8");
        } else {
          // Base64 encoded PDF
          rawBuf = Buffer.from(data, "base64");
        }
      } else if (Buffer.isBuffer(data)) {
        rawBuf = data;
      } else {
        rawBuf = Buffer.from(data);
      }

      if (rawBuf.length === 0) {
        return {
          success: false,
          pageCount: 0,
          pages: [],
          fullText: "",
          totalCharacters: 0,
          isScannedOrEmpty: true,
          error: "Uploaded document is empty (0 bytes)."
        };
      }

      const isPdfHeader = rawBuf.slice(0, 5).toString("latin1").startsWith("%PDF-");

      if (isPdfHeader) {
        try {
          const uint8 = new Uint8Array(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength);
          const parser = new PDFParse(uint8);
          await parser.load();
          const textResult = await parser.getText();

          const rawPages = textResult?.pages || [];
          const pageCount = textResult?.total || rawPages.length || 1;

          const pages: ExtractedPage[] = rawPages.map((p, idx) => {
            const cleanText = (p.text || "")
              .replace(/\r\n/g, "\n")
              .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
              .trim();

            return {
              pageNumber: p.num || idx + 1,
              text: cleanText,
              charCount: cleanText.length
            };
          });

          const fullText = pages.map(p => `--- [Page ${p.pageNumber}] ---\n${p.text}`).join("\n\n");
          const totalCharacters = pages.reduce((acc, p) => acc + p.charCount, 0);
          const isScannedOrEmpty = totalCharacters < 20 || (pageCount > 1 && totalCharacters / pageCount < 20);

          return {
            success: true,
            pageCount,
            pages,
            fullText,
            totalCharacters,
            isScannedOrEmpty,
            error: isScannedOrEmpty
              ? "The uploaded PDF appears to be scanned or contains very little extractable text."
              : undefined
          };
        } catch (pdfErr: any) {
          console.warn("[PDFService] PDF binary parser warning, trying text extractor fallback:", pdfErr.message);
        }
      }

      // Text/Markdown format or text fallback extraction
      const utf8String = rawBuf.toString("utf-8").trim();
      const pageSections = utf8String.split(/---+\s*(?:Page|PAGE)\s*(\d+)\s*---+/i);

      let pages: ExtractedPage[] = [];

      if (pageSections.length > 1) {
        let currentPageNum = 1;
        for (let i = 0; i < pageSections.length; i++) {
          const item = pageSections[i].trim();
          if (/^\d+$/.test(item)) {
            currentPageNum = parseInt(item, 10);
          } else if (item.length > 0) {
            pages.push({
              pageNumber: currentPageNum,
              text: item,
              charCount: item.length
            });
            currentPageNum++;
          }
        }
      } else {
        // Chunk long text into logical pages (~2500 chars / page)
        const pageSize = 2500;
        const totalP = Math.max(1, Math.ceil(utf8String.length / pageSize));
        for (let p = 0; p < totalP; p++) {
          const slice = utf8String.slice(p * pageSize, (p + 1) * pageSize).trim();
          pages.push({
            pageNumber: p + 1,
            text: slice,
            charCount: slice.length
          });
        }
      }

      const fullText = pages.map(p => `--- [Page ${p.pageNumber}] ---\n${p.text}`).join("\n\n");
      const totalCharacters = pages.reduce((acc, p) => acc + p.charCount, 0);

      return {
        success: true,
        pageCount: pages.length,
        pages,
        fullText,
        totalCharacters,
        isScannedOrEmpty: totalCharacters < 10
      };
    } catch (err: any) {
      console.error("[PDFService] Error extracting text from document:", err);
      return {
        success: false,
        pageCount: 0,
        pages: [],
        fullText: "",
        totalCharacters: 0,
        isScannedOrEmpty: true,
        error: `Failed to process document: ${err.message || "Invalid document format."}`
      };
    }
  }
}
