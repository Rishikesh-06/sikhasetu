import React, { useState, useEffect, useRef } from "react";
import { AppShell } from "./app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { aiTutorApi, type AITutorMessage, type AITutorConversation } from "@/services/api/ai-tutor-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Send,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  PlusCircle,
  Globe,
  Loader2,
  Bot,
  User,
  BookOpen,
  Atom,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  AlertCircle
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

const SUGGESTED_PROMPTS = [
  {
    icon: BookOpen,
    category: "Mathematics",
    title: "Explain fractions simply",
    prompt: "Can you explain fractions simply with real-life examples like sharing a pizza?"
  },
  {
    icon: Atom,
    category: "Science",
    title: "Help me understand photosynthesis",
    prompt: "Help me understand photosynthesis step-by-step in easy words."
  },
  {
    icon: Lightbulb,
    category: "English",
    title: "What is a metaphor?",
    prompt: "What is a metaphor? Explain with 3 easy school examples."
  },
  {
    icon: HelpCircle,
    category: "Algebra",
    title: "Solve this algebra problem",
    prompt: "If 3x + 5 = 20, how do I solve for x step by step?"
  }
];

export function StudentAITutor() {
  const { user } = useAuth();
  const [language, setLanguage] = useState<"en" | "hi" | "te">(() => {
    try {
      const saved = localStorage.getItem("siksha_ai_tutor_lang");
      return (saved as any) || "en";
    } catch {
      return "en";
    }
  });

  const [conversations, setConversations] = useState<AITutorConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AITutorMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Load conversation list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // 2. Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // 3. Persist selected language
  const handleLanguageChange = (newLang: "en" | "hi" | "te") => {
    setLanguage(newLang);
    try {
      localStorage.setItem("siksha_ai_tutor_lang", newLang);
    } catch {}
    toast.success(`AI Tutor language set to ${LANGUAGES.find(l => l.code === newLang)?.name}`);
  };

  const loadConversations = async () => {
    try {
      const res = await aiTutorApi.getConversations();
      setConversations(res.conversations || []);
    } catch (err) {
      console.warn("[AI Tutor] Could not load past conversations:", err);
    }
  };

  const startNewChat = () => {
    stopSpeech();
    setActiveConversationId(null);
    setMessages([]);
    setInputMessage("");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSelectConversation = async (convId: string) => {
    stopSpeech();
    try {
      const res = await aiTutorApi.getConversation(convId);
      setActiveConversationId(convId);
      setMessages(res.messages || []);
      if (res.conversation?.language && ["en", "hi", "te"].includes(res.conversation.language)) {
        setLanguage(res.conversation.language as any);
      }
    } catch (err: any) {
      toast.error("Failed loading conversation");
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isLoading) return;

    setInputMessage("");
    stopSpeech();

    // Optimistically append user message
    const tempUserMsg: AITutorMessage = {
      id: `temp-u-${Date.now()}`,
      role: "user",
      content: textToSend,
      language,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await aiTutorApi.sendMessage({
        message: textToSend,
        language,
        conversationId: activeConversationId || undefined
      });

      if (res.conversationId && res.conversationId !== activeConversationId) {
        setActiveConversationId(res.conversationId);
        loadConversations();
      }

      const aiMsg: AITutorMessage = {
        id: res.messageId || `msg-a-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        language: res.language || language,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("[AI Tutor Send Error]", err);
      toast.error(err.message || "I'm having trouble connecting right now. Please try again.");
      
      const errorMsg: AITutorMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "I'm having trouble connecting right now. Please check your internet connection or try asking again in a moment.",
        language,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Text-To-Speech Synthesis Handler
  const handleToggleSpeech = async (messageId: string, text: string, msgLang: string) => {
    if (playingMessageId === messageId) {
      stopSpeech();
      return;
    }

    stopSpeech();
    setTtsLoadingId(messageId);

    try {
      // Call backend TTS endpoint to record/fetch speech token
      await aiTutorApi.getTtsAudio({
        text,
        language: msgLang || language,
        messageId
      });

      // Use Web Speech API for zero-latency, high quality audio in English, Hindi, or Telugu
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();

        const cleanText = text
          .replace(/[*_#`~[\]()]/g, " ")
          .replace(/\n+/g, ". ")
          .slice(0, 800);

        const utterance = new SpeechSynthesisUtterance(cleanText);
        const langConfig = LANGUAGES.find(l => l.code === (msgLang || language)) || LANGUAGES[0];
        utterance.lang = langConfig.speechCode;
        utterance.rate = 0.95; // Clear pace for students

        // Attempt to select optimal natural voice if installed
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith(langConfig.code));
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
          setTtsLoadingId(null);
          setPlayingMessageId(messageId);
        };

        utterance.onend = () => {
          setPlayingMessageId(null);
        };

        utterance.onerror = () => {
          setPlayingMessageId(null);
          setTtsLoadingId(null);
        };

        window.speechSynthesis.speak(utterance);
      } else {
        toast.info("Audio playback is not supported on this browser.");
        setTtsLoadingId(null);
      }
    } catch (err) {
      console.warn("[TTS Error]", err);
      setTtsLoadingId(null);
      setPlayingMessageId(null);
      toast.error("Could not play speech audio.");
    }
  };

  const stopSpeech = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingMessageId(null);
    setTtsLoadingId(null);
  };

  // Formatter for AI message markdown
  const renderFormattedContent = (content: string) => {
    const paragraphs = content.split("\n\n");

    return paragraphs.map((para, pIdx) => {
      const trimmed = para.trim();
      if (!trimmed) return null;

      // Header lines (### or ##)
      if (trimmed.startsWith("### ")) {
        return (
          <h4 key={pIdx} className="font-display text-base font-bold text-foreground mt-3 mb-1">
            {trimmed.replace("### ", "")}
          </h4>
        );
      }
      if (trimmed.startsWith("## ")) {
        return (
          <h3 key={pIdx} className="font-display text-lg font-bold text-foreground mt-4 mb-1.5 border-b border-border/50 pb-1">
            {trimmed.replace("## ", "")}
          </h3>
        );
      }

      // Bullet points
      if (trimmed.includes("\n- ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed.split(/\n[-*]\s+/).filter(Boolean);
        return (
          <ul key={pIdx} className="space-y-1.5 my-2 pl-4 list-disc text-sm text-foreground/90">
            {items.map((item, iIdx) => (
              <li key={iIdx} className="leading-relaxed">
                {renderInlineStyles(item.replace(/^[-*]\s+/, ""))}
              </li>
            ))}
          </ul>
        );
      }

      // Numbered steps
      if (/^\d+\.\s+/.test(trimmed) || trimmed.includes("\n1. ")) {
        const items = trimmed.split(/\n\d+\.\s+/).filter(Boolean);
        return (
          <ol key={pIdx} className="space-y-1.5 my-2 pl-4 list-decimal text-sm text-foreground/90">
            {items.map((item, iIdx) => (
              <li key={iIdx} className="leading-relaxed">
                {renderInlineStyles(item.replace(/^\d+\.\s+/, ""))}
              </li>
            ))}
          </ol>
        );
      }

      return (
        <p key={pIdx} className="text-sm leading-relaxed text-foreground/90 my-1.5">
          {renderInlineStyles(trimmed)}
        </p>
      );
    });
  };

  // Inline bold and code formatter
  const renderInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={idx} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={idx} className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-primary font-semibold">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <AppShell
      role="student"
      title="AI Tutor"
      eyebrow="Your Personal Learning Companion"
      fullWidth
      contentClassName="p-2 sm:p-3 lg:p-4"
    >
      {/* Full-width / Full-height Workspace Container */}
      <div className="flex flex-col h-[calc(100dvh-7.5rem)] lg:h-[calc(100dvh-6.5rem)] w-full rounded-2xl border border-border bg-card shadow-panel overflow-hidden">
        
        {/* ========================================== */}
        {/* TOP BAR / CONTROLS                         */}
        {/* ========================================== */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center shadow-sm shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-foreground">SIKHASETU AI Tutor</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Class {user?.classLevel || 7} Calibrated
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Instant interactive help in Mathematics, Science, English, or Homework
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs shadow-xs">
              <Globe className="size-3.5 text-muted-foreground" />
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                title="Select preferred learning language"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-popover text-popover-foreground">
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* New Chat Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={startNewChat}
              className="gap-1.5 text-xs font-semibold shadow-xs"
            >
              <PlusCircle className="size-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
          </div>
        </div>

        {/* ========================================== */}
        {/* MESSAGE STREAM / CONVERSATION AREA        */}
        {/* ========================================== */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 space-y-6 bg-background/40">
          {messages.length === 0 ? (
            /* Empty / Welcome State */
            <div className="max-w-4xl mx-auto py-8 sm:py-14 text-center space-y-6 my-auto">
              <div className="size-16 rounded-2xl bg-gradient-to-tr from-primary/20 via-accent/30 to-primary/10 text-primary mx-auto grid place-items-center shadow-sm border border-primary/20">
                <Bot className="size-8 text-primary animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                  What would you like to learn today?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  I am calibrated for your <strong>Class {user?.classLevel || 7}</strong> syllabus. Ask me anything about Mathematics, Science, English, concepts, homework, or exam preparation!
                </p>
              </div>

              {/* Suggested Questions Grid (4-column on desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 text-left">
                {SUGGESTED_PROMPTS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.prompt)}
                      className="group flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 hover:shadow-md transition-all text-left shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Icon className="size-3.5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground leading-snug">
                        {item.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Active Message History */
            <div className="space-y-6 max-w-5xl xl:max-w-6xl mx-auto w-full">
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                const isPlaying = playingMessageId === msg.id;
                const isTtsLoading = ttsLoadingId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 sm:gap-4",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isUser && (
                      <div className="size-8 sm:size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0 shadow-sm mt-0.5">
                        <Sparkles className="size-4" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "rounded-2xl p-4 sm:p-5 shadow-sm transition-all",
                        isUser
                          ? "max-w-[85%] sm:max-w-[75%] bg-primary text-primary-foreground rounded-tr-sm"
                          : "max-w-[92%] sm:max-w-[85%] bg-card border border-border text-foreground rounded-tl-sm"
                      )}
                    >
                      {/* Message Content */}
                      {isUser ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                          {msg.content}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {renderFormattedContent(msg.content)}
                        </div>
                      )}

                      {/* AI Action Buttons: Listen & Copy */}
                      {!isUser && (
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                          {/* Listen Button */}
                          <button
                            onClick={() => handleToggleSpeech(msg.id, msg.content, msg.language)}
                            disabled={isTtsLoading}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium",
                              isPlaying
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                            title="Listen to explanation"
                          >
                            {isTtsLoading ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                <span>Loading audio...</span>
                              </>
                            ) : isPlaying ? (
                              <>
                                <VolumeX className="size-3.5" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="size-3.5" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>

                          {/* Copy Button */}
                          <button
                            onClick={() => handleCopyText(msg.id, msg.content)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all font-medium"
                            title="Copy to clipboard"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="size-3.5 text-success" />
                                <span className="text-success font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <span className="ml-auto text-[10px] text-muted-foreground/60 uppercase font-mono font-semibold">
                            {msg.language?.toUpperCase() || "EN"}
                          </span>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="size-8 sm:size-9 rounded-xl bg-muted text-muted-foreground grid place-items-center shrink-0 border border-border mt-0.5">
                        <User className="size-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing / Loading Indicator */}
              {isLoading && (
                <div className="flex gap-3 sm:gap-4 justify-start">
                  <div className="size-8 sm:size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0 shadow-sm mt-0.5">
                    <Sparkles className="size-4 animate-spin" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-border bg-card p-4 shadow-sm flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                      <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                      <span className="size-2 rounded-full bg-primary animate-bounce" />
                    </div>
                    <span className="font-medium ml-1">AI Tutor is crafting your explanation...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* INPUT BAR / DOCKED COMPOSER                */}
        {/* ========================================== */}
        <div className="p-3 sm:p-4 md:px-6 border-t border-border bg-card/95 backdrop-blur-md shrink-0">
          <div className="max-w-5xl xl:max-w-6xl mx-auto w-full">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2 sm:gap-3 rounded-xl border border-border bg-background p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all shadow-inner"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder={
                  language === "hi"
                    ? "अपना पढ़ाई से जुड़ा सवाल पूछें (Shift+Enter नई लाइन के लिए)..."
                    : language === "te"
                    ? "మీ అధ్యయన సందేహాన్ని అడగండి (Shift+Enter కొత్త లైన్ కోసం)..."
                    : "Ask your study question (Shift+Enter for new line)..."
                }
                className="flex-1 max-h-32 min-h-[38px] resize-none bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />

              <Button
                type="submit"
                size="sm"
                disabled={!inputMessage.trim() || isLoading}
                className="shrink-0 h-9 px-4 gap-1.5 rounded-lg shadow-sm font-semibold"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <span className="hidden sm:inline">Ask Tutor</span>
                    <Send className="size-3.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-muted-foreground">
              <span>
                💡 Calibrated for <strong>Class {user?.classLevel || 7}</strong> · English, Hindi & Telugu
              </span>
              <span className="hidden sm:inline">
                Press <strong>Enter ↵</strong> to send · <strong>Shift + Enter</strong> for newline
              </span>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
