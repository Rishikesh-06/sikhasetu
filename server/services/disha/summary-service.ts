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

export interface DocumentAnalysisResult {
  summary: string;
  structuredSummary: StructuredStudySummary;
  keyConcepts: KeyConceptItem[];
  chapters: ChapterSummaryItem[];
  detectedSubject: string;
  detectedClass: number;
}

export class SummaryService {
  private static readonly GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

  /**
   * Deeply analyzes the complete PDF and produces an exhaustive, structured study guide.
   */
  public static async analyzeDocument(params: {
    title: string;
    fullText: string;
    pageCount: number;
    studentClass?: number;
  }): Promise<DocumentAnalysisResult> {
    const { title, fullText, pageCount, studentClass = 7 } = params;
    const apiKey = (process.env.GROQ_API_KEY || process.env.XAI_API_KEY || "").trim();

    // Estimate reading time (~200 words per minute)
    const wordCount = fullText.split(/\s+/).length;
    const estimatedReadTimeMinutes = Math.max(2, Math.round(wordCount / 180));

    // For Groq llama-3.3-70b-versatile, pass complete text (up to 60,000 characters)
    const textSample = fullText.slice(0, 60000);

    const prompt = `You are DISHA, an expert educational intelligence engine creating a COMPLETE, IN-DEPTH, STRUCTURED STUDY GUIDE for an Indian school student in Class ${studentClass}.

Analyze the COMPLETE extracted PDF document provided below.
DOCUMENT TITLE: "${title}"
TOTAL PAGES: ${pageCount}

EXTRACTED FULL TEXT FROM PDF:
"""
${textSample}
"""

INSTRUCTIONS:
1. Ground your entire analysis STRICTLY on the actual contents, terminology, examples, definitions, and topics present in the document.
2. Do NOT invent concepts or replace the document with generic knowledge.
3. Extract actual specific concepts (e.g., Photosynthesis, Chlorophyll, Cellular Respiration, Kinetic Energy, Linear Equations), not generic category names.
4. Extract ALL important definitions, step-by-step processes, formulas (if any exist in the document), and examples.
5. If formulas exist in the PDF, populate "formulasAndEquations". If no formulas exist, return an empty array for it.

Return a STRICT JSON object matching this schema:
{
  "documentOverview": {
    "title": "${title}",
    "subject": "Detected Subject (e.g., Science, Mathematics, English, Social Science)",
    "classLevel": ${studentClass},
    "estimatedReadTimeMinutes": ${estimatedReadTimeMinutes},
    "highLevelSummary": "A detailed, engaging 3-paragraph summary of the entire document covering the core premise, key learning takeaways, and real-world significance.",
    "coreThemes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4"]
  },
  "keyConcepts": [
    {
      "name": "Specific Concept Name from PDF",
      "definition": "Detailed explanation based on the PDF content",
      "importance": "Why this concept is crucial to understand",
      "tag": "Foundational / Applied / Mechanism",
      "pageNumber": 1
    }
  ],
  "chapterSummaries": [
    {
      "id": "sec-1",
      "title": "Section or Chapter Title from PDF",
      "pageStart": 1,
      "pageEnd": ${Math.max(1, pageCount)},
      "summary": "Detailed multi-paragraph breakdown of this chapter/section's content",
      "keyPoints": [
        "In-depth point 1 directly from text",
        "In-depth point 2 directly from text",
        "In-depth point 3 directly from text"
      ],
      "definitions": [
        { "term": "Term", "explanation": "Explanation from text", "pageNumber": 1 }
      ],
      "suggestedQuestions": [
        "Thoughtful question 1 to test understanding?",
        "Exam-style question 2 from this section?"
      ]
    }
  ],
  "importantDefinitions": [
    {
      "term": "Term Name",
      "definition": "Clear, precise definition based on the document",
      "context": "How it is used in the chapter",
      "pageNumber": 1
    }
  ],
  "corePrinciples": [
    {
      "title": "Principle or Scientific/Mathematical Law",
      "statement": "Formal statement or description",
      "explanation": "Simple intuition calibrated for Class ${studentClass}",
      "pageNumber": 1
    }
  ],
  "formulasAndEquations": [
    {
      "name": "Formula Name (e.g., Photosynthesis Chemical Equation, Speed Formula)",
      "formula": "6CO2 + 6H2O -> C6H12O6 + 6O2 or formula string",
      "variables": [
        { "symbol": "CO2", "meaning": "Carbon dioxide", "unit": "" }
      ],
      "usage": "When and why this formula is applied",
      "example": "Sample calculation or scenario if present in PDF",
      "pageNumber": 1
    }
  ],
  "processesAndSteps": [
    {
      "processName": "Name of Process / Mechanism / Experiment",
      "objective": "What this process achieves",
      "steps": [
        { "stepNumber": 1, "action": "Step title", "details": "Detailed explanation of what happens in step 1" },
        { "stepNumber": 2, "action": "Step title", "details": "Detailed explanation of what happens in step 2" }
      ],
      "pageNumber": 1
    }
  ],
  "examplesAndApplications": [
    {
      "title": "Example Title from PDF",
      "concept": "Related Concept",
      "problemOrScenario": "The scenario or question presented in the text",
      "solutionOrExplanation": "How it is solved or explained in the text",
      "pageNumber": 1
    }
  ],
  "importantFacts": [
    {
      "fact": "Factual statement or key data point from PDF",
      "significance": "Why this fact is notable",
      "pageNumber": 1
    }
  ],
  "quickRevision": {
    "rememberPoints": [
      "Key memory anchor 1",
      "Key memory anchor 2",
      "Key memory anchor 3",
      "Key memory anchor 4"
    ],
    "examFocusPoints": [
      "High yield exam point 1",
      "High yield exam point 2",
      "Common mistake students make to avoid"
    ]
  }
}

Respond strictly with valid JSON.`;

    if (!apiKey) {
      return this.generateFallbackAnalysis(title, pageCount, textSample, studentClass, estimatedReadTimeMinutes);
    }

    const models = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b", "groq/compound"];
    let rawContent: string | null = null;

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
              { role: "system", content: "You are DISHA's deep pedagogical document analysis engine. You extract rich, exhaustive educational study guides directly from textbooks and study materials. Return valid JSON only." },
              { role: "user", content: prompt }
            ],
            temperature: 0.2,
            response_format: { type: "json_object" }
          })
        });

        if (!response.ok) {
          console.warn(`[SummaryService] Model ${model} returned HTTP ${response.status}. Trying next model...`);
          continue;
        }

        const data: any = await response.json();
        rawContent = data.choices?.[0]?.message?.content?.trim() || null;
        if (rawContent) break;
      } catch (e: any) {
        console.warn(`[SummaryService] Model ${model} request failed:`, e.message);
      }
    }

    try {
      if (!rawContent) {
        throw new Error("No model produced valid structured summary JSON");
      }

      const parsed = JSON.parse(rawContent);

      // Normalization of parsed sections
      const normConcepts: KeyConceptItem[] = Array.isArray(parsed.keyConcepts)
        ? parsed.keyConcepts.map((k: any) => ({
            name: k.name || k.concept || k.title || "Key Concept",
            definition: k.definition || k.explanation || k.description || "",
            importance: k.importance || k.whyItMatters || "Core foundational concept in this document.",
            tag: k.tag || k.category || "Foundational",
            pageNumber: typeof k.pageNumber === "number" ? k.pageNumber : 1
          }))
        : [];

      const normChapters: ChapterSummaryItem[] = Array.isArray(parsed.chapterSummaries)
        ? parsed.chapterSummaries.map((ch: any, idx: number) => ({
            id: ch.id || `sec-${idx + 1}`,
            title: ch.title || ch.chapterTitle || `Chapter / Section ${idx + 1}`,
            pageStart: typeof ch.pageStart === "number" ? ch.pageStart : (typeof ch.pageNumber === "number" ? ch.pageNumber : 1),
            pageEnd: typeof ch.pageEnd === "number" ? ch.pageEnd : (typeof ch.pageNumber === "number" ? ch.pageNumber : pageCount),
            summary: ch.summary || ch.content || "",
            keyPoints: Array.isArray(ch.keyPoints) ? ch.keyPoints : (Array.isArray(ch.keyTakeaways) ? ch.keyTakeaways : []),
            definitions: Array.isArray(ch.definitions) ? ch.definitions : [],
            suggestedQuestions: Array.isArray(ch.suggestedQuestions) ? ch.suggestedQuestions : []
          }))
        : [];

      const normDefs: DefinitionItem[] = Array.isArray(parsed.importantDefinitions)
        ? parsed.importantDefinitions.map((d: any) => ({
            term: d.term || d.name || "Term",
            definition: d.definition || d.meaning || d.explanation || "",
            context: d.context || "Important terminology from the study material.",
            pageNumber: typeof d.pageNumber === "number" ? d.pageNumber : 1
          }))
        : [];

      const normPrinciples: CorePrincipleItem[] = Array.isArray(parsed.corePrinciples)
        ? parsed.corePrinciples.map((p: any) => ({
            title: p.title || p.name || "Core Principle",
            statement: p.statement || p.law || p.rule || "",
            explanation: p.explanation || p.intuition || "",
            pageNumber: typeof p.pageNumber === "number" ? p.pageNumber : 1
          }))
        : [];

      const normFormulas: FormulaItem[] = Array.isArray(parsed.formulasAndEquations)
        ? parsed.formulasAndEquations.map((f: any) => ({
            name: f.name || f.equationName || "Formula / Reaction",
            formula: f.formula || f.equation || "",
            variables: Array.isArray(f.variables)
              ? f.variables.map((v: any) => typeof v === "string" ? { symbol: v, meaning: v } : v)
              : (typeof f.variableMeaning === "string" ? [{ symbol: "Formula Variables", meaning: f.variableMeaning }] : []),
            usage: f.usage || f.notes || "Mathematical/scientific relationship extracted from document.",
            example: f.example || f.sampleProblem || undefined,
            pageNumber: typeof f.pageNumber === "number" ? f.pageNumber : 1
          }))
        : [];

      const normProcesses: ProcessItem[] = Array.isArray(parsed.processesAndSteps)
        ? parsed.processesAndSteps.map((pr: any) => ({
            processName: pr.processName || pr.name || "Process / Mechanism",
            objective: pr.objective || pr.purpose || "Step-by-step scientific mechanism.",
            steps: Array.isArray(pr.steps)
              ? pr.steps.map((st: any, sidx: number) => typeof st === "string"
                  ? { stepNumber: sidx + 1, action: `Step ${sidx + 1}`, details: st }
                  : { stepNumber: st.stepNumber || sidx + 1, action: st.action || `Step ${sidx + 1}`, details: st.details || st.action || "" })
              : [],
            pageNumber: typeof pr.pageNumber === "number" ? pr.pageNumber : 1
          }))
        : [];

      const normExamples: ExampleItem[] = Array.isArray(parsed.examplesAndApplications)
        ? parsed.examplesAndApplications.map((ex: any) => ({
            title: ex.title || ex.exampleTitle || "Example / Case Study",
            concept: ex.concept || "Applied Concept",
            problemOrScenario: ex.problemOrScenario || ex.scenario || ex.description || "",
            solutionOrExplanation: ex.solutionOrExplanation || ex.explanation || ex.solution || "",
            pageNumber: typeof ex.pageNumber === "number" ? ex.pageNumber : 1
          }))
        : [];

      const normFacts: ImportantFactItem[] = Array.isArray(parsed.importantFacts)
        ? parsed.importantFacts.map((fa: any) => ({
            fact: fa.fact || fa.statement || (typeof fa === "string" ? fa : "Key Fact"),
            significance: fa.significance || "High relevance for syllabus and exams.",
            pageNumber: typeof fa.pageNumber === "number" ? fa.pageNumber : 1
          }))
        : [];

      const normRevision: QuickRevisionData = {
        rememberPoints: Array.isArray(parsed.quickRevision?.rememberPoints)
          ? parsed.quickRevision.rememberPoints
          : (Array.isArray(parsed.rememberPoints) ? parsed.rememberPoints : []),
        examFocusPoints: Array.isArray(parsed.quickRevision?.examFocusPoints)
          ? parsed.quickRevision.examFocusPoints
          : (Array.isArray(parsed.examFocusPoints) ? parsed.examFocusPoints : []),
        commonMistakesToAvoid: Array.isArray(parsed.quickRevision?.commonMistakesToAvoid)
          ? parsed.quickRevision.commonMistakesToAvoid
          : []
      };

      const structuredSummary: StructuredStudySummary = {
        documentOverview: {
          title: parsed.documentOverview?.title || title,
          subject: parsed.documentOverview?.subject || "Science",
          classLevel: Number(parsed.documentOverview?.classLevel) || studentClass,
          estimatedReadTimeMinutes: Number(parsed.documentOverview?.estimatedReadTimeMinutes) || estimatedReadTimeMinutes,
          highLevelSummary: parsed.documentOverview?.highLevelSummary || `Comprehensive study guide on ${title}.`,
          coreThemes: Array.isArray(parsed.documentOverview?.coreThemes) ? parsed.documentOverview.coreThemes : []
        },
        keyConcepts: normConcepts,
        chapterSummaries: normChapters,
        importantDefinitions: normDefs,
        corePrinciples: normPrinciples,
        formulasAndEquations: normFormulas,
        processesAndSteps: normProcesses,
        examplesAndApplications: normExamples,
        importantFacts: normFacts,
        quickRevision: normRevision
      };

      const highLevelText = structuredSummary.documentOverview.highLevelSummary;

      return {
        summary: highLevelText,
        structuredSummary,
        keyConcepts: structuredSummary.keyConcepts,
        chapters: structuredSummary.chapterSummaries,
        detectedSubject: structuredSummary.documentOverview.subject,
        detectedClass: structuredSummary.documentOverview.classLevel
      };
    } catch (err: any) {
      console.warn("[SummaryService] AI deep analysis error, using rich heuristic:", err.message);
      return this.generateFallbackAnalysis(title, pageCount, textSample, studentClass, estimatedReadTimeMinutes);
    }
  }

  /**
   * Translates the complete structured study guide into Telugu or Hindi with 100% complete field translation.
   */
  public static async translateStructuredSummary(
    paramsOrSummary: StructuredStudySummary | { structuredSummary: StructuredStudySummary; targetLanguage: "hi" | "te"; studentClass?: number },
    targetLanguageArg?: "hi" | "te",
    studentClassArg?: number
  ): Promise<StructuredStudySummary> {
    let structuredSummary: StructuredStudySummary;
    let targetLanguage: "hi" | "te";
    let studentClass: number = 7;

    if (paramsOrSummary && typeof paramsOrSummary === "object" && "structuredSummary" in paramsOrSummary) {
      structuredSummary = paramsOrSummary.structuredSummary;
      targetLanguage = paramsOrSummary.targetLanguage;
      studentClass = paramsOrSummary.studentClass || 7;
    } else {
      structuredSummary = paramsOrSummary as StructuredStudySummary;
      targetLanguage = targetLanguageArg || "hi";
      studentClass = studentClassArg || 7;
    }

    const apiKey = (process.env.GROQ_API_KEY || process.env.XAI_API_KEY || "").trim();
    if (!apiKey || !structuredSummary) return structuredSummary;

    const endpoint = apiKey.startsWith("xai-") ? "https://api.x.ai/v1/chat/completions" : this.GROQ_ENDPOINT;
    const models = apiKey.startsWith("xai-")
      ? ["grok-beta", "grok-2-latest"]
      : ["qwen/qwen3.8-27b", "openai/gpt-oss-20b", "openai/gpt-oss-120b", "groq/compound"];

    const langName = targetLanguage === "te" ? "Telugu (తెలుగు)" : "Hindi (हिंदी)";
    const scriptGuidance = targetLanguage === "te"
      ? "Translate all explanations, definitions, concept descriptions, steps, examples, and study notes into natural, fluent Telugu using authentic Telugu script (తెలుగు లిపి). Keep chemical formulas, math symbols, and standard scientific terms recognizable."
      : "Translate all explanations, definitions, concept descriptions, steps, examples, and study notes into natural, fluent Hindi using Devanagari script (देवनागरी लिपि). Keep chemical formulas, math symbols, and standard scientific terms recognizable.";

    const prompt = `You are DISHA's pedagogical translator for Indian school students in Class ${studentClass}.
Translate the entire educational study guide below from English into ${langName}.

CRITICAL REQUIREMENTS:
1. ${scriptGuidance}
2. Translate ALL sections completely:
   - documentOverview: title, subject, highLevelSummary, coreThemes
   - keyConcepts: name, definition, importance, tag
   - chapterSummaries: title, summary, keyPoints, suggestedQuestions
   - importantDefinitions: term, definition, context
   - corePrinciples: title, statement, explanation
   - formulasAndEquations: name, variables (meanings), usage, notes. (Keep the formula string itself intact)
   - processesAndSteps: processName, objective, steps (action, details)
   - examplesAndApplications: title, concept, problemOrScenario, solutionOrExplanation
   - importantFacts: fact, significance
   - quickRevision: rememberPoints, examFocusPoints, commonMistakesToAvoid
3. Do NOT omit any section or array items.
4. Return strictly valid JSON with the exact same structure and keys.

INPUT STUDY GUIDE:
${JSON.stringify(structuredSummary)}
`;

    let rawContent: string | null = null;

    for (const model of models) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: `You are DISHA's deep multilingual translator for Indian students. You translate the entire educational study guide into ${langName} thoroughly. You must return valid JSON only.` },
              { role: "user", content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 8192,
            response_format: { type: "json_object" }
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          rawContent = data.choices?.[0]?.message?.content?.trim() || null;
          if (rawContent) break;
        } else {
          console.warn(`[SummaryService] Model ${model} returned HTTP ${response.status}`);
          if (response.status === 429) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      } catch (err: any) {
        console.warn(`[SummaryService] Translation with ${model} failed, trying next:`, err.message);
      }
    }

    try {
      if (!rawContent) {
        throw new Error("No model produced valid translated JSON");
      }

      const parsed = JSON.parse(rawContent);

      // Normalization of translated sections
      let normConcepts: KeyConceptItem[] = Array.isArray(parsed.keyConcepts) && parsed.keyConcepts.length > 0
        ? parsed.keyConcepts.map((k: any, idx: number) => ({
            name: k.name || k.concept || k.title || structuredSummary.keyConcepts?.[idx]?.name || "Concept",
            definition: k.definition || k.explanation || k.description || "",
            importance: k.importance || k.whyItMatters || "",
            tag: k.tag || k.category || structuredSummary.keyConcepts?.[idx]?.tag || "Foundational",
            pageNumber: typeof k.pageNumber === "number" ? k.pageNumber : structuredSummary.keyConcepts?.[idx]?.pageNumber || 1
          }))
        : [];

      let normChapters: ChapterSummaryItem[] = Array.isArray(parsed.chapterSummaries) && parsed.chapterSummaries.length > 0
        ? parsed.chapterSummaries.map((ch: any, idx: number) => ({
            id: ch.id || structuredSummary.chapterSummaries?.[idx]?.id || `sec-${idx + 1}`,
            title: ch.title || ch.chapterTitle || structuredSummary.chapterSummaries?.[idx]?.title || `Section ${idx + 1}`,
            pageStart: typeof ch.pageStart === "number" ? ch.pageStart : structuredSummary.chapterSummaries?.[idx]?.pageStart || 1,
            pageEnd: typeof ch.pageEnd === "number" ? ch.pageEnd : structuredSummary.chapterSummaries?.[idx]?.pageEnd || 1,
            summary: ch.summary || ch.content || "",
            keyPoints: Array.isArray(ch.keyPoints) ? ch.keyPoints : (Array.isArray(ch.keyTakeaways) ? ch.keyTakeaways : []),
            definitions: Array.isArray(ch.definitions) ? ch.definitions : [],
            suggestedQuestions: Array.isArray(ch.suggestedQuestions) ? ch.suggestedQuestions : []
          }))
        : [];

      let normDefs: DefinitionItem[] = Array.isArray(parsed.importantDefinitions) && parsed.importantDefinitions.length > 0
        ? parsed.importantDefinitions.map((d: any, idx: number) => ({
            term: d.term || d.name || structuredSummary.importantDefinitions?.[idx]?.term || "Term",
            definition: d.definition || d.meaning || d.explanation || "",
            context: d.context || "",
            pageNumber: typeof d.pageNumber === "number" ? d.pageNumber : structuredSummary.importantDefinitions?.[idx]?.pageNumber || 1
          }))
        : [];

      let normPrinciples: CorePrincipleItem[] = Array.isArray(parsed.corePrinciples) && parsed.corePrinciples.length > 0
        ? parsed.corePrinciples.map((p: any, idx: number) => ({
            title: p.title || p.name || structuredSummary.corePrinciples?.[idx]?.title || "Principle",
            statement: p.statement || p.law || "",
            explanation: p.explanation || "",
            pageNumber: typeof p.pageNumber === "number" ? p.pageNumber : structuredSummary.corePrinciples?.[idx]?.pageNumber || 1
          }))
        : [];

      let normFormulas: FormulaItem[] = Array.isArray(parsed.formulasAndEquations) && parsed.formulasAndEquations.length > 0
        ? parsed.formulasAndEquations.map((f: any, idx: number) => ({
            name: f.name || f.equationName || structuredSummary.formulasAndEquations?.[idx]?.name || "Formula",
            formula: f.formula || structuredSummary.formulasAndEquations?.[idx]?.formula || "",
            variables: Array.isArray(f.variables)
              ? f.variables.map((v: any) => typeof v === "string" ? { symbol: v, meaning: v } : v)
              : (structuredSummary.formulasAndEquations?.[idx]?.variables || []),
            usage: f.usage || f.notes || "",
            example: f.example || undefined,
            pageNumber: typeof f.pageNumber === "number" ? f.pageNumber : structuredSummary.formulasAndEquations?.[idx]?.pageNumber || 1
          }))
        : [];

      let normProcesses: ProcessItem[] = Array.isArray(parsed.processesAndSteps) && parsed.processesAndSteps.length > 0
        ? parsed.processesAndSteps.map((pr: any, idx: number) => ({
            processName: pr.processName || pr.name || structuredSummary.processesAndSteps?.[idx]?.processName || "Process",
            objective: pr.objective || pr.purpose || "",
            steps: Array.isArray(pr.steps)
              ? pr.steps.map((st: any, sidx: number) => typeof st === "string"
                  ? { stepNumber: sidx + 1, action: `Step ${sidx + 1}`, details: st }
                  : { stepNumber: st.stepNumber || sidx + 1, action: st.action || `Step ${sidx + 1}`, details: st.details || st.action || "" })
              : (structuredSummary.processesAndSteps?.[idx]?.steps || []),
            pageNumber: typeof pr.pageNumber === "number" ? pr.pageNumber : structuredSummary.processesAndSteps?.[idx]?.pageNumber || 1
          }))
        : [];

      let normExamples: ExampleItem[] = Array.isArray(parsed.examplesAndApplications) && parsed.examplesAndApplications.length > 0
        ? parsed.examplesAndApplications.map((ex: any, idx: number) => ({
            title: ex.title || ex.exampleTitle || structuredSummary.examplesAndApplications?.[idx]?.title || "Example",
            concept: ex.concept || structuredSummary.examplesAndApplications?.[idx]?.concept || "",
            problemOrScenario: ex.problemOrScenario || ex.scenario || ex.description || "",
            solutionOrExplanation: ex.solutionOrExplanation || ex.explanation || ex.solution || "",
            pageNumber: typeof ex.pageNumber === "number" ? ex.pageNumber : structuredSummary.examplesAndApplications?.[idx]?.pageNumber || 1
          }))
        : [];

      let normFacts: ImportantFactItem[] = Array.isArray(parsed.importantFacts) && parsed.importantFacts.length > 0
        ? parsed.importantFacts.map((fa: any, idx: number) => ({
            fact: fa.fact || fa.statement || (typeof fa === "string" ? fa : structuredSummary.importantFacts?.[idx]?.fact || "Fact"),
            significance: fa.significance || "",
            pageNumber: typeof fa.pageNumber === "number" ? fa.pageNumber : structuredSummary.importantFacts?.[idx]?.pageNumber || 1
          }))
        : [];

      let normRevision: QuickRevisionData = {
        rememberPoints: Array.isArray(parsed.quickRevision?.rememberPoints) && parsed.quickRevision.rememberPoints.length > 0
          ? parsed.quickRevision.rememberPoints
          : (Array.isArray(parsed.rememberPoints) ? parsed.rememberPoints : []),
        examFocusPoints: Array.isArray(parsed.quickRevision?.examFocusPoints) && parsed.quickRevision.examFocusPoints.length > 0
          ? parsed.quickRevision.examFocusPoints
          : (Array.isArray(parsed.examFocusPoints) ? parsed.examFocusPoints : []),
        commonMistakesToAvoid: Array.isArray(parsed.quickRevision?.commonMistakesToAvoid)
          ? parsed.quickRevision.commonMistakesToAvoid
          : []
      };

      // Targeted sub-translation for any section that was omitted in the bulk prompt:
      if (normDefs.length === 0 && (structuredSummary.importantDefinitions || []).length > 0) {
        normDefs = await this.translateSectionArray(structuredSummary.importantDefinitions, "importantDefinitions", targetLanguage, studentClass);
      }
      if (normProcesses.length === 0 && (structuredSummary.processesAndSteps || []).length > 0) {
        normProcesses = await this.translateSectionArray(structuredSummary.processesAndSteps, "processesAndSteps", targetLanguage, studentClass);
      }
      if (normExamples.length === 0 && (structuredSummary.examplesAndApplications || []).length > 0) {
        normExamples = await this.translateSectionArray(structuredSummary.examplesAndApplications, "examplesAndApplications", targetLanguage, studentClass);
      }
      if (normRevision.rememberPoints.length === 0 && (structuredSummary.quickRevision?.rememberPoints || []).length > 0) {
        const rev = await this.translateSectionObject(structuredSummary.quickRevision, "quickRevision", targetLanguage, studentClass);
        if (rev?.rememberPoints) normRevision = rev;
      }

      const translatedSummary: StructuredStudySummary = {
        documentOverview: {
          title: parsed.documentOverview?.title || structuredSummary.documentOverview.title,
          subject: parsed.documentOverview?.subject || structuredSummary.documentOverview.subject,
          classLevel: parsed.documentOverview?.classLevel || structuredSummary.documentOverview.classLevel,
          estimatedReadTimeMinutes: parsed.documentOverview?.estimatedReadTimeMinutes || structuredSummary.documentOverview.estimatedReadTimeMinutes,
          highLevelSummary: parsed.documentOverview?.highLevelSummary || structuredSummary.documentOverview.highLevelSummary,
          coreThemes: Array.isArray(parsed.documentOverview?.coreThemes) && parsed.documentOverview.coreThemes.length > 0
            ? parsed.documentOverview.coreThemes
            : (structuredSummary.documentOverview.coreThemes || [])
        },
        keyConcepts: normConcepts.length > 0 ? normConcepts : structuredSummary.keyConcepts,
        chapterSummaries: normChapters.length > 0 ? normChapters : structuredSummary.chapterSummaries,
        importantDefinitions: normDefs,
        corePrinciples: normPrinciples,
        formulasAndEquations: normFormulas,
        processesAndSteps: normProcesses,
        examplesAndApplications: normExamples,
        importantFacts: normFacts,
        quickRevision: normRevision
      };

      return translatedSummary;
    } catch (err: any) {
      console.warn(`[SummaryService] Bulk translation error, falling back to section-by-section translation:`, err.message);
      return this.translateSectionBySection(structuredSummary, targetLanguage, studentClass);
    }
  }

  /**
   * Helper to translate a specific array section if omitted by the bulk translation pass.
   */
  private static async translateSectionArray(
    items: any[],
    sectionName: string,
    targetLanguage: "hi" | "te",
    studentClass: number
  ): Promise<any[]> {
    const apiKey = (process.env.GROQ_API_KEY || process.env.XAI_API_KEY || "").trim();
    if (!apiKey || !Array.isArray(items) || items.length === 0) return items;

    const endpoint = apiKey.startsWith("xai-") ? "https://api.x.ai/v1/chat/completions" : this.GROQ_ENDPOINT;
    const model = apiKey.startsWith("xai-") ? "grok-beta" : "openai/gpt-oss-120b";
    const langName = targetLanguage === "te" ? "Telugu (తెలుగు)" : "Hindi (हिंदी)";
    const prompt = `Translate this ${sectionName} array into ${langName} for a Class ${studentClass} Indian student. Keep JSON format and keys identical.\n\nINPUT:\n${JSON.stringify(items)}`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });
      if (res.ok) {
        const data: any = await res.json();
        const raw = data.choices?.[0]?.message?.content?.trim();
        const parsed = JSON.parse(raw);
        const result = parsed.items || parsed[sectionName] || parsed.result || Object.values(parsed)[0];
        if (Array.isArray(result) && result.length > 0) return result;
      }
    } catch (e: any) {
      console.warn(`[SummaryService] Targeted translation for ${sectionName} failed:`, e.message);
    }
    return items;
  }

  /**
   * Helper to translate a specific object section.
   */
  private static async translateSectionObject(
    obj: any,
    sectionName: string,
    targetLanguage: "hi" | "te",
    studentClass: number
  ): Promise<any> {
    const apiKey = (process.env.GROQ_API_KEY || process.env.XAI_API_KEY || "").trim();
    if (!apiKey || !obj) return obj;

    const endpoint = apiKey.startsWith("xai-") ? "https://api.x.ai/v1/chat/completions" : this.GROQ_ENDPOINT;
    const model = apiKey.startsWith("xai-") ? "grok-beta" : "openai/gpt-oss-120b";
    const langName = targetLanguage === "te" ? "Telugu (తెలుగు)" : "Hindi (हिंदी)";
    const prompt = `Translate this ${sectionName} object into ${langName} for a Class ${studentClass} Indian student. Keep JSON format and keys identical.\n\nINPUT:\n${JSON.stringify(obj)}`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });
      if (res.ok) {
        const data: any = await res.json();
        const raw = data.choices?.[0]?.message?.content?.trim();
        const parsed = JSON.parse(raw);
        return parsed[sectionName] || parsed.result || parsed;
      }
    } catch (e: any) {
      console.warn(`[SummaryService] Targeted object translation for ${sectionName} failed:`, e.message);
    }
    return obj;
  }

  /**
   * Section-by-section full fallback translation if bulk translation fails.
   */
  private static async translateSectionBySection(
    structuredSummary: StructuredStudySummary,
    targetLanguage: "hi" | "te",
    studentClass: number
  ): Promise<StructuredStudySummary> {
    const transConcepts = await this.translateSectionArray(structuredSummary.keyConcepts || [], "keyConcepts", targetLanguage, studentClass);
    const transChapters = await this.translateSectionArray(structuredSummary.chapterSummaries || [], "chapterSummaries", targetLanguage, studentClass);
    const transDefs = await this.translateSectionArray(structuredSummary.importantDefinitions || [], "importantDefinitions", targetLanguage, studentClass);
    const transPrinciples = await this.translateSectionArray(structuredSummary.corePrinciples || [], "corePrinciples", targetLanguage, studentClass);
    const transFormulas = await this.translateSectionArray(structuredSummary.formulasAndEquations || [], "formulasAndEquations", targetLanguage, studentClass);
    const transProcesses = await this.translateSectionArray(structuredSummary.processesAndSteps || [], "processesAndSteps", targetLanguage, studentClass);
    const transExamples = await this.translateSectionArray(structuredSummary.examplesAndApplications || [], "examplesAndApplications", targetLanguage, studentClass);
    const transFacts = await this.translateSectionArray(structuredSummary.importantFacts || [], "importantFacts", targetLanguage, studentClass);
    const transRevision = await this.translateSectionObject(structuredSummary.quickRevision || {}, "quickRevision", targetLanguage, studentClass);
    const transOverview = await this.translateSectionObject(structuredSummary.documentOverview || {}, "documentOverview", targetLanguage, studentClass);

    return {
      documentOverview: transOverview || structuredSummary.documentOverview,
      keyConcepts: transConcepts.length > 0 ? transConcepts : structuredSummary.keyConcepts,
      chapterSummaries: transChapters.length > 0 ? transChapters : structuredSummary.chapterSummaries,
      importantDefinitions: transDefs,
      corePrinciples: transPrinciples,
      formulasAndEquations: transFormulas,
      processesAndSteps: transProcesses,
      examplesAndApplications: transExamples,
      importantFacts: transFacts,
      quickRevision: transRevision || structuredSummary.quickRevision
    };
  }

  /**
   * Heuristic deep fallback analysis extracting actual lines from the document.
   */
  private static generateFallbackAnalysis(
    title: string,
    pageCount: number,
    textSample: string,
    studentClass: number,
    estimatedReadTimeMinutes: number
  ): DocumentAnalysisResult {
    const cleanTitle = title.replace(/\.pdf$/i, "");
    const lines = textSample
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 20);

    const isMath = /math|equation|algebra|fraction|triangle|geometry/i.test(title + textSample);
    const subject = isMath ? "Mathematics" : "Science";

    const extractedConcepts: KeyConceptItem[] = [];
    const extractedDefinitions: DefinitionItem[] = [];
    const extractedFacts: ImportantFactItem[] = [];

    lines.slice(0, 8).forEach((line, idx) => {
      if (line.includes(":") || line.includes(" is ") || line.includes(" are ")) {
        const parts = line.split(/[:\—\-]/);
        if (parts.length > 1 && parts[0].length < 35) {
          extractedConcepts.push({
            name: parts[0].trim(),
            definition: parts.slice(1).join(":").trim(),
            importance: "Key concept identified from text.",
            tag: "Core Concept",
            pageNumber: 1
          });
          extractedDefinitions.push({
            term: parts[0].trim(),
            definition: parts.slice(1).join(":").trim(),
            context: "Study Notes",
            pageNumber: 1
          });
        }
      }
      extractedFacts.push({
        fact: line,
        significance: "Extracted statement from document.",
        pageNumber: 1
      });
    });

    if (extractedConcepts.length === 0) {
      extractedConcepts.push({
        name: cleanTitle,
        definition: lines[0] || `Primary topic covered across ${pageCount} pages.`,
        importance: "Central subject of this study material.",
        tag: "Core Theme",
        pageNumber: 1
      });
    }

    const structuredSummary: StructuredStudySummary = {
      documentOverview: {
        title: cleanTitle,
        subject,
        classLevel: studentClass,
        estimatedReadTimeMinutes,
        highLevelSummary: `This comprehensive study guide on "${cleanTitle}" synthesizes key definitions, core principles, and step-by-step takeaways across ${pageCount} page(s).\n\nIt provides structured explanations, critical exam focus points, and practical applications tailored for Class ${studentClass} students.`,
        coreThemes: [cleanTitle, `${subject} Fundamentals`, "Exam Mastery", "Applied Problem Solving"]
      },
      keyConcepts: extractedConcepts,
      chapterSummaries: [
        {
          id: "sec-1",
          title: cleanTitle,
          pageStart: 1,
          pageEnd: pageCount,
          summary: `Complete coverage of ${cleanTitle} detailing foundational definitions, mechanisms, and real-world examples.`,
          keyPoints: lines.slice(0, 4).map(l => l.slice(0, 140)),
          definitions: extractedDefinitions.slice(0, 3),
          suggestedQuestions: [
            `What is the primary significance of ${cleanTitle}?`,
            "How do the core principles apply to daily life?",
            "What are the high-yield questions for exams?"
          ]
        }
      ],
      importantDefinitions: extractedDefinitions.length > 0 ? extractedDefinitions : [
        {
          term: cleanTitle,
          definition: lines[0] || "Primary concept of this document.",
          context: "Foundational Topic",
          pageNumber: 1
        }
      ],
      corePrinciples: [
        {
          title: `${cleanTitle} Principle`,
          statement: lines[0] || "Core fundamental principle of the document.",
          explanation: "Essential knowledge required for class mastery and exam preparation.",
          pageNumber: 1
        }
      ],
      formulasAndEquations: isMath ? [
        {
          name: "Standard Relationship Formula",
          formula: "y = f(x)",
          variables: [{ symbol: "x", meaning: "Input variable" }, { symbol: "y", meaning: "Output value" }],
          usage: "Applied for calculating relationships.",
          pageNumber: 1
        }
      ] : [],
      processesAndSteps: [
        {
          processName: `Understanding ${cleanTitle}`,
          objective: "Step-by-step master workflow of the topic",
          steps: [
            { stepNumber: 1, action: "Identify Core Definitions", details: "Review terms and baseline premises." },
            { stepNumber: 2, action: "Understand the Mechanism", details: "Follow how components interact." },
            { stepNumber: 3, action: "Practice Applications", details: "Test understanding with sample problems and exam points." }
          ],
          pageNumber: 1
        }
      ],
      examplesAndApplications: [
        {
          title: `Application of ${cleanTitle}`,
          concept: cleanTitle,
          problemOrScenario: "How this concept manifests in nature or real-world problem sets.",
          solutionOrExplanation: "Explained directly via the core laws and facts detailed in the document.",
          pageNumber: 1
        }
      ],
      importantFacts: extractedFacts.slice(0, 5),
      quickRevision: {
        rememberPoints: [
          `Review all key definitions for ${cleanTitle}.`,
          "Pay close attention to step-by-step mechanism details.",
          "Verify understanding by attempting the suggested questions."
        ],
        examFocusPoints: [
          "Direct definition questions are high probability.",
          "Explain mechanisms using bullet points and labeled diagrams where applicable."
        ]
      }
    };

    return {
      summary: structuredSummary.documentOverview.highLevelSummary,
      structuredSummary,
      keyConcepts: structuredSummary.keyConcepts,
      chapters: structuredSummary.chapterSummaries,
      detectedSubject: subject,
      detectedClass: studentClass
    };
  }
}
