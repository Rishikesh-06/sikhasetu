import React, { useState, useEffect, useRef } from "react";
import { AppShell } from "./app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
  dishaApi,
  type DishaDocument,
  type DishaMessage,
  type DishaQuiz,
  type KeyConceptItem,
  type ChapterSummaryItem,
  type DefinitionItem,
  type CorePrincipleItem,
  type FormulaItem,
  type ProcessItem,
  type ExampleItem,
  type ImportantFactItem,
  type StructuredStudySummary,
  type GroundedSource
} from "@/services/api/disha-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Compass,
  UploadCloud,
  FileText,
  BookOpen,
  Sparkles,
  Send,
  Volume2,
  VolumeX,
  Volume1,
  Copy,
  Check,
  RotateCcw,
  PlusCircle,
  Globe,
  Loader2,
  Bot,
  User,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Award,
  Layers,
  Mic,
  MicOff,
  ChevronRight,
  ChevronDown,
  Bookmark,
  ExternalLink,
  AlertCircle,
  Clock,
  BookMarked,
  CheckSquare,
  Binary,
  GitCommit,
  FlaskConical,
  Scale,
  ListOrdered,
  Maximize2,
  Minimize2,
  Languages,
  Play,
  Pause
} from "lucide-react";

interface LanguageOption {
  code: "en" | "hi" | "te";
  name: string;
  nativeName: string;
  speechCode: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", speechCode: "en-US" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", speechCode: "hi-IN" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", speechCode: "te-IN" }
];

const SECTION_HEADERS = {
  en: {
    overview: "Document Overview & Learning Scope",
    coreThemes: "Core Themes Explored:",
    concepts: "Key Concepts & Mechanisms",
    whyItMatters: "Why it matters:",
    chapters: "Chapter & Section Breakdowns",
    corePoints: "Core Points:",
    suggestedQuestions: "Suggested Questions to Test Understanding:",
    definitions: "Important Definitions & Glossary",
    context: "Context:",
    principles: "Core Principles, Laws & Theorems",
    formulas: "Formulas & Equations",
    variables: "Variables:",
    application: "Application:",
    processes: "Step-by-Step Mechanisms & Processes",
    examples: "Practical Examples & Case Studies",
    scenario: "Scenario / Problem:",
    explanation: "Explanation / Solution:",
    facts: "Key Facts, Constants & Data",
    revision: "Quick Revision & High-Yield Exam Points",
    rememberAnchors: "Key Anchors to Remember",
    examFocus: "High-Yield Exam Focus",
    translatingTitle: "Translating complete study notes...",
    translatingDesc: "Disha is translating all concepts, chapters, definitions, formulas, and revision points."
  },
  hi: {
    overview: "दस्तावेज़ अवलोकन एवं अध्ययन दायरा",
    coreThemes: "मुख्य विषय:",
    concepts: "प्रमुख अवधारणाएं एवं कार्यप्रणाली",
    whyItMatters: "यह क्यों महत्वपूर्ण है:",
    chapters: "अध्याय एवं अनुभाग विवरण",
    corePoints: "मुख्य बिंदु:",
    suggestedQuestions: "समझ परखने हेतु अभ्यास प्रश्न:",
    definitions: "महत्वपूर्ण परिभाषाएं एवं शब्दावली",
    context: "संदर्भ:",
    principles: "मूल सिद्धांत, नियम एवं प्रमेय",
    formulas: "सूत्र एवं समीकरण",
    variables: "चर (Variables):",
    application: "उपयोग:",
    processes: "चरणबद्ध प्रक्रियाएं एवं तंत्र",
    examples: "व्यावहारिक उदाहरण एवं केस स्टडी",
    scenario: "परिदृश्य / स्थिति:",
    explanation: "व्याख्या / समाधान:",
    facts: "महत्वपूर्ण तथ्य एवं आंकड़े",
    revision: "त्वरित पुनरावलोकन एवं परीक्षा उपयोगी बिंदु",
    rememberAnchors: "याद रखने योग्य मुख्य बातें",
    examFocus: "उच्च-अंक परीक्षा बिंदु",
    translatingTitle: "सम्पूर्ण अध्ययन सामग्री का हिंदी में अनुवाद किया जा रहा है...",
    translatingDesc: "दिशा सभी अवधारणाओं, अध्यायों, परिभाषाओं, सूत्रों और पुनरावलोकन बिंदुओं का अनुवाद कर रही है।"
  },
  te: {
    overview: "పత్ర అవలోకనం & అభ్యాస పరిధి",
    coreThemes: "ముఖ్య అధ్యయన విషయాలు:",
    concepts: "ముఖ్య భావనలు & విధానాలు",
    whyItMatters: "ఇది ఎందుకు ముఖ్యం:",
    chapters: "అధ్యాయం & విభాగ వివరణలు",
    corePoints: "ప్రధాన అంశాలు:",
    suggestedQuestions: "అవగాహన పరీక్షించుకోవడానికి ప్రశ్నలు:",
    definitions: "ముఖ్యమైన నిర్వచనాలు & పదకోశం",
    context: "సందర్భం:",
    principles: "మూల సూత్రాలు, నియమాలు & సిద్ధాంతాలు",
    formulas: "సూత్రాలు & సమీకరణాలు",
    variables: "చరరాశులు (Variables):",
    application: "ఉపయోగం:",
    processes: "దశల వారీ ప్రక్రియలు & విధానాలు",
    examples: "ఆచరణాత్మక ఉదాహరణలు & అధ్యయనాలు",
    scenario: "సందర్భం / దృష్టాంతం:",
    explanation: "వివరణ / పరిష్కారం:",
    facts: "ముఖ్య వాస్తవాలు & సమాచారం",
    revision: "త్వరిత పునర్విమర్శ & పరీక్షా ముఖ్యాంశాలు",
    rememberAnchors: "గుర్తుంచుకోవలసిన ముఖ్య విషయాలు",
    examFocus: "పరీక్షా ప్రత్యేకాంశాలు",
    translatingTitle: "పూర్తి అధ్యయన గైడ్ తెలుగులోకి అనువదించబడుతోంది...",
    translatingDesc: "దిశ అన్ని భావనలు, అధ్యాయాలు, నిర్వచనాలు, సూత్రాలు మరియు పునర్విమర్శ అంశాలను అనువదిస్తోంది."
  }
};

const PROCESSING_STEPS = [
  "Reading complete document text",
  "Identifying chapters & structural sections",
  "Extracting concepts, definitions & formulas",
  "Generating deep multi-section study notes",
  "Preparing your Disha grounded tutor"
];

export function StudentDisha() {
  const { user } = useAuth();

  // Document Library & Selection State
  const [documents, setDocuments] = useState<DishaDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DishaDocument | null>(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // Active Workspace Tab: 'summary' | 'chapters' | 'chat' | 'quiz'
  const [activeTab, setActiveTab] = useState<"summary" | "chapters" | "chat" | "quiz">("summary");

  // Summary View State (Language & Collapsible Sections)
  const [summaryLanguage, setSummaryLanguage] = useState<"en" | "hi" | "te">("en");
  const [activeStructuredSummary, setActiveStructuredSummary] = useState<StructuredStudySummary | null>(null);
  const [isTranslatingSummary, setIsTranslatingSummary] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    concepts: true,
    chapters: true,
    definitions: true,
    principles: true,
    formulas: true,
    processes: true,
    examples: true,
    facts: true,
    revision: true
  });
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStepIndex, setProcessingStepIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat State
  const [messages, setMessages] = useState<DishaMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatLanguage, setChatLanguage] = useState<"en" | "hi" | "te">("en");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Speech & Voice State
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isSummarySpeaking, setIsSummarySpeaking] = useState(false);
  const [isSummaryPaused, setIsSummaryPaused] = useState(false);
  const [summarySpeechProgress, setSummarySpeechProgress] = useState<string>("");
  
  const recognitionRef = useRef<any>(null);
  const ttsQueueRef = useRef<string[]>([]);
  const ttsIndexRef = useRef<number>(0);
  const ttsIsSpeakingRef = useRef<boolean>(false);

  // Quiz State
  const [activeQuiz, setActiveQuiz] = useState<DishaQuiz | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const overviewData = activeStructuredSummary?.documentOverview || selectedDoc?.structuredSummary?.documentOverview;

  // 0. Load and listen for speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const vs = window.speechSynthesis.getVoices();
        if (vs.length > 0) setAvailableVoices(vs);
      }
    };
    loadVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 1. Fetch initial documents
  useEffect(() => {
    loadDocuments();
  }, []);

  // 2. Set structured summary when document is selected
  useEffect(() => {
    if (selectedDoc) {
      setSummaryLanguage("en");
      if (selectedDoc.structuredSummary) {
        setActiveStructuredSummary(selectedDoc.structuredSummary);
      }
      // Expand all chapters by default
      const chaps = selectedDoc.structuredSummary?.chapterSummaries || selectedDoc.chapters || [];
      const chapMap: Record<string, boolean> = {};
      chaps.forEach((c, idx) => {
        chapMap[c.id || `chap-${idx}`] = true;
      });
      setExpandedChapters(chapMap);
    }
  }, [selectedDoc]);

  // 3. Scroll chat on new messages
  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isChatLoading, activeTab]);

  // 4. Load conversation when switching to chat tab
  useEffect(() => {
    if (selectedDoc && activeTab === "chat") {
      loadDocumentConversation(selectedDoc.id);
    }
  }, [selectedDoc, activeTab]);

  const loadDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const res = await dishaApi.getDocuments();
      if (res.success) {
        setDocuments(res.documents || []);
      }
    } catch (err: any) {
      console.error("[Disha] Load documents error:", err);
      toast.error("Failed to load your study documents.");
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const loadDocumentConversation = async (docId: string) => {
    try {
      const convId = `conv-${docId}`;
      setActiveConversationId(convId);
      const res = await dishaApi.getConversation(convId);
      if (res.success && res.messages) {
        setMessages(res.messages);
      }
    } catch {
      setMessages([]);
    }
  };

  // Upload Handlers
  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      toast.error("Please upload a valid PDF document.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("PDF file size exceeds the 50MB limit.");
      return;
    }

    setIsUploading(true);
    setProcessingStepIndex(0);

    const interval = setInterval(() => {
      setProcessingStepIndex((prev) => (prev < PROCESSING_STEPS.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const uploadRes = await dishaApi.uploadPDF({
            fileName: file.name,
            fileData: base64Data,
            fileSize: file.size,
            title: file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ")
          });

          clearInterval(interval);
          setProcessingStepIndex(PROCESSING_STEPS.length - 1);

          if (uploadRes.success && uploadRes.document) {
            toast.success(`"${uploadRes.document.title}" analyzed deeply!`);
            await loadDocuments();
            setSelectedDoc(uploadRes.document);
            setActiveTab("summary");
          }
        } catch (err: any) {
          clearInterval(interval);
          toast.error(err.message || "Failed to process PDF.");
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        clearInterval(interval);
        setIsUploading(false);
        toast.error("Error reading file.");
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      clearInterval(interval);
      setIsUploading(false);
      toast.error(err.message || "Upload failed.");
    }
  };

  const handleDeleteDocument = async (e: React.MouseEvent, docId: string, docTitle: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${docTitle}"?`)) return;

    try {
      const res = await dishaApi.deleteDocument(docId);
      if (res.success) {
        toast.success("Document deleted.");
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
        }
        await loadDocuments();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document.");
    }
  };

  // Multilingual Summary Translation
  const handleSummaryLanguageChange = async (lang: "en" | "hi" | "te") => {
    if (summaryLanguage === lang || !selectedDoc) return;
    stopAllAudio();
    setSummaryLanguage(lang);

    if (lang === "en") {
      setActiveStructuredSummary(selectedDoc.structuredSummary || null);
      return;
    }

    // Check if translation is already cached on the document object
    if (selectedDoc.translatedSummaries && selectedDoc.translatedSummaries[lang]) {
      setActiveStructuredSummary(selectedDoc.translatedSummaries[lang]);
      return;
    }

    setIsTranslatingSummary(true);
    try {
      const res = await dishaApi.translateSummary(selectedDoc.id, lang);
      if (res.success && res.structuredSummary) {
        setActiveStructuredSummary(res.structuredSummary);
        setSelectedDoc((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            translatedSummaries: {
              ...(prev.translatedSummaries || {}),
              [lang]: res.structuredSummary!
            }
          };
        });
        const langName = LANGUAGES.find((l) => l.code === lang)?.name;
        toast.success(`Deep study guide translated to ${langName}!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Could not translate summary.");
      setSummaryLanguage("en");
      setActiveStructuredSummary(selectedDoc.structuredSummary || null);
    } finally {
      setIsTranslatingSummary(false);
    }
  };

  // Section Collapse Toggles
  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const toggleAllSections = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    Object.keys(expandedSections).forEach((k) => (updated[k] = expand));
    setExpandedSections(updated);

    const chapMap: Record<string, boolean> = {};
    (activeStructuredSummary?.chapterSummaries || selectedDoc?.chapters || []).forEach((c, idx) => {
      chapMap[c.id || `chap-${idx}`] = expand;
    });
    setExpandedChapters(chapMap);
  };

  const toggleChapter = (chapId: string) => {
    setExpandedChapters((prev) => ({ ...prev, [chapId]: !prev[chapId] }));
  };

  // Chat Handlers
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || !selectedDoc || isChatLoading) return;

    stopAllAudio();

    const tempUserMsg: DishaMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: textToSend,
      language: chatLanguage,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputMessage("");
    setIsChatLoading(true);

    try {
      const res = await dishaApi.sendChatMessage({
        documentId: selectedDoc.id,
        message: textToSend,
        language: chatLanguage,
        conversationId: activeConversationId || undefined
      });

      if (res.success) {
        const assistantMsg: DishaMessage = {
          id: res.messageId || `asst-${Date.now()}`,
          role: "assistant",
          content: res.reply,
          language: res.language || chatLanguage,
          sources: res.sources || [],
          isGrounded: res.isGrounded !== false,
          createdAt: new Date().toISOString()
        };

        setMessages((prev) => [...prev, assistantMsg]);
        if (res.conversationId) setActiveConversationId(res.conversationId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get response from Disha.");
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "I ran into an issue retrieving information from the document. Please try asking again.",
          language: chatLanguage,
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Voice Input (Speech Recognition)
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    stopAllAudio();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Please type your question.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;

      const langConfig = LANGUAGES.find((l) => l.code === chatLanguage) || LANGUAGES[0];
      recognition.lang = langConfig.speechCode;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info(`Listening in ${langConfig.name}... Speak now!`, { duration: 2000 });
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0]?.transcript)
          .join("");
        setInputMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("[SpeechRecognition Error]", event.error);
        setIsListening(false);
        if (event.error !== "no-speech") {
          toast.error("Could not capture speech. Please try again.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("[SpeechRecognition Init]", err);
      setIsListening(false);
      toast.error("Microphone access failed.");
    }
  };

  // Helper to select the most appropriate browser voice for English / Hindi / Telugu
  const getBestVoiceForLanguage = (langCode: "en" | "hi" | "te", voiceList: SpeechSynthesisVoice[]) => {
    if (!voiceList || voiceList.length === 0) return null;

    if (langCode === "hi") {
      const hi = voiceList.find(v => v.lang === "hi-IN" || v.lang.toLowerCase().startsWith("hi") || v.name.toLowerCase().includes("hindi"));
      if (hi) return hi;
      const inVoice = voiceList.find(v => v.lang.includes("IN") && !v.lang.startsWith("en"));
      if (inVoice) return inVoice;
    } else if (langCode === "te") {
      const te = voiceList.find(v => v.lang === "te-IN" || v.lang.toLowerCase().startsWith("te") || v.name.toLowerCase().includes("telugu"));
      if (te) return te;
      const inVoice = voiceList.find(v => v.lang === "hi-IN" || v.lang.includes("IN") || v.name.toLowerCase().includes("india"));
      if (inVoice) return inVoice;
    } else {
      const enIn = voiceList.find(v => v.lang === "en-IN" || (v.lang.startsWith("en") && v.name.toLowerCase().includes("india")));
      if (enIn) return enIn;
      const en = voiceList.find(v => v.lang.startsWith("en"));
      if (en) return en;
    }
    return voiceList[0] || null;
  };

  // Compile complete study guide script across all sections in the active language
  const compileFullSummaryScript = (summary: StructuredStudySummary, langCode: "en" | "hi" | "te"): string[] => {
    const parts: string[] = [];
    const isTe = langCode === "te";
    const isHi = langCode === "hi";

    // 1. Document Overview
    const overviewHeader = isTe ? "డాక్యుమెంట్ అధ్యయన సారాంశం:" : isHi ? "दस्तावेज़ अध्ययन सारांश:" : "Document Study Summary for";
    parts.push(`${overviewHeader} ${summary.documentOverview.title}.`);
    if (summary.documentOverview.highLevelSummary) {
      parts.push(summary.documentOverview.highLevelSummary);
    }
    if (summary.documentOverview.coreThemes?.length > 0) {
      const themesIntro = isTe ? "ముఖ్య అధ్యయన విషయాలు:" : isHi ? "मुख्य अध्ययन विषय:" : "Core themes explored:";
      parts.push(`${themesIntro} ${summary.documentOverview.coreThemes.join(", ")}.`);
    }

    // 2. Key Concepts
    if (summary.keyConcepts?.length > 0) {
      const conceptsHeader = isTe ? "ముఖ్య భావనలు మరియు వివరణలు:" : isHi ? "प्रमुख अवधारणाएं एवं व्याख्या:" : "Key Concepts and Explanations:";
      parts.push(conceptsHeader);
      summary.keyConcepts.forEach((c) => {
        parts.push(`${c.name}. ${c.definition}`);
        if (c.importance) {
          const impPrefix = isTe ? "ప్రాముఖ్యత:" : isHi ? "महत्व:" : "Why it matters:";
          parts.push(`${impPrefix} ${c.importance}`);
        }
      });
    }

    // 3. Chapter Summaries
    if (summary.chapterSummaries?.length > 0) {
      const chapHeader = isTe ? "అధ్యాయాల సారాంశం:" : isHi ? "अध्यायों का सारांश:" : "Chapter Summaries:";
      parts.push(chapHeader);
      summary.chapterSummaries.forEach((ch) => {
        parts.push(`${ch.title}. ${ch.summary}`);
        if (ch.keyPoints?.length > 0) {
          parts.push(ch.keyPoints.join(". "));
        }
      });
    }

    // 4. Important Definitions
    if (summary.importantDefinitions?.length > 0) {
      const defHeader = isTe ? "ముఖ్యమైన నిర్వచనాలు:" : isHi ? "महत्वपूर्ण परिभाषाएं:" : "Important Definitions:";
      parts.push(defHeader);
      summary.importantDefinitions.forEach((d) => {
        parts.push(`${d.term}: ${d.definition}`);
      });
    }

    // 5. Core Principles
    if (summary.corePrinciples?.length > 0) {
      const princHeader = isTe ? "మూల సూత్రాలు మరియు నియమాలు:" : isHi ? "मूल सिद्धांत और नियम:" : "Core Principles and Laws:";
      parts.push(princHeader);
      summary.corePrinciples.forEach((p) => {
        parts.push(`${p.title}: ${p.statement}. ${p.explanation}`);
      });
    }

    // 6. Formulas & Equations
    if (summary.formulasAndEquations?.length > 0) {
      const formHeader = isTe ? "సూత్రాలు మరియు సమీకరణాలు:" : isHi ? "सूत्र और समीकरण:" : "Formulas and Equations:";
      parts.push(formHeader);
      summary.formulasAndEquations.forEach((f) => {
        parts.push(`${f.name}: ${f.formula}. ${f.usage || ""}`);
      });
    }

    // 7. Processes & Steps
    if (summary.processesAndSteps?.length > 0) {
      const procHeader = isTe ? "దశల వారీ ప్రక్రియలు:" : isHi ? "चरणबद्ध प्रक्रियाएं:" : "Step-by-step processes:";
      parts.push(procHeader);
      summary.processesAndSteps.forEach((pr) => {
        const stepsText = pr.steps.map(s => `${s.action}: ${s.details}`).join(". ");
        parts.push(`${pr.processName}. ${pr.objective}. ${stepsText}`);
      });
    }

    // 8. Examples & Applications
    if (summary.examplesAndApplications?.length > 0) {
      const exHeader = isTe ? "ఆచరణాత్మక ఉదాహరణలు:" : isHi ? "व्यावहारिक उदाहरण:" : "Practical Examples and Case Studies:";
      parts.push(exHeader);
      summary.examplesAndApplications.forEach((ex) => {
        parts.push(`${ex.title}: ${ex.problemOrScenario}. ${ex.solutionOrExplanation}`);
      });
    }

    // 9. Important Facts
    if (summary.importantFacts?.length > 0) {
      const factsHeader = isTe ? "ముఖ్యమైన వాస్తవాలు:" : isHi ? "महत्वपूर्ण तथ्य:" : "Important Facts and Data:";
      parts.push(factsHeader);
      summary.importantFacts.forEach((fa) => {
        parts.push(`${fa.fact}. ${fa.significance}`);
      });
    }

    // 10. Quick Revision
    if (summary.quickRevision?.rememberPoints?.length > 0 || summary.quickRevision?.examFocusPoints?.length > 0) {
      const revHeader = isTe ? "త్వరిత పునర్విమర్శ మరియు పరీక్షా ముఖ్యాంశాలు:" : isHi ? "त्वरित पुनरावलोकन और परीक्षा बिंदु:" : "Quick Revision and High-Yield Exam Points:";
      parts.push(revHeader);
      if (summary.quickRevision.rememberPoints?.length > 0) {
        parts.push(summary.quickRevision.rememberPoints.join(". "));
      }
      if (summary.quickRevision.examFocusPoints?.length > 0) {
        parts.push(summary.quickRevision.examFocusPoints.join(". "));
      }
    }

    const fullText = parts.join(" \n ").replace(/[*_#`~[\]()]/g, " ").replace(/\s+/g, " ").trim();
    const sentenceRegex = /[^.!?\n]+[.!?\n]+/g;
    const rawSentences = fullText.match(sentenceRegex) || [fullText];

    // Merge sentences into ~220 char chunks for smooth speech progression
    const mergedChunks: string[] = [];
    let currentChunk = "";
    for (const s of rawSentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      if ((currentChunk + " " + trimmed).length < 220) {
        currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
      } else {
        if (currentChunk) mergedChunks.push(currentChunk);
        currentChunk = trimmed;
      }
    }
    if (currentChunk) mergedChunks.push(currentChunk);

    return mergedChunks.length > 0 ? mergedChunks : [fullText];
  };

  // Play chunk sequentially
  const playTtsChunk = (index: number) => {
    if (!("speechSynthesis" in window)) return;
    if (index >= ttsQueueRef.current.length || !ttsIsSpeakingRef.current) {
      setIsSummarySpeaking(false);
      setIsSummaryPaused(false);
      ttsIsSpeakingRef.current = false;
      setSummarySpeechProgress("");
      return;
    }

    ttsIndexRef.current = index;
    const chunk = ttsQueueRef.current[index];
    setSummarySpeechProgress(`Segment ${index + 1} of ${ttsQueueRef.current.length}`);

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(chunk);
    const langConfig = LANGUAGES.find(l => l.code === summaryLanguage) || LANGUAGES[0];
    utterance.lang = langConfig.speechCode;
    utterance.rate = 0.95;

    const selectedVoice = getBestVoiceForLanguage(
      summaryLanguage,
      availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices()
    );
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      if (ttsIsSpeakingRef.current && !isSummaryPaused) {
        playTtsChunk(index + 1);
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") {
        console.warn("[TTS Utterance Error]", e);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Audio Playback & Text-To-Speech with Chunking for Long Summaries
  const handleStartSummarySpeech = () => {
    if (!activeStructuredSummary) return;
    stopAllAudio();

    const chunks = compileFullSummaryScript(activeStructuredSummary, summaryLanguage);
    ttsQueueRef.current = chunks;
    ttsIndexRef.current = 0;
    ttsIsSpeakingRef.current = true;
    setIsSummarySpeaking(true);
    setIsSummaryPaused(false);

    playTtsChunk(0);
  };

  const handlePauseSummarySpeech = () => {
    if (!isSummarySpeaking) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.pause();
    }
    setIsSummaryPaused(true);
  };

  const handleResumeSummarySpeech = () => {
    if (!isSummarySpeaking) return;
    setIsSummaryPaused(false);
    if ("speechSynthesis" in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else {
      ttsIsSpeakingRef.current = true;
      playTtsChunk(ttsIndexRef.current);
    }
  };

  const handleToggleMessageAudio = (messageId: string, text: string, langCode: string) => {
    if (playingMessageId === messageId) {
      stopAllAudio();
      return;
    }

    stopAllAudio();

    if (!("speechSynthesis" in window)) {
      toast.info("Audio synthesis is not supported on this browser.");
      return;
    }

    const cleanText = text
      .replace(/[*_#`~[\]()]/g, " ")
      .replace(/\n+/g, ". ")
      .slice(0, 1000);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const langConfig = LANGUAGES.find((l) => l.code === langCode) || LANGUAGES[0];
    utterance.lang = langConfig.speechCode;
    utterance.rate = 0.95;

    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    const matchVoice = getBestVoiceForLanguage(langCode as any, voices);
    if (matchVoice) utterance.voice = matchVoice;

    utterance.onstart = () => setPlayingMessageId(messageId);
    utterance.onend = () => setPlayingMessageId(null);
    utterance.onerror = () => setPlayingMessageId(null);

    window.speechSynthesis.speak(utterance);
  };

  const stopAllAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    ttsIsSpeakingRef.current = false;
    ttsIndexRef.current = 0;
    ttsQueueRef.current = [];
    setIsSummarySpeaking(false);
    setIsSummaryPaused(false);
    setPlayingMessageId(null);
    setSummarySpeechProgress("");
  };

  // Quiz Handlers
  const handleGenerateQuiz = async () => {
    if (!selectedDoc) return;
    setIsGeneratingQuiz(true);
    try {
      const res = await dishaApi.generateQuiz(selectedDoc.id);
      if (res.success && res.quiz) {
        setActiveQuiz(res.quiz);
        setSelectedAnswers({});
        setQuizSubmitted(false);
        toast.success("Practice quiz generated from your PDF!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate quiz.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSelectQuizAnswer = (qIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  };

  const calculateQuizScore = () => {
    if (!activeQuiz) return 0;
    let score = 0;
    activeQuiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctOption) score++;
    });
    return score;
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppShell
      role="student"
      title={selectedDoc ? selectedDoc.title : "DISHA — Deep AI Study Companion"}
      eyebrow={selectedDoc ? `${selectedDoc.subject} · Class ${selectedDoc.classLevel}` : "PDF Learning Workspace"}
    >
      <div className="space-y-6">
        {/* VIEW 1: DOCUMENT LIBRARY & UPLOAD WORKSPACE */}
        {!selectedDoc && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background p-6 md:p-10 shadow-sm">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                  <Compass className="size-4 animate-spin-slow" /> DISHA Deep AI Study Companion
                </div>
                <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
                  Your study material, deeply understood.
                </h1>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Upload complete textbook chapters, lecture notes, or study PDFs. Disha extracts every concept,
                  generates rich multi-section study notes, formulas, step-by-step processes, and grounded exam revision.
                </p>
              </div>
            </div>

            {/* Upload Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 md:p-12 text-center transition-all",
                isDragging
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-border/80 bg-card/60 hover:border-primary/50 hover:bg-card",
                isUploading && "pointer-events-none opacity-85"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              {isUploading ? (
                <div className="flex flex-col items-center space-y-4 max-w-md w-full">
                  <div className="relative size-16 place-items-center rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                    <Loader2 className="size-8 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Analyzing Complete Study Material...
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Extracting full text, detecting chapters, concepts, formulas & definitions
                    </p>
                  </div>

                  {/* Processing Checklist */}
                  <div className="w-full space-y-2 rounded-2xl border border-border bg-background/80 p-4 text-left text-xs shadow-2xs">
                    {PROCESSING_STEPS.map((step, idx) => {
                      const isDone = idx < processingStepIndex;
                      const isCurrent = idx === processingStepIndex;
                      return (
                        <div
                          key={step}
                          className={cn(
                            "flex items-center gap-2.5 transition-colors",
                            isDone && "text-success font-medium",
                            isCurrent && "text-primary font-bold animate-pulse",
                            idx > processingStepIndex && "text-muted-foreground/50"
                          )}
                        >
                          {isDone ? (
                            <CheckCircle2 className="size-4 shrink-0 text-success" />
                          ) : isCurrent ? (
                            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                          ) : (
                            <div className="size-4 shrink-0 rounded-full border border-border" />
                          )}
                          <span>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4 max-w-md">
                  <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                    <UploadCloud className="size-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Upload PDF Study Material
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Drag & drop complete chapters, textbook units, or handwritten PDF notes (up to 50MB)
                    </p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl px-6 font-semibold shadow-xs"
                  >
                    <BookOpen className="mr-2 size-4" /> Browse PDF Files
                  </Button>
                </div>
              )}
            </div>

            {/* Document Library Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="size-5 text-primary" />
                  <h2 className="font-display text-xl font-bold text-foreground">
                    My Disha Documents
                  </h2>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {documents.length} Available
                </span>
              </div>

              {isLoadingDocs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-48 rounded-3xl border border-border bg-card/40 animate-pulse" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="rounded-3xl border border-border bg-card p-10 text-center space-y-2">
                  <Compass className="size-10 text-muted-foreground/40 mx-auto" />
                  <p className="font-semibold text-foreground">No study documents uploaded yet.</p>
                  <p className="text-xs text-muted-foreground">
                    Upload your first textbook PDF or study notes above to generate your comprehensive study guide.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoc(doc);
                        setActiveTab("summary");
                      }}
                      className="group relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-6 shadow-xs transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                            {doc.subject} · Class {doc.classLevel}
                          </span>
                          <button
                            onClick={(e) => handleDeleteDocument(e, doc.id, doc.title)}
                            className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 rounded"
                            title="Delete document"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>

                        <div>
                          <h3 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {doc.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {doc.summary || "Complete structured study guide & grounded tutor."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span>{doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""}</span>
                          <span>•</span>
                          <span>{doc.chapterCount || 1} section{doc.chapterCount !== 1 ? "s" : ""}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-primary font-semibold group-hover:translate-x-0.5 transition-transform">
                          Study Notes <ChevronRight className="size-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: ACTIVE DOCUMENT WORKSPACE */}
        {selectedDoc && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Document Header & Stats Bar */}
            <div className="rounded-3xl border border-border bg-card p-5 md:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      stopAllAudio();
                      setSelectedDoc(null);
                    }}
                    className="rounded-xl gap-1.5 text-xs font-semibold"
                  >
                    <ArrowLeft className="size-4" /> Library
                  </Button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                        {selectedDoc.subject} · Class {selectedDoc.classLevel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selectedDoc.pageCount} Pages • {selectedDoc.chapterCount || 1} Sections
                      </span>
                      {overviewData?.estimatedReadTimeMinutes && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                          <Clock className="size-3" /> ~{overviewData.estimatedReadTimeMinutes} min study
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-xl md:text-2xl font-bold text-foreground truncate max-w-xl mt-1">
                      {selectedDoc.title}
                    </h2>
                  </div>
                </div>

                {/* Workspace Navigation Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-muted/60 p-1.5">
                  <button
                    onClick={() => setActiveTab("summary")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all",
                      activeTab === "summary"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <BookMarked className="size-3.5" /> Deep Study Guide
                  </button>
                  <button
                    onClick={() => setActiveTab("chapters")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
                      activeTab === "chapters"
                        ? "bg-card text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Layers className="size-3.5" /> Sections
                  </button>
                  <button
                    onClick={() => setActiveTab("chat")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
                      activeTab === "chat"
                        ? "bg-card text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Sparkles className="size-3.5 text-primary" /> Ask Disha
                  </button>
                  <button
                    onClick={() => setActiveTab("quiz")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
                      activeTab === "quiz"
                        ? "bg-card text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Award className="size-3.5 text-amber-500" /> Practice Quiz
                  </button>
                </div>
              </div>
            </div>

            {/* TAB 1: COMPLETE DEEP STUDY GUIDE */}
            {activeTab === "summary" && (
              <div className="space-y-6">
                {/* Controls Bar: Language Selector, Expand/Collapse, Listen to Summary */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/80 p-3.5 shadow-2xs backdrop-blur">
                  {/* Language Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Languages className="size-3.5" /> Study Language:
                    </span>
                    <div className="flex items-center rounded-xl border border-border bg-background p-0.5">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          disabled={isTranslatingSummary}
                          onClick={() => handleSummaryLanguageChange(lang.code)}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                            summaryLanguage === lang.code
                              ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                              : "text-muted-foreground hover:text-foreground disabled:opacity-50"
                          )}
                        >
                          {lang.nativeName}
                        </button>
                      ))}
                    </div>
                    {isTranslatingSummary && (
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Expand / Collapse All */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAllSections(true)}
                      className="h-8 rounded-lg text-[11px] px-2.5"
                    >
                      <Maximize2 className="size-3 mr-1" /> Expand All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAllSections(false)}
                      className="h-8 rounded-lg text-[11px] px-2.5"
                    >
                      <Minimize2 className="size-3 mr-1" /> Collapse All
                    </Button>

                    {/* Listen to Full Summary Controls */}
                    <div className="flex items-center gap-1.5">
                      {!isSummarySpeaking ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleStartSummarySpeech}
                          className="h-8 rounded-xl text-xs gap-1.5 font-semibold transition-all hover:border-primary hover:text-primary"
                        >
                          <Play className="size-3.5 fill-current text-primary" />
                          <span>Listen to Summary</span>
                        </Button>
                      ) : isSummaryPaused ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResumeSummarySpeech}
                            className="h-8 rounded-xl text-xs gap-1.5 font-semibold text-primary border-primary bg-primary/10"
                          >
                            <Play className="size-3.5 fill-current" />
                            <span>Resume</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={stopAllAudio}
                            className="h-8 rounded-xl text-xs gap-1.5 font-semibold text-destructive hover:bg-destructive/10"
                          >
                            <VolumeX className="size-3.5" />
                            <span>Stop</span>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePauseSummarySpeech}
                            className="h-8 rounded-xl text-xs gap-1.5 font-semibold border-primary bg-primary/10 text-primary animate-pulse"
                          >
                            <Pause className="size-3.5 fill-current" />
                            <span>Pause</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={stopAllAudio}
                            className="h-8 rounded-xl text-xs gap-1.5 font-semibold text-destructive hover:bg-destructive/10"
                          >
                            <VolumeX className="size-3.5" />
                            <span>Stop</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* TTS Progress indicator */}
                {isSummarySpeaking && summarySpeechProgress && (
                  <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-2 text-xs text-primary font-medium animate-in fade-in">
                    <span className="flex items-center gap-2">
                      <Volume1 className="size-4 animate-bounce" /> {isSummaryPaused ? "Audio Paused:" : "Disha is reading:"} {summarySpeechProgress}
                    </span>
                    <button
                      onClick={stopAllAudio}
                      className="underline text-[11px] font-bold cursor-pointer hover:text-destructive"
                    >
                      Stop
                    </button>
                  </div>
                )}

                {/* Translation Loading State */}
                {isTranslatingSummary ? (
                  <div className="rounded-3xl border border-primary/30 bg-primary/5 p-12 text-center space-y-4 animate-in fade-in duration-300">
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Loader2 className="size-7 animate-spin" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-display text-lg font-bold text-foreground">
                        {SECTION_HEADERS[summaryLanguage].translatingTitle}
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
                        {SECTION_HEADERS[summaryLanguage].translatingDesc}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 1. DOCUMENT OVERVIEW */}
                    <div className="rounded-3xl border border-primary/20 bg-card p-6 md:p-8 space-y-4 shadow-xs">
                      <div
                        onClick={() => toggleSection("overview")}
                        className="flex items-center justify-between cursor-pointer border-b border-border pb-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <BookOpen className="size-5 text-primary" />
                          <h3 className="font-display text-lg font-bold text-foreground">
                            {SECTION_HEADERS[summaryLanguage].overview}
                          </h3>
                        </div>
                        {expandedSections.overview ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                      </div>

                      {expandedSections.overview && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="text-sm md:text-base text-foreground/90 leading-relaxed whitespace-pre-line">
                            {overviewData?.highLevelSummary || (summaryLanguage === "en" ? selectedDoc.summary : "")}
                          </div>

                          {overviewData?.coreThemes && overviewData.coreThemes.length > 0 && (
                            <div className="pt-2">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                {SECTION_HEADERS[summaryLanguage].coreThemes}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {overviewData.coreThemes.map((theme, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary"
                                  >
                                    {theme}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 2. KEY CONCEPTS */}
                    {((activeStructuredSummary?.keyConcepts && activeStructuredSummary.keyConcepts.length > 0) || (summaryLanguage === "en" && selectedDoc.keyConcepts && selectedDoc.keyConcepts.length > 0)) && (
                      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4 shadow-xs">
                        <div
                          onClick={() => toggleSection("concepts")}
                          className="flex items-center justify-between cursor-pointer border-b border-border pb-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <Lightbulb className="size-5 text-amber-500" />
                            <h3 className="font-display text-lg font-bold text-foreground">
                              {SECTION_HEADERS[summaryLanguage].concepts}
                            </h3>
                          </div>
                          {expandedSections.concepts ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                        </div>

                        {expandedSections.concepts && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                            {(activeStructuredSummary?.keyConcepts || (summaryLanguage === "en" ? selectedDoc.keyConcepts : []) || []).map((concept, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl border border-border/80 bg-background/80 p-4 space-y-2 shadow-2xs hover:border-primary/40 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-sm text-foreground">{concept.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    {concept.pageNumber && (
                                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                                        Page {concept.pageNumber}
                                      </span>
                                    )}
                                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
                                      {concept.tag || "Concept"}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-foreground/80 leading-relaxed">
                                  {concept.definition}
                                </p>
                                {concept.importance && (
                                  <p className="text-[11px] text-muted-foreground italic border-t border-border/50 pt-1.5">
                                    💡 {SECTION_HEADERS[summaryLanguage].whyItMatters} {concept.importance}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. CHAPTER-WISE DETAILED BREAKDOWN */}
                    {((activeStructuredSummary?.chapterSummaries && activeStructuredSummary.chapterSummaries.length > 0) || (summaryLanguage === "en" && selectedDoc.chapters && selectedDoc.chapters.length > 0)) && (
                      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4 shadow-xs">
                        <div
                          onClick={() => toggleSection("chapters")}
                          className="flex items-center justify-between cursor-pointer border-b border-border pb-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <Layers className="size-5 text-indigo-500" />
                            <h3 className="font-display text-lg font-bold text-foreground">
                              {SECTION_HEADERS[summaryLanguage].chapters}
                            </h3>
                          </div>
                          {expandedSections.chapters ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                        </div>

                        {expandedSections.chapters && (
                          <div className="space-y-4 animate-in fade-in duration-200">
                            {(activeStructuredSummary?.chapterSummaries || (summaryLanguage === "en" ? selectedDoc.chapters : []) || []).map((chap, idx) => {
                              const chapId = chap.id || `chap-${idx}`;
                              const isExpanded = expandedChapters[chapId] !== false;

                              return (
                                <div
                                  key={chapId}
                                  className="rounded-2xl border border-border/90 bg-background/70 p-5 space-y-3 transition-all"
                                >
                                  <div
                                    onClick={() => toggleChapter(chapId)}
                                    className="flex flex-wrap items-center justify-between gap-2 cursor-pointer pb-2 border-b border-border/60"
                                  >
                                    <div>
                                      <span className="text-[11px] font-mono font-bold text-primary">
                                        Section {idx + 1} {chap.pageStart ? `· Pages ${chap.pageStart} – ${chap.pageEnd}` : ""}
                                      </span>
                                      <h4 className="font-display text-base font-bold text-foreground">
                                        {chap.title}
                                      </h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveTab("chat");
                                          handleSendMessage(`Explain ${chap.title} in detail and give me the core points.`);
                                        }}
                                        className="rounded-xl text-[11px] h-7 gap-1"
                                      >
                                        <Sparkles className="size-3 text-primary" /> Ask Disha
                                      </Button>
                                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="space-y-3 pt-1 text-xs leading-relaxed text-foreground/90">
                                      <p className="whitespace-pre-line">{chap.summary}</p>

                                      {chap.keyPoints?.length > 0 && (
                                        <div className="space-y-1.5 bg-muted/40 p-3 rounded-xl">
                                          <p className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                                            {SECTION_HEADERS[summaryLanguage].corePoints}
                                          </p>
                                          <ul className="space-y-1 pl-4 list-disc text-foreground/85">
                                            {chap.keyPoints.map((pt, pIdx) => (
                                              <li key={pIdx}>{pt}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {chap.suggestedQuestions?.length > 0 && (
                                        <div className="space-y-1.5 pt-1">
                                          <p className="font-semibold text-muted-foreground text-[11px]">
                                            {SECTION_HEADERS[summaryLanguage].suggestedQuestions}
                                          </p>
                                          <div className="flex flex-wrap gap-1.5">
                                            {chap.suggestedQuestions.map((q, qIdx) => (
                                              <button
                                                key={qIdx}
                                                onClick={() => {
                                                  setActiveTab("chat");
                                                  handleSendMessage(q);
                                                }}
                                                className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] text-foreground/80 hover:border-primary hover:text-primary transition-all text-left"
                                              >
                                                {q}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4. IMPORTANT DEFINITIONS GLOSSARY */}
                    {(activeStructuredSummary?.importantDefinitions?.length || 0) > 0 && (
                      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4 shadow-xs">
                        <div
                          onClick={() => toggleSection("definitions")}
                          className="flex items-center justify-between cursor-pointer border-b border-border pb-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <BookMarked className="size-5 text-emerald-500" />
                            <h3 className="font-display text-lg font-bold text-foreground">
                              {SECTION_HEADERS[summaryLanguage].definitions}
                            </h3>
                          </div>
                          {expandedSections.definitions ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                        </div>

                        {expandedSections.definitions && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 animate-in fade-in duration-200">
                            {activeStructuredSummary?.importantDefinitions.map((def, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl border border-border/80 bg-background/80 p-4 space-y-1.5 shadow-2xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-sm text-foreground">{def.term}</span>
                                  {def.pageNumber && (
                                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                                      Page {def.pageNumber}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-foreground/85 leading-relaxed">
                                  {def.definition}
                                </p>
                                {def.context && (
                                  <p className="text-[11px] text-muted-foreground italic">
                                    {SECTION_HEADERS[summaryLanguage].context} {def.context}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 5. CORE PRINCIPLES & LAWS */}
                    {(activeStructuredSummary?.corePrinciples?.length || 0) > 0 && (
                      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4 shadow-xs">
                        <div
                          onClick={() => toggleSection("principles")}
                          className="flex items-center justify-between cursor-pointer border-b border-border pb-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <Scale className="size-5 text-blue-500" />
                            <h3 className="font-display text-lg font-bold text-foreground">
                              {SECTION_HEADERS[summaryLanguage].principles}
                            </h3>
                          </div>
                          {expandedSections.principles ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                        </div>

                        {expandedSections.principles && (
                          <div className="space-y-3 animate-in fade-in duration-200">
                            {activeStructuredSummary?.corePrinciples.map((principle, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-display text-sm font-bold text-foreground">
                                    {principle.title}
                                  </h4>
                                  {principle.pageNumber && (
                                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                                      Page {principle.pageNumber}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-foreground/95 bg-card/80 p-3 rounded-xl border border-border">
                                  "{principle.statement}"
                                </p>
                                <p className="text-xs text-muted-foreground leading-relaxed pl-1">
                                  💡 {principle.explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 6. FORMULAS & EQUATIONS (Only when present in PDF!) */}
                    {activeStructuredSummary?.formulasAndEquations && activeStructuredSummary.formulasAndEquations.length > 0 && (
                      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4 shadow-xs">
                        <div
                          onClick={() => toggleSection("formulas")}
                          className="flex items-center justify-between cursor-pointer border-b border-border pb-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <Binary className="size-5 text-purple-500" />
                            <h3 className="font-display text-lg font-bold text-foreground">
                              {SECTION_HEADERS[summaryLanguage].formulas}
                            </h3>
                          </div>
                          {expandedSections.formulas ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                        </div>

                        {expandedSections.formulas && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                            {activeStructuredSummary.formulasAndEquations.map((formula, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-3"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-display text-sm font-bold text-foreground">
                                    {formula.name}
                                  </h4>
                                  {formula.pageNumber && (
                                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                                      Page {formula.pageNumber}
                                    </span>
                                  )}
                                </div>

                                <div className="rounded-xl bg-card border border-purple-500/20 p-3 text-center font-mono text-sm font-bold text-purple-600 dark:text-purple-300">
                                  {formula.formula}
                                </div>

                                {formula.variables?.length > 0 && (
                                  <div className="space-y-1 text-xs">
                                    <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                                      {SECTION_HEADERS[summaryLanguage].variables}
                                    </span>
                                    <div className="grid grid-cols-2 gap-1 text-[11px] text-foreground/80">
                                      {formula.variables.map((v, vIdx) => (
                                        <div key={vIdx} className="bg-background/60 p-1.5 rounded">
                                          <span className="font-mono font-bold text-primary">{v.symbol}</span>: {v.meaning} {v.unit ? `(${v.unit})` : ""}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {formula.usage && (
                                  <p className="text-[11px] text-muted-foreground">
                                    📌 {SECTION_HEADERS[summaryLanguage].application} {formula.usage}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 7. STEP-BY-STEP PROCESSES & MECHANISMS */}
                    {activeStructuredSummary?.processesAndSteps && activeStructuredSummary.processesAndSteps.length > 0 && (
                      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4 shadow-xs">
                        <div
                          onClick={() => toggleSection("processes")}
                          className="flex items-center justify-between cursor-pointer border-b border-border pb-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <ListOrdered className="size-5 text-teal-500" />
                            <h3 className="font-display text-lg font-bold text-foreground">
                              {SECTION_HEADERS[summaryLanguage].processes}
                            </h3>
                          </div>
                          {expandedSections.processes ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                        </div>

                        {expandedSections.processes && (
                          <div className="space-y-4 animate-in fade-in duration-200">
                            {activeStructuredSummary.processesAndSteps.map((proc, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl border border-border/80 bg-background/80 p-5 space-y-3 shadow-2xs"
                              >
                                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                                  <div>
                                    <h4 className="font-display text-sm font-bold text-foreground">{proc.processName}</h4>
                                    <p className="text-xs text-muted-foreground">{proc.objective}</p>
                                  </div>
                                  {proc.pageNumber && (
                                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                                      Page {proc.pageNumber}
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-2.5 pt-1">
                                  {proc.steps.map((step, sIdx) => (
                                    <div key={sIdx} className="flex items-start gap-3 text-xs">
                                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                                        {step.stepNumber || sIdx + 1}
                                      </span>
                                      <div className="space-y-0.5">
                                        <p className="font-semibold text-foreground">{step.action}</p>
                                        <p className="text-muted-foreground leading-relaxed">{step.details}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 8. EXAMPLES & CASE STUDIES */}
                    {activeStructuredSummary?.examplesAndApplications && activeStructuredSummary.examplesAndApplications.length > 0 && (
                      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4 shadow-xs">
                        <div
                          onClick={() => toggleSection("examples")}
                          className="flex items-center justify-between cursor-pointer border-b border-border pb-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <FlaskConical className="size-5 text-cyan-500" />
                            <h3 className="font-display text-lg font-bold text-foreground">
                              {SECTION_HEADERS[summaryLanguage].examples}
                            </h3>
                          </div>
                          {expandedSections.examples ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                        </div>

                        {expandedSections.examples && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                            {activeStructuredSummary.examplesAndApplications.map((ex, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-display text-sm font-bold text-foreground">{ex.title}</h4>
                                  <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase">
                                    {ex.concept}
                                  </span>
                                </div>
                                <p className="text-xs text-foreground/90 bg-card/80 p-3 rounded-xl border border-border">
                                  📌 {SECTION_HEADERS[summaryLanguage].scenario} {ex.problemOrScenario}
                                </p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  💡 {SECTION_HEADERS[summaryLanguage].explanation} {ex.solutionOrExplanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 9. IMPORTANT FACTS & NUMERICAL DATA */}
                    {activeStructuredSummary?.importantFacts && activeStructuredSummary.importantFacts.length > 0 && (
                      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4 shadow-xs">
                        <div
                          onClick={() => toggleSection("facts")}
                          className="flex items-center justify-between cursor-pointer border-b border-border pb-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <CheckSquare className="size-5 text-rose-500" />
                            <h3 className="font-display text-lg font-bold text-foreground">
                              {SECTION_HEADERS[summaryLanguage].facts}
                            </h3>
                          </div>
                          {expandedSections.facts ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                        </div>

                        {expandedSections.facts && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-200">
                            {activeStructuredSummary.importantFacts.map((fact, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl border border-border/80 bg-background/80 p-3.5 space-y-1 text-xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-semibold text-foreground">• {fact.fact}</p>
                                  {fact.pageNumber && (
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground shrink-0">
                                      Page {fact.pageNumber}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground pl-3">{fact.significance}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 10. QUICK REVISION & EXAM FOCUS */}
                    {activeStructuredSummary?.quickRevision && (
                      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-background p-6 md:p-8 space-y-5 shadow-xs">
                        <div
                          onClick={() => toggleSection("revision")}
                          className="flex items-center justify-between cursor-pointer border-b border-border pb-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <Award className="size-5 text-amber-500" />
                            <h3 className="font-display text-lg font-bold text-foreground">
                              {SECTION_HEADERS[summaryLanguage].revision}
                            </h3>
                          </div>
                          {expandedSections.revision ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                        </div>

                        {expandedSections.revision && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-200 text-xs">
                            {/* Remember Points */}
                            <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-2xs">
                              <p className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
                                <Bookmark className="size-4 text-primary" /> {SECTION_HEADERS[summaryLanguage].rememberAnchors}
                              </p>
                              <ul className="space-y-2 pl-4 list-disc text-foreground/85 leading-relaxed">
                                {activeStructuredSummary.quickRevision.rememberPoints.map((pt, idx) => (
                                  <li key={idx}>{pt}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Exam Focus Points */}
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
                              <p className="font-display text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <Sparkles className="size-4" /> {SECTION_HEADERS[summaryLanguage].examFocus}
                              </p>
                              <ul className="space-y-2 pl-4 list-disc text-foreground/85 leading-relaxed">
                                {activeStructuredSummary.quickRevision.examFocusPoints.map((pt, idx) => (
                                  <li key={idx}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB 2: SECTIONS SUMMARY */}
            {activeTab === "chapters" && (
              <div className="space-y-4">
                {(activeStructuredSummary?.chapterSummaries || selectedDoc.chapters || []).length === 0 ? (
                  <div className="rounded-3xl border border-border bg-card p-8 text-center space-y-2">
                    <Layers className="size-8 text-muted-foreground/50 mx-auto" />
                    <p className="font-semibold text-foreground">No specific chapter subdivisions detected.</p>
                    <p className="text-xs text-muted-foreground">
                      The document is indexed as a unified learning guide. Use "Deep Study Guide" or "Ask Disha".
                    </p>
                  </div>
                ) : (
                  (activeStructuredSummary?.chapterSummaries || selectedDoc.chapters || []).map((chap, idx) => (
                    <div
                      key={chap.id || idx}
                      className="rounded-3xl border border-border bg-card p-6 md:p-7 space-y-4 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                        <div>
                          <span className="text-[11px] font-mono font-bold text-primary">
                            Pages {chap.pageStart} – {chap.pageEnd}
                          </span>
                          <h3 className="font-display text-base md:text-lg font-bold text-foreground">
                            {chap.title}
                          </h3>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveTab("chat");
                            handleSendMessage(`Explain ${chap.title} and give me the core points.`);
                          }}
                          className="rounded-xl text-xs gap-1.5"
                        >
                          <Sparkles className="size-3.5 text-primary" /> Ask About This
                        </Button>
                      </div>

                      <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">{chap.summary}</p>

                      {/* Key points */}
                      {chap.keyPoints?.length > 0 && (
                        <div className="space-y-1.5 bg-muted/40 p-4 rounded-2xl">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Core Takeaways:
                          </p>
                          <ul className="space-y-1 text-xs text-foreground/85 pl-4 list-disc">
                            {chap.keyPoints.map((pt, pIdx) => (
                              <li key={pIdx}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Suggested questions */}
                      {chap.suggestedQuestions?.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/60">
                          <p className="text-xs font-semibold text-muted-foreground">
                            Suggested Study Questions:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {chap.suggestedQuestions.map((q, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => {
                                  setActiveTab("chat");
                                  handleSendMessage(q);
                                }}
                                className="rounded-xl border border-border/80 bg-background/80 px-3 py-1.5 text-xs text-foreground/80 hover:border-primary hover:text-primary transition-all text-left shadow-2xs"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: ASK DISHA (GROUNDED RAG TUTOR) */}
            {activeTab === "chat" && (
              <div className="flex flex-col h-[640px] rounded-3xl border border-border bg-card overflow-hidden shadow-xs">
                {/* Chat Header with Language Selector */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
                      <Compass className="size-4" />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold text-foreground">Ask Disha</h4>
                      <p className="text-[10px] text-muted-foreground truncate max-w-xs">
                        Grounded in "{selectedDoc.title}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Multilingual Selector */}
                    <div className="flex items-center rounded-xl border border-border bg-background p-0.5">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setChatLanguage(lang.code);
                            toast.info(`Switched tutor language to ${lang.name}`);
                          }}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                            chatLanguage === lang.code
                              ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {lang.nativeName}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-md mx-auto my-auto">
                      <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <Sparkles className="size-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display text-base font-bold text-foreground">
                          What would you like to learn from this document?
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Ask any question, request explanations in Telugu or Hindi, or ask for examples.
                        </p>
                      </div>

                      {/* Quick Prompt Chips */}
                      <div className="flex flex-wrap justify-center gap-2 pt-2">
                        {[
                          "What is the main idea of this document?",
                          "Explain Chapter 1 simply with an example",
                          "Telugu lo simple ga cheppu",
                          "Hindi mein important points batao",
                          "Give me 5 exam questions from this PDF"
                        ].map((prompt, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => handleSendMessage(prompt)}
                            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground/80 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-left shadow-2xs"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={msg.id || idx}
                        className={cn(
                          "flex gap-3 max-w-3xl",
                          msg.role === "user" ? "ml-auto justify-end" : "mr-auto justify-start"
                        )}
                      >
                        {msg.role === "assistant" && (
                          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary mt-1 border border-primary/20">
                            <Bot className="size-4" />
                          </div>
                        )}

                        <div className="space-y-2 max-w-2xl">
                          <div
                            className={cn(
                              "rounded-2xl p-4 text-sm leading-relaxed",
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-xs font-medium"
                                : "bg-card border border-border/80 text-foreground rounded-tl-xs shadow-2xs"
                            )}
                          >
                            <p className="whitespace-pre-line">{msg.content}</p>

                            {/* Source Citations Badges */}
                            {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                  Grounding Sources:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {msg.sources.map((src, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary"
                                      title={src.snippet}
                                    >
                                      <Bookmark className="size-3" />
                                      <span>Page {src.pageNumber}</span>
                                      {src.chapterTitle && (
                                        <span className="text-muted-foreground">· {src.chapterTitle}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Message Actions */}
                          {msg.role === "assistant" && (
                            <div className="flex items-center gap-2 pl-1">
                              <button
                                onClick={() => handleToggleMessageAudio(msg.id, msg.content, msg.language)}
                                className={cn(
                                  "inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors px-2 py-0.5 rounded",
                                  playingMessageId === msg.id && "text-primary font-bold animate-pulse"
                                )}
                              >
                                {playingMessageId === msg.id ? (
                                  <>
                                    <VolumeX className="size-3.5" /> Stop
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="size-3.5" /> Listen
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => copyToClipboard(msg.id, msg.content)}
                                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check className="size-3.5 text-success" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="size-3.5" /> Copy
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {msg.role === "user" && (
                          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background mt-1 text-xs font-bold">
                            {user?.name ? user.name[0].toUpperCase() : "U"}
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {isChatLoading && (
                    <div className="flex gap-3 max-w-2xl mr-auto items-center text-muted-foreground text-xs p-2">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      <span>Disha is searching "{selectedDoc.title}"...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-3.5 md:p-4 border-t border-border bg-background">
                  <div className="relative flex items-center gap-2 rounded-2xl border border-border bg-card p-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-2xs">
                    <textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={`Ask anything about ${selectedDoc.title}...`}
                      rows={1}
                      className="flex-1 resize-none bg-transparent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none max-h-28"
                    />

                    {/* Microphone / Voice Input */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={cn(
                        "grid size-9 place-items-center rounded-xl transition-all cursor-pointer",
                        isListening
                          ? "bg-destructive text-destructive-foreground animate-pulse shadow-md"
                          : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      )}
                      title={isListening ? "Listening... Click to stop" : "Speak your question"}
                    >
                      {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                    </button>

                    {/* Send Button */}
                    <Button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim() || isChatLoading}
                      className="rounded-xl size-9 p-0"
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PRACTICE QUIZ */}
            {activeTab === "quiz" && (
              <div className="space-y-6">
                {!activeQuiz ? (
                  <div className="rounded-3xl border border-border bg-card p-8 md:p-12 text-center space-y-4 max-w-xl mx-auto shadow-xs">
                    <div className="grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-500 mx-auto">
                      <Award className="size-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-display text-xl font-bold text-foreground">
                        Document Practice Quiz
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Generate 5 multiple choice questions derived directly from "{selectedDoc.title}" to test your conceptual grasp.
                      </p>
                    </div>

                    <Button
                      onClick={handleGenerateQuiz}
                      disabled={isGeneratingQuiz}
                      className="rounded-xl px-6 font-semibold"
                    >
                      {isGeneratingQuiz ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" /> Generating Quiz...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 size-4" /> Generate Practice Quiz
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-5">
                      <div>
                        <h3 className="font-display text-base font-bold text-foreground">
                          {activeQuiz.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Answer the questions based on your uploaded study material.
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateQuiz}
                        disabled={isGeneratingQuiz}
                        className="rounded-xl text-xs"
                      >
                        <RotateCcw className="mr-1.5 size-3.5" /> Re-generate
                      </Button>
                    </div>

                    {/* Quiz Questions List */}
                    <div className="space-y-6">
                      {activeQuiz.questions.map((q, qIdx) => {
                        const selected = selectedAnswers[qIdx];
                        const isAnswered = selected !== undefined;
                        const isCorrect = isAnswered && selected === q.correctOption;

                        return (
                          <div
                            key={q.id || qIdx}
                            className={cn(
                              "rounded-3xl border p-5 md:p-6 space-y-4 transition-all",
                              quizSubmitted
                                ? isCorrect
                                  ? "border-success/40 bg-success/5"
                                  : "border-destructive/40 bg-destructive/5"
                                : "border-border bg-card"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-bold text-sm text-foreground">
                                Q{qIdx + 1}. {q.questionText}
                              </span>
                              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground shrink-0">
                                Page {q.pageNumber}
                              </span>
                            </div>

                            {/* Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {q.options.map((opt, optIdx) => {
                                const isThisSelected = selected === optIdx;
                                const isThisCorrect = q.correctOption === optIdx;

                                return (
                                  <button
                                    key={optIdx}
                                    disabled={quizSubmitted}
                                    onClick={() => handleSelectQuizAnswer(qIdx, optIdx)}
                                    className={cn(
                                      "flex items-center gap-3 rounded-2xl border p-3 text-xs text-left transition-all",
                                      !quizSubmitted && isThisSelected
                                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                                        : !quizSubmitted
                                        ? "border-border bg-background hover:border-primary/40 hover:bg-card"
                                        : isThisCorrect
                                        ? "border-success bg-success/15 text-success font-bold"
                                        : isThisSelected
                                        ? "border-destructive bg-destructive/15 text-destructive line-through"
                                        : "border-border bg-background/50 text-muted-foreground opacity-60"
                                    )}
                                  >
                                    <span className="grid size-5 shrink-0 place-items-center rounded-full border border-current text-[10px] font-mono font-bold">
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Explanation (revealed after submission) */}
                            {quizSubmitted && (
                              <div className="rounded-2xl border border-border bg-card p-3.5 text-xs space-y-1">
                                <p className="font-bold text-foreground">
                                  {isCorrect ? "✓ Correct!" : `✗ Incorrect (Correct: ${String.fromCharCode(65 + q.correctOption)})`}
                                </p>
                                <p className="text-muted-foreground leading-relaxed">
                                  {q.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Submit Bar */}
                    <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-5">
                      {quizSubmitted ? (
                        <div className="flex items-center gap-3">
                          <span className="font-display text-lg font-extrabold text-foreground">
                            Score: {calculateQuizScore()} / {activeQuiz.questions.length}
                          </span>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                            {Math.round((calculateQuizScore() / activeQuiz.questions.length) * 100)}% Mastery
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {Object.keys(selectedAnswers).length} of {activeQuiz.questions.length} answered
                        </span>
                      )}

                      {!quizSubmitted ? (
                        <Button
                          onClick={() => setQuizSubmitted(true)}
                          disabled={Object.keys(selectedAnswers).length === 0}
                          className="rounded-xl px-6 font-semibold"
                        >
                          Submit Answers
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedAnswers({});
                            setQuizSubmitted(false);
                          }}
                          className="rounded-xl px-4 text-xs"
                        >
                          Retry Quiz
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
