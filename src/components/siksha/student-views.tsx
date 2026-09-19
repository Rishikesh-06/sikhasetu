import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  Lightbulb,
  LockKeyhole,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Volume2,
  AlertCircle,
  Trophy,
  Flame,
  Award,
  Zap,
  GraduationCap,
  Swords,
  Users,
  School as SchoolIcon,
  CheckCircle2,
  XCircle,
  UserPlus,
  ClipboardCheck,
  Target,
  AlertTriangle,
  Layers,
  RefreshCw,
  Star,
  X,
  Medal,
  HelpCircle,
  Footprints,
  Compass,
  Crown,
  BookOpenCheck,
  Rocket,
  Shield,
  ShieldCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppShell } from "./app-shell";
import { DemoNote, Insight, SectionHead, Stat } from "./page-elements";
import { MasteryBar, StatusBadge } from "./status";
import { LearningConstellation } from "./learning-constellation";
import { useAuth } from "@/context/auth-context";
import { studentApi } from "@/services/api/student-api";
import type {
  StudentProfileData,
  AssignedAssessment,
  PracticeItem,
  StudentProgressData,
  QuestionData,
  StudentClassroomInfo,
  DetailedSubjectProgress,
  CompetitionClassmate,
  CompetitionOverview,
  LearningPathData,
  LearningPathNode,
  PracticeQuestion,
  PracticeSessionData,
  PracticeSubmitResponse,
  QuizSessionData,
  QuizSubmitResponse,
  AchievementItem,
  AchievementsResponse
} from "@/data/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ==========================================
// 1. STUDENT HOME
// ==========================================
export function StudentHome() {
  const { user } = useAuth();
  const [classroom, setClassroom] = useState<StudentClassroomInfo | null>(null);
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [assessments, setAssessments] = useState<AssignedAssessment[]>([]);
  const [progress, setProgress] = useState<StudentProgressData | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPathData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [clsData, profData, asmtData, progData, lpData] = await Promise.all([
          studentApi.getClassroom().catch(() => null),
          studentApi.getProfile().catch(() => null),
          studentApi.getAssessments().catch(() => ({ assessments: [] })),
          studentApi.getProgress().catch(() => null),
          studentApi.getLearningPath().catch(() => null)
        ]);

        if (clsData) setClassroom(clsData);
        if (profData) setProfile(profData);
        if (asmtData) setAssessments(asmtData.assessments);
        if (progData) setProgress(progData);
        if (lpData) setLearningPath(lpData);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pendingAssessment = assessments.find((a) => a.status === "pending" || a.status === "in_progress");
  const streakDays = progress?.streak?.currentStreak || 8;

  return (
    <AppShell role="student" title={`Welcome back, ${user?.name?.split(" ")[0] || "Learner"}`}>
      <div className="space-y-8">
        {/* Top Prominent Streak & Class Info Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-card p-6 shadow-panel">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Flame className="size-4 fill-amber-500 text-amber-500 animate-pulse" />
                {streakDays}-Day Learning Streak
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <Zap className="size-3.5" /> {profile?.student.xp || 320} XP Earned
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              Class {classroom?.classLevel || user?.classLevel || 7}-{classroom?.section || "A"} · {classroom?.school || user?.school || "Delhi Public School, R.K. Puram"}
            </h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="size-3.5 text-primary" />
              <span>Assigned Teachers: </span>
              <strong className="text-foreground font-semibold">
                {classroom?.teachers && classroom.teachers.length > 0
                  ? classroom.teachers.map((t) => `${t.name} (${t.subject})`).join(", ")
                  : "Ms. Sunita Sharma (Mathematics)"}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm">
              <Link to="/student/diagnostic">
                <Swords className="mr-1.5 size-4 text-primary" /> Friendly Fire
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/student/practice">
                <Play className="mr-1.5 size-4" /> Daily Practice
              </Link>
            </Button>
          </div>
        </div>

        {/* Assigned Adaptive Assessment Banner */}
        {pendingAssessment ? (
          <section className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-card to-primary/5 p-6 shadow-panel md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                  <Sparkles className="size-3.5" /> Assigned by {pendingAssessment.teacherName || "Teacher"} · Adaptive
                </div>
                <h2 className="mt-3 font-display text-2xl font-bold md:text-3xl text-foreground">
                  {pendingAssessment.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Your teacher assigned this {pendingAssessment.subject} adaptive check. Questions will automatically match your learning pace and provide supportive explanations.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
                  <span>{pendingAssessment.questionCount} Questions</span>
                  <span>•</span>
                  <span>~10 Minutes</span>
                  <span>•</span>
                  <span className="text-primary font-bold">{pendingAssessment.purpose}</span>
                </div>
              </div>
              <Button asChild size="lg" className="shrink-0">
                <Link to="/student/practice/$practiceId" params={{ practiceId: pendingAssessment.assignmentId }}>
                  Start Assessment <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </section>
        ) : (
          <section className="grid gap-6 border-b border-border pb-8 lg:grid-cols-[1.3fr_.7fr]">
            <div className="flex flex-col justify-center rounded-2xl bg-primary p-7 text-primary-foreground md:p-10 shadow-panel">
              <p className="text-xs font-bold uppercase tracking-wider text-primary-foreground/75">Your Next Learning Step</p>
              <h2 className="mt-3 max-w-xl font-display text-2xl md:text-3xl font-bold leading-tight">
                Strengthen core concepts, one step at a time.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-primary-foreground/80">
                Selected from your recent learning evidence. This personalized practice starts with what you already understand.
              </p>
              <Button asChild variant="secondary" size="lg" className="mt-6 w-fit">
                <Link to="/student/practice">
                  Start 5-Minute Practice <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>

            <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-6 shadow-panel">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-amber-500" />
                <h3 className="font-display text-lg font-bold text-foreground">Active Quests</h3>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Complete your daily practice booster and one adaptive check to keep your streak burning hot!
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 border border-border">
                  <span className="font-medium text-foreground">Daily Practice</span>
                  <span className="text-xs font-bold text-amber-500">+25 XP</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 border border-border">
                  <span className="font-medium text-foreground">Adaptive Check</span>
                  <span className="text-xs font-bold text-primary">+40 XP</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Quick KPI Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total XP" value={`${learningPath?.student.xp || profile?.student.xp || 0} XP`} detail="Earned through practice & tests" tone="good" />
          <Stat label="Active Streak" value={`${streakDays} Days`} detail="Consistent daily learning" tone="good" />
          <Stat label="Classroom" value={`Class ${learningPath?.student.classLevel || classroom?.classLevel || user?.classLevel || 7}`} detail={learningPath?.student.school || classroom?.school || user?.school || "Delhi Public School"} />
          <Stat label="Assessments" value={String(assessments.length)} detail={`${assessments.filter((a) => a.status === "submitted").length} Completed`} />
        </div>

        {/* Learning Constellation Preview (Using Real Data) */}
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Visual Learning Path</p>
              <h3 className="font-display text-2xl font-bold text-foreground">Your Learning Constellation</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Class {learningPath?.student.classLevel || user?.classLevel || 7} milestone progression mapped from real evidence.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/student/profile">
                Explore Full Path <ChevronRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-background/50">
            <LearningConstellation
              nodes={learningPath?.nodes || []}
              isLoading={loading}
              emptyMessage={learningPath?.emptyStateMessage}
              compact={true}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

// ==========================================
// 2. STUDENT ADAPTIVE ASSESSMENTS (Teacher Assigned)
// ==========================================
export function StudentAdaptiveAssessments() {
  const [assessments, setAssessments] = useState<AssignedAssessment[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.getAssessments()
      .then((res) => setAssessments(res.assessments || []))
      .catch((err) => {
        console.warn("[Adaptive Assessments] Error loading:", err);
        setAssessments([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = assessments.filter((a) => {
    if (filter === "pending") return a.status === "pending" || a.status === "in_progress";
    if (filter === "completed") return a.status === "submitted";
    return true;
  });

  return (
    <AppShell role="student" title="Adaptive Assessments" eyebrow="Teacher Assigned">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Teacher Assigned Tests & Checks</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Every assessment automatically adapts questions to support your learning readiness.
            </p>
          </div>

          <div className="flex rounded-lg border border-border bg-muted/40 p-1 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={cn("px-3 py-1 rounded font-semibold transition-all cursor-pointer", filter === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              All ({assessments.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={cn("px-3 py-1 rounded font-semibold transition-all cursor-pointer", filter === "pending" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              Active ({assessments.filter((a) => a.status !== "submitted").length})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={cn("px-3 py-1 rounded font-semibold transition-all cursor-pointer", filter === "completed" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              Completed ({assessments.filter((a) => a.status === "submitted").length})
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card">
            <ClipboardCheck className="size-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-bold text-foreground">No assessments in this category</h3>
            <p className="text-xs text-muted-foreground mt-1">When your teacher assigns a test, it will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((a) => (
              <div key={a.assignmentId} className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-panel">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-primary/10">
                      {a.subject}
                    </span>
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                      a.status === "submitted" ? "bg-success/15 text-success" : "bg-accent text-primary"
                    )}>
                      {a.status === "submitted" ? "Completed" : a.status === "in_progress" ? "In Progress" : "New"}
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-foreground mt-2">{a.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Assigned by: <strong className="text-foreground">{a.teacherName || "Teacher"}</strong></p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {a.topics?.map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>

                  {a.result && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Your Score</p>
                        <p className="font-display text-lg font-bold text-foreground">{a.result.score} / {a.result.maxScore} ({a.result.percentage}%)</p>
                      </div>
                      <CheckCircle2 className="size-6 text-success" />
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-border">
                  {a.status === "submitted" ? (
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to="/student/practice/$practiceId" params={{ practiceId: a.assignmentId }}>
                        Review Questions & Explanations
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" className="w-full">
                      <Link to="/student/practice/$practiceId" params={{ practiceId: a.assignmentId }}>
                        Start Assessment ({a.questionCount} Qs) <ArrowRight className="ml-1.5 size-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ==========================================
// 3. STUDENT SUBJECT-WISE PROGRESS (Real Data + Drilldown Modal)
// ==========================================
export function StudentSubjectProgress() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<DetailedSubjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<DetailedSubjectProgress | null>(null);

  const loadProgress = () => {
    setLoading(true);
    studentApi.getSubjectWiseProgress()
      .then((res) => {
        setSubjects(res.subjects || []);
      })
      .catch((err) => {
        console.warn("[Subject Progress] Error loading:", err);
        setSubjects([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProgress();
  }, []);

  const hasEvidence = subjects.some((s) => s.progressScore > 0 || (s.strengthenedSkills && s.strengthenedSkills.length > 0));

  return (
    <AppShell role="student" title="Subject-wise Progress" eyebrow="Curriculum Mastery">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Curriculum Mastery & Skill Evidence</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Derived continuously from real diagnostic checks, practice sessions, and adaptive assessment attempts.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadProgress} disabled={loading}>
            <RefreshCw className={cn("mr-1.5 size-3.5", loading && "animate-spin")} /> Refresh Evidence
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs font-semibold text-muted-foreground">Loading verified subject progress...</p>
            </div>
          </div>
        ) : !hasEvidence ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
            <TrendingUp className="size-10 mx-auto text-muted-foreground" />
            <h3 className="font-bold text-foreground text-lg">Complete your diagnostic to begin building your subject profile.</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              SIKHASETU calculates real mastery percentages and identifies learning focus areas only after evaluating your learning evidence.
            </p>
            <Button asChild size="sm" className="mt-2">
              <Link to="/student/diagnostic">
                Start Initial Diagnostic <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {subjects.map((sub) => {
              const hasSubEvidence = sub.progressScore > 0 || (sub.strengthenedSkills && sub.strengthenedSkills.length > 0) || (sub.developingSkills && sub.developingSkills.length > 0);
              return (
                <div
                  key={sub.subject}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-panel hover:border-primary/40 transition-all cursor-pointer"
                  onClick={() => setSelectedSubject(sub)}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-2xl font-bold text-foreground">{sub.subject}</h3>
                      {sub.growth !== 0 && (
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                          sub.growth >= 0 ? "bg-success/15 text-success" : "bg-amber-500/15 text-amber-600"
                        )}>
                          <TrendingUp className="size-3" /> {sub.growth > 0 ? `+${sub.growth}%` : `${sub.growth}%`} Growth
                        </span>
                      )}
                    </div>

                    {hasSubEvidence ? (
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                          <span className="text-muted-foreground">Overall Mastery</span>
                          <span className="text-foreground font-mono font-bold">{sub.progressScore}%</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              sub.progressScore >= 75 ? "bg-success" : sub.progressScore >= 50 ? "bg-primary" : "bg-amber-500"
                            )}
                            style={{ width: `${Math.max(4, sub.progressScore)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-1">
                        Complete your diagnostic to begin building your subject profile.
                      </p>
                    )}

                    {/* Strengthened Skills */}
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-success" /> Strengthened Skills ({(sub.strengthenedSkills || []).length})
                      </p>
                      <div className="space-y-1.5">
                        {(sub.strengthenedSkills || []).length > 0 ? (
                          sub.strengthenedSkills.slice(0, 3).map((sk) => (
                            <div key={sk.skill} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 border border-border/60">
                              <span className="font-medium text-foreground truncate">✓ {sk.skill}</span>
                              <span className="font-bold text-success text-[11px]">{sk.mastery}%</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic">No validated strong skills yet</p>
                        )}
                      </div>
                    </div>

                    {/* Skills in Focus */}
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                        <Sparkles className="size-3 text-primary" /> Skills in Focus ({(sub.developingSkills || []).length})
                      </p>
                      <div className="space-y-1.5">
                        {(sub.developingSkills || []).length > 0 ? (
                          sub.developingSkills.slice(0, 3).map((sk) => (
                            <div key={sk.skill} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 border border-border/60">
                              <span className="font-medium text-foreground truncate">→ {sk.skill}</span>
                              <span className="font-semibold text-primary text-[11px]">{sk.mastery}%</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic">Target skills mapped from curriculum</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Recommended Next Step</p>
                    <p className="text-xs font-semibold text-foreground truncate mb-3">
                      Practice {sub.nextRecommendedSkill || `${sub.subject} Foundations`}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate({ to: "/student/practice" });
                        }}
                      >
                        Practice Now <ArrowRight className="ml-1.5 size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubject(sub);
                        }}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Subject Modal Drilldown */}
        {selectedSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Subject Deep-Dive</span>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground uppercase mt-0.5">
                    {selectedSubject.subject}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedSubject(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Top Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Overall Mastery</p>
                  <p className="font-display text-3xl font-bold text-foreground mt-1">{selectedSubject.progressScore}%</p>
                  <div className="h-2 w-full rounded-full bg-border overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(5, selectedSubject.progressScore)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Growth Trend</p>
                  <p className={cn(
                    "font-display text-3xl font-bold mt-1",
                    selectedSubject.growth >= 0 ? "text-success" : "text-amber-500"
                  )}>
                    {selectedSubject.growth > 0 ? `+${selectedSubject.growth}%` : `${selectedSubject.growth}%`}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">Based on recent evidence</p>
                </div>
              </div>

              {/* Strong Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-success flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-success" /> Strong Skills
                </h4>
                {selectedSubject.strengthenedSkills && selectedSubject.strengthenedSkills.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedSubject.strengthenedSkills.map((sk) => (
                      <div key={sk.skill} className="flex items-center justify-between p-3 rounded-xl border border-success/20 bg-success/5 text-xs">
                        <span className="font-semibold text-foreground">✓ {sk.skill}</span>
                        <span className="font-bold text-success">{sk.mastery}% Mastery</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic p-3 rounded-xl bg-muted/20 border border-dashed border-border">
                    No validated strong skills yet. Take more practice checks to strengthen skills.
                  </p>
                )}
              </div>

              {/* Skills in Focus */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Target className="size-4 text-primary" /> Skills in Focus
                </h4>
                {selectedSubject.developingSkills && selectedSubject.developingSkills.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedSubject.developingSkills.map((sk) => (
                      <div key={sk.skill} className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs">
                        <span className="font-semibold text-foreground">→ {sk.skill}</span>
                        <span className="font-bold text-primary">{sk.mastery}% Mastery</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic p-3 rounded-xl bg-muted/20 border border-dashed border-border">
                    All core syllabus skills currently performing well.
                  </p>
                )}
              </div>

              {/* Action */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Recommended Next Step</p>
                  <p className="text-xs font-bold text-foreground">Practice {selectedSubject.nextRecommendedSkill || selectedSubject.subject}</p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedSubject(null);
                    navigate({ to: "/student/practice" });
                  }}
                  className="w-full sm:w-auto"
                >
                  <Play className="mr-1.5 size-4" /> Practice Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ==========================================
// 4. STUDENT PERSONALIZED PRACTICE & QUIZZES (Real Session Flow)
// ==========================================
export function StudentPracticeAndQuizzes() {
  const [data, setData] = useState<{ recommendations: PracticeItem[]; quizOptions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Practice / Quiz Session State
  const [activeSession, setActiveSession] = useState<{
    type: "practice" | "quiz";
    id: string; // practiceId or attemptId
    title: string;
    subject: string;
    topic?: string;
    skill?: string;
    questions: PracticeQuestion[];
    timeLimitMinutes?: number;
  } | null>(null);

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sessionResult, setSessionResult] = useState<{
    score: number;
    totalQuestions: number;
    percentage: number;
    xpEarned: number;
    results: Array<{ questionId: string; isCorrect: boolean; explanation?: string }>;
    newlyUnlocked?: Array<{ code: string; title: string; xpReward: number }>;
  } | null>(null);

  const loadRecommendations = () => {
    setLoading(true);
    studentApi.getPracticeRecommendations()
      .then(setData)
      .catch((err) => console.warn("[Practice] Error loading:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  // 1. Start Practice Session
  const handleStartPractice = async (rec: PracticeItem) => {
    try {
      toast.loading("Preparing personalized questions...", { id: "practice-loader" });
      const session = await studentApi.startPractice({
        subject: rec.subject,
        topic: rec.topic,
        skill: rec.skill,
        count: 5
      });
      toast.dismiss("practice-loader");

      setActiveSession({
        type: "practice",
        id: session.practiceId,
        title: session.title,
        subject: session.subject,
        topic: session.topic,
        skill: session.skill,
        questions: session.questions
      });
      setCurrentQIndex(0);
      setAnswers({});
      setSessionResult(null);
    } catch (err: any) {
      toast.dismiss("practice-loader");
      toast.error(err.message || "Failed starting practice session");
    }
  };

  // 2. Start Quiz Session
  const handleStartQuiz = async (quizType: "quick" | "topic" | "subject" | "challenge", quizTitle: string) => {
    try {
      toast.loading(`Launching ${quizTitle}...`, { id: "quiz-loader" });
      const session = await studentApi.startQuiz({
        quizType,
        subject: "Mathematics"
      });
      toast.dismiss("quiz-loader");

      setActiveSession({
        type: "quiz",
        id: session.attemptId,
        title: session.quizTitle,
        subject: session.subject,
        topic: session.topic,
        questions: session.questions,
        timeLimitMinutes: session.timeLimitMinutes
      });
      setCurrentQIndex(0);
      setAnswers({});
      setSessionResult(null);
    } catch (err: any) {
      toast.dismiss("quiz-loader");
      toast.error(err.message || "Failed starting quiz session");
    }
  };

  // 3. Submit Session
  const handleSubmitSession = async () => {
    if (!activeSession) return;
    setSubmitting(true);
    try {
      if (activeSession.type === "practice") {
        const res = await studentApi.submitPractice(activeSession.id, answers);
        setSessionResult({
          score: res.score,
          totalQuestions: res.totalQuestions,
          percentage: res.percentage,
          xpEarned: res.xpEarned,
          results: res.results
        });
        toast.success(`Practice completed! +${res.xpEarned} XP awarded.`);
      } else {
        const res = await studentApi.submitQuiz(activeSession.id, answers);
        setSessionResult({
          score: res.score,
          totalQuestions: res.totalQuestions,
          percentage: res.percentage,
          xpEarned: res.xpEarned,
          results: res.results,
          newlyUnlocked: res.newlyUnlocked
        });
        toast.success(`Quiz completed! +${res.xpEarned} XP awarded.`);
      }
      loadRecommendations();
    } catch (err: any) {
      toast.error(err.message || "Failed submitting responses");
    } finally {
      setSubmitting(false);
    }
  };

  const currentQ = activeSession?.questions[currentQIndex];

  return (
    <AppShell role="student" title="Personalized Practice & Quizzes" eyebrow="Targeted Mastery">
      <div className="space-y-10">
        {/* Active Session Overlay Modal */}
        {activeSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 md:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
              {!sessionResult ? (
                <>
                  {/* Session Header */}
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-primary/10">
                          {activeSession.type === "quiz" ? "Live Quiz" : "Adaptive Practice"}
                        </span>
                        <span className="text-xs text-muted-foreground">{activeSession.subject} {activeSession.skill ? `· ${activeSession.skill}` : ""}</span>
                      </div>
                      <h3 className="font-display text-xl font-bold text-foreground mt-1">{activeSession.title}</h3>
                    </div>
                    <button
                      onClick={() => setActiveSession(null)}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>Question {currentQIndex + 1} of {activeSession.questions.length}</span>
                      <span>{Object.keys(answers).length} Answered</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${((currentQIndex + 1) / activeSession.questions.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Current Question */}
                  {currentQ ? (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        {currentQ.topic && currentQ.skill && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                              {currentQ.subject || activeSession.subject} · {currentQ.topic}
                            </span>
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {currentQ.skill}
                            </span>
                          </div>
                        )}
                        <div className="p-4 rounded-xl bg-muted/40 border border-border/80">
                          <p className="font-display text-base sm:text-lg font-bold text-foreground leading-relaxed">
                            {currentQ.questionText || currentQ.text}
                          </p>
                        </div>
                      </div>

                      {currentQ.contextPassage && (
                        <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground font-serif">
                          {currentQ.contextPassage}
                        </div>
                      )}

                      {/* Options */}
                      <div className="space-y-2.5">
                        {currentQ.options.map((opt) => {
                          const isSelected = answers[currentQ.id] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setAnswers({ ...answers, [currentQ.id]: opt })}
                              className={cn(
                                "w-full text-left p-3.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-between cursor-pointer",
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                  : "border-border bg-card hover:bg-muted/40 text-foreground"
                              )}
                            >
                              <span>{opt}</span>
                              {isSelected && <Check className="size-4 text-primary" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Navigation buttons */}
                      <div className="flex justify-between items-center pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentQIndex === 0}
                          onClick={() => setCurrentQIndex(currentQIndex - 1)}
                        >
                          Previous
                        </Button>

                        {currentQIndex < activeSession.questions.length - 1 ? (
                          <Button size="sm" onClick={() => setCurrentQIndex(currentQIndex + 1)}>
                            Next <ChevronRight className="ml-1 size-4" />
                          </Button>
                        ) : (
                          <Button size="sm" disabled={submitting} onClick={handleSubmitSession}>
                            {submitting ? "Grading..." : "Submit Session"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                /* Results Screen */
                <div className="space-y-6 text-center py-2">
                  <div className="size-16 rounded-full bg-success/15 text-success mx-auto grid place-items-center">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold text-foreground">Session Complete!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You scored <strong className="text-foreground">{sessionResult.score} / {sessionResult.totalQuestions}</strong> ({sessionResult.percentage}%).
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary">
                    <Zap className="size-4" /> +{sessionResult.xpEarned} XP Awarded & Evidence Updated
                  </div>

                  {/* Newly Unlocked Achievements Notification */}
                  {sessionResult.newlyUnlocked && sessionResult.newlyUnlocked.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <Trophy className="size-4" /> Newly Unlocked Achievement!
                      </p>
                      {sessionResult.newlyUnlocked.map((ach) => (
                        <div key={ach.code} className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-foreground">{ach.title}</span>
                          <span className="text-amber-600 font-bold">+{ach.xpReward} XP</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Question Explanations */}
                  <div className="text-left space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Answers & Explanations</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {sessionResult.results.map((r, i) => (
                        <div key={r.questionId || i} className="p-3 rounded-lg border border-border bg-muted/30 text-xs space-y-1">
                          <div className="flex items-center justify-between font-semibold">
                            <span>Question {i + 1}</span>
                            <span className={r.isCorrect ? "text-success font-bold" : "text-destructive font-bold"}>
                              {r.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                            </span>
                          </div>
                          {r.explanation && (
                            <p className="text-muted-foreground leading-relaxed pt-1">
                              <strong>Explanation: </strong>{r.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex justify-center gap-3">
                    <Button onClick={() => setActiveSession(null)}>
                      Close & Return
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FOR YOU Skill Boosters */}
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Recommended Skill Boosters</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Generated continuously from your weakest and highest-priority learning evidence.
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Analyzing active learning evidence for personalized practice recommendations...
            </div>
          ) : data?.recommendations && data.recommendations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {data.recommendations.map((p) => (
                <div key={p.id} className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-panel hover:border-primary/40 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-primary">
                      <span>{p.subject}</span>
                      <span className="text-muted-foreground">{p.minutes} mins</span>
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">{p.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.topic} · {p.skill}</p>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground leading-snug">
                      Your recent evidence indicates this skill needs reinforcement.
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                        <span>Current Mastery</span>
                        <span className="font-mono text-foreground">{p.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${Math.max(5, p.progress)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <Button size="sm" className="mt-5 w-full cursor-pointer" onClick={() => handleStartPractice(p)}>
                    Start Practice <Play className="ml-1.5 size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center space-y-2">
              <Sparkles className="size-8 mx-auto text-primary" />
              <p className="font-semibold text-sm text-foreground">No priority skill gaps detected!</p>
              <p className="text-xs text-muted-foreground">Great job! Try taking a challenge quiz or exploring other subjects below.</p>
            </div>
          )}
        </section>

        {/* QUIZZES Section */}
        <section className="space-y-4 border-t border-border pt-8">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Learning Quizzes & Challenges</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Select any of the 4 verified quiz formats to test mastery and advance your streak.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* 1. Quick Quiz */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-panel">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                  <Zap className="size-3" /> Quick Quiz
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">5-Minute Rapid Check</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Short 3-question formative sprint to verify core understanding.
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground pt-1">⏱ 3 Mins · 3 Questions</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-5 w-full cursor-pointer"
                onClick={() => handleStartQuiz("quick", "5-Minute Rapid Check")}
              >
                Launch Quiz <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            </div>

            {/* 2. Topic Quiz */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-panel">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                  <BookOpen className="size-3" /> Topic Quiz
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">Core Topic Mastery</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  5 focused questions addressing your active curriculum milestone.
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground pt-1">⏱ 5 Mins · 5 Questions</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-5 w-full cursor-pointer"
                onClick={() => handleStartQuiz("topic", "Core Topic Mastery")}
              >
                Launch Quiz <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            </div>

            {/* 3. Subject Quiz */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-panel">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                  <Layers className="size-3" /> Subject Quiz
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">Comprehensive Subject Review</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Broad check covering active competencies in mathematics and science.
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground pt-1">⏱ 7 Mins · 5 Questions</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-5 w-full cursor-pointer"
                onClick={() => handleStartQuiz("subject", "Comprehensive Subject Review")}
              >
                Launch Quiz <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            </div>

            {/* 4. Challenge Quiz */}
            <div className="flex flex-col justify-between rounded-xl border border-amber-500/30 bg-gradient-to-br from-card to-amber-500/5 p-5 shadow-panel">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Flame className="size-3 fill-amber-500" /> Challenge Quiz
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">High-Streak Clash Duel</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Higher-difficulty problems granting bonus XP and streak boosts!
                </p>
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 pt-1">⏱ 10 Mins · +50 Bonus XP</p>
              </div>
              <Button
                size="sm"
                className="mt-5 w-full bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
                onClick={() => handleStartQuiz("challenge", "High-Streak Clash Duel")}
              >
                Launch Challenge <Zap className="ml-1.5 size-3.5" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

// ==========================================
// 5. STUDENT LEARNING PATH (Constellation)
// ==========================================
export function StudentLearningPath() {
  const { user } = useAuth();
  const [learningPath, setLearningPath] = useState<LearningPathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "complete" | "active" | "needs_attention" | "next">("all");

  const loadLearningPath = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentApi.getLearningPath();
      setLearningPath(data);
    } catch (err: any) {
      console.error("[Learning Path] Failed to load:", err);
      setError(err?.message || "Could not load learning path data. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLearningPath();
  }, []);

  const nodes = learningPath?.nodes || [];
  const filteredNodes = selectedFilter === "all"
    ? nodes
    : nodes.filter((n) => n.status === selectedFilter);

  return (
    <AppShell role="student" title="Your Learning Path" eyebrow="Visual Curriculum Constellation">
      <div className="space-y-8">
        {/* Header and Student Class Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-panel">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Class {learningPath?.student.classLevel || user?.classLevel || 7} Adaptive Curriculum
              </span>
              <span className="text-xs text-muted-foreground">
                Section {learningPath?.student.section || "A"}
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              {learningPath?.student.name || user?.name || "Student"}&apos;s Knowledge Map
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {learningPath?.student.school || user?.school || "Delhi Public School"} · Real-time mastery derived from diagnostic and assessment evidence
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadLearningPath} disabled={loading}>
              <RefreshCw className={cn("mr-1.5 size-3.5", loading && "animate-spin")} /> Refresh Map
            </Button>
            <Button asChild size="sm">
              <Link to="/student/practice">
                <Play className="mr-1.5 size-3.5" /> Practice Now
              </Link>
            </Button>
          </div>
        </div>

        {/* Dynamic KPI Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Total Knowledge Nodes"
            value={String(learningPath?.summary.totalNodes || (loading ? "..." : "0"))}
            detail="Active syllabus milestone checkpoints"
            tone="good"
          />
          <Stat
            label="Mastered Milestones"
            value={String(learningPath?.summary.completedCount || 0)}
            detail="Skills with strong validated evidence"
            tone="good"
          />
          <Stat
            label="Active Focus Areas"
            value={String(learningPath?.summary.activeCount || 0)}
            detail="Currently advancing through exercises"
          />
          <Stat
            label="Needs Practice"
            value={String(learningPath?.summary.needsAttentionCount || 0)}
            detail="Identified learning growth areas"
            tone={learningPath?.summary.needsAttentionCount ? "warn" : undefined}
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h3 className="font-display text-base font-bold text-foreground">Failed to load Learning Path</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">{error}</p>
            <Button size="sm" onClick={loadLearningPath}>
              <RefreshCw className="mr-1.5 size-3.5" /> Try Again
            </Button>
          </div>
        )}

        {/* Real Dynamic Learning Constellation Visualizer */}
        {!error && (
          <section className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-panel">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Interactive Constellation</p>
                <h3 className="font-display text-2xl font-bold text-foreground">Curriculum Mastery Graph</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click any node in the constellation below to review evidence, mastery scores, and recommended actions.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-background/50">
              <LearningConstellation
                nodes={nodes}
                isLoading={loading}
                emptyMessage={learningPath?.emptyStateMessage}
                onRetry={loadLearningPath}
              />
            </div>
          </section>
        )}

        {/* Detailed Milestones & Evidence Table / List */}
        {!error && nodes.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-panel space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Knowledge Milestones & Evidence Breakdown
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Detailed status and rationale for every node in your learning path.
                </p>
              </div>

              {/* Status Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: "all", label: "All Nodes" },
                    { key: "complete", label: "Mastered" },
                    { key: "active", label: "In Progress" },
                    { key: "needs_attention", label: "Needs Practice" },
                    { key: "next", label: "Target" }
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setSelectedFilter(f.key)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      selectedFilter === f.key
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNodes.map((node) => (
                <div
                  key={node.id}
                  className="flex flex-col justify-between p-4 rounded-xl border border-border bg-background/50 hover:border-primary/40 hover:bg-card hover:shadow-sm transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                        {node.type}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          node.status === "complete" && "bg-success/10 text-success border border-success/20",
                          node.status === "active" && "bg-primary/10 text-primary border border-primary/20",
                          node.status === "needs_attention" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                          node.status === "next" && "bg-muted text-foreground border border-dashed border-primary/40",
                          node.status === "locked" && "bg-muted text-muted-foreground"
                        )}
                      >
                        {node.status === "complete" ? "Mastered" : node.status === "needs_attention" ? "Needs Practice" : node.status === "active" ? "In Progress" : node.status === "next" ? "Target" : "Locked"}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-display text-sm font-bold text-foreground leading-snug">
                        {node.title || node.label}
                      </h4>
                      {node.subject && (
                        <p className="text-[11px] font-medium text-primary mt-0.5">
                          {node.subject} {node.topic ? `· ${node.topic}` : ""}
                        </p>
                      )}
                    </div>

                    {typeof node.progress === "number" && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                          <span>Mastery</span>
                          <span className="font-mono text-foreground">{node.progress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-border overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              node.status === "needs_attention" ? "bg-amber-500" : "bg-primary"
                            )}
                            style={{ width: `${Math.min(100, Math.max(5, node.progress))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {node.evidenceSummary || node.detail}
                    </p>
                  </div>

                  {node.actionUrl && (
                    <div className="pt-3 mt-3 border-t border-border/60">
                      <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold">
                        <Link to={node.actionUrl as any}>
                          {node.actionLabel || "View Action"} <ArrowRight className="ml-1.5 size-3" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

// Achievement vector icon registry mapping catalog icon names to Lucide SVG icons
const ACHIEVEMENT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Footprints,
  Compass,
  Flame,
  Zap,
  Crown,
  Target,
  BookOpenCheck,
  BookOpen,
  Award,
  TrendingUp,
  Medal,
  Rocket,
  Trophy,
  Star,
  Sparkles,
  GraduationCap,
  Shield,
  ShieldCheck,
  // normalized lowercase aliases for resilient lookup
  footprints: Footprints,
  compass: Compass,
  flame: Flame,
  zap: Zap,
  crown: Crown,
  target: Target,
  bookopencheck: BookOpenCheck,
  bookopen: BookOpen,
  award: Award,
  trendingup: TrendingUp,
  medal: Medal,
  rocket: Rocket,
  trophy: Trophy,
  star: Star,
  sparkles: Sparkles,
  graduationcap: GraduationCap,
  shield: Shield,
  shieldcheck: ShieldCheck
};

/**
 * Data-driven vector icon renderer for achievements.
 * Safely resolves any icon name to a Lucide SVG component with a fallback to Trophy/Award.
 * Never displays raw text or broken image states.
 */
function renderAchievementIcon(iconName?: string | null, className = "size-6") {
  if (!iconName || typeof iconName !== "string") {
    return <Trophy className={className} />;
  }

  // 1. Direct name match
  if (ACHIEVEMENT_ICON_MAP[iconName]) {
    const IconComponent = ACHIEVEMENT_ICON_MAP[iconName];
    return <IconComponent className={className} />;
  }

  // 2. Sanitized match (e.g. "book_open_check" or "book-open-check")
  const sanitized = iconName.toLowerCase().replace(/[-_\s]/g, "");
  if (ACHIEVEMENT_ICON_MAP[sanitized]) {
    const IconComponent = ACHIEVEMENT_ICON_MAP[sanitized];
    return <IconComponent className={className} />;
  }

  // 3. Fallback safe vector icon
  return <Trophy className={className} />;
}

// ==========================================
// 6. STUDENT ACHIEVEMENTS (Gamified Trophy Room & Milestone Hub)
// ==========================================
export function StudentAchievements() {
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const loadAchievements = () => {
    setLoading(true);
    studentApi.getAchievements()
      .then(setData)
      .catch((err) => console.warn("[Achievements] Error loading:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAchievements();
  }, []);

  const stats = data?.stats || {
    totalXp: 0,
    streakDays: 0,
    achievementsUnlocked: 0,
    totalAchievements: 11,
    learningLevel: 1
  };

  const categories = data?.categories || ["ALL", "STREAKS", "MASTERY", "PRACTICE", "QUIZZES", "ASSESSMENTS", "MILESTONES"];

  const filteredAchievements = (data?.achievements || []).filter((ach) => {
    if (selectedCategory === "ALL") return true;
    return ach.category.toUpperCase() === selectedCategory.toUpperCase();
  });

  const featured = data?.featuredAchievement;

  return (
    <AppShell role="student" title="Student Learning Achievement Center" eyebrow="Trophy Room">
      <div className="space-y-8">
        {/* Top Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/10 p-6 md:p-8 shadow-panel">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
              <Trophy className="size-4" /> Student Learning Achievement Center
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Your Achievements
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Every concept mastered, challenge completed, and learning streak adds to your journey.
            </p>
          </div>

          {/* Core Metrics Ribbon */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/80 bg-card/80 backdrop-blur-sm p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Zap className="size-3 text-primary" /> Total XP
              </p>
              <p className="font-display text-2xl font-bold text-primary mt-1 font-mono">{stats.totalXp} XP</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Authoritative balance</p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/80 backdrop-blur-sm p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Flame className="size-3 text-amber-500 fill-amber-500" /> Current Streak
              </p>
              <p className="font-display text-2xl font-bold text-amber-500 mt-1 font-mono">{stats.streakDays} Days</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Daily activity count</p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/80 backdrop-blur-sm p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Award className="size-3 text-success" /> Unlocked
              </p>
              <p className="font-display text-2xl font-bold text-foreground mt-1 font-mono">
                {stats.achievementsUnlocked} / {stats.totalAchievements}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Badges earned</p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/80 backdrop-blur-sm p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Medal className="size-3 text-primary" /> Learning Level
              </p>
              <p className="font-display text-2xl font-bold text-foreground mt-1 font-mono">Level {stats.learningLevel}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{100 - (stats.totalXp % 100)} XP to next level</p>
            </div>
          </div>
        </div>

        {/* Featured Achievement Card */}
        {featured && (
          <section className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-card to-primary/5 p-6 md:p-8 shadow-panel">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "grid size-16 shrink-0 place-items-center rounded-2xl shadow-md transition-colors",
                  featured.isUnlocked
                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 ring-4 ring-amber-500/10"
                    : "bg-muted text-muted-foreground border border-border"
                )}>
                  {renderAchievementIcon(featured.icon, featured.isUnlocked ? "size-8 text-amber-500" : "size-8 text-muted-foreground")}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {featured.isUnlocked ? "Featured Trophy" : "Next Achievable Milestone"}
                    </span>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      +{featured.xpReward} XP Reward
                    </span>
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground">
                    {featured.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {featured.description}
                  </p>
                  {featured.isUnlocked && featured.unlockedAt && (
                    <p className="text-[11px] font-semibold text-success flex items-center gap-1 pt-1">
                      <CheckCircle2 className="size-3.5" /> Unlocked on {new Date(featured.unlockedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>

              {!featured.isUnlocked && (
                <div className="w-full sm:w-64 space-y-1.5 shrink-0 bg-background/60 p-4 rounded-xl border border-border">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Unlock Progress</span>
                    <span className="font-mono text-foreground">{featured.progressText}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${featured.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Category Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground">Achievement Collection</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Filter by learning domain and milestone type.</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Achievement Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs font-semibold text-muted-foreground">Evaluating achievement unlocks...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAchievements.map((ach) => {
              return (
                <div
                  key={ach.code}
                  className={cn(
                    "flex flex-col justify-between rounded-2xl border p-5 shadow-panel transition-all",
                    ach.isUnlocked
                      ? "border-primary/40 bg-card hover:border-primary hover:shadow-md"
                      : "border-border/60 bg-card/60 opacity-80"
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "grid size-12 place-items-center rounded-xl shadow-sm transition-colors",
                        ach.isUnlocked
                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-500"
                          : "bg-muted text-muted-foreground border border-border"
                      )}>
                        {renderAchievementIcon(ach.icon, ach.isUnlocked ? "size-6 text-amber-500" : "size-6 text-muted-foreground")}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {ach.category}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          <Zap className="size-2.5" /> +{ach.xpReward} XP
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-display text-base font-bold text-foreground flex items-center gap-1.5">
                        {ach.title}
                        {ach.isUnlocked && <CheckCircle2 className="size-4 text-success shrink-0" />}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {ach.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/60">
                    {ach.isUnlocked ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-success flex items-center gap-1">
                          <Check className="size-3.5" /> Unlocked
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {ach.unlockedAt ? new Date(ach.unlockedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Earned"}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Lock className="size-3 text-muted-foreground" /> Locked Milestone
                          </span>
                          <span className="font-mono text-foreground font-bold">{ach.progressText}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{ width: `${Math.max(3, ach.progressPercent)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ==========================================
// 7. FRIENDLY FIRE — STUDENT SOCIAL COMPETITION
// ==========================================
export function StudentFriendlyFire() {
  const { user } = useAuth();
  const [classmates, setClassmates] = useState<CompetitionClassmate[]>([]);
  const [connections, setConnections] = useState<CompetitionOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCompetitionData = async () => {
    try {
      const [clsData, connData] = await Promise.all([
        studentApi.getCompetitionClassmates().catch(() => ({ classmates: [] })),
        studentApi.getCompetitionConnections().catch(() => ({ competitors: [], pendingIncoming: [], pendingOutgoing: [] }))
      ]);
      setClassmates(clsData.classmates || []);
      setConnections(connData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompetitionData();
  }, []);

  const handleChallenge = async (classmateId: string) => {
    try {
      await studentApi.sendCompetitionRequest(classmateId);
      toast.success("Friendly Fire challenge sent!");
      loadCompetitionData();
    } catch (err: any) {
      toast.error(err.message || "Failed sending challenge");
    }
  };

  const handleAccept = async (connId: string) => {
    try {
      await studentApi.acceptCompetitionRequest(connId);
      toast.success("Challenge accepted! Friendly Fire is ON 🔥");
      loadCompetitionData();
    } catch (err: any) {
      toast.error(err.message || "Failed accepting challenge");
    }
  };

  const handleDecline = async (connId: string) => {
    try {
      await studentApi.declineCompetitionRequest(connId);
      toast.info("Challenge removed");
      loadCompetitionData();
    } catch (err: any) {
      toast.error(err.message || "Failed declining challenge");
    }
  };

  return (
    <AppShell role="student" title="Friendly Fire" eyebrow="Student Competition">
      <div className="space-y-8">
        {/* Banner */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-primary/5 p-6 shadow-panel md:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Swords className="size-4" /> Voluntary Classmate Competition
          </div>
          <h2 className="mt-2 font-display text-2xl md:text-3xl font-bold text-foreground">
            Compete with verified classmates on XP & Learning Streaks!
          </h2>
          <p className="mt-2 text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Friendly Fire allows you to challenge classmates from your same school and class. Battles are based strictly on voluntary activity, practice consistency, and XP.
          </p>
        </div>

        {/* Incoming Challenge Requests */}
        {connections?.pendingIncoming && connections.pendingIncoming.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-primary animate-ping" />
              Incoming Challenge Requests ({connections.pendingIncoming.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {connections.pendingIncoming.map((req) => (
                <div key={req.connectionId} className="flex items-center justify-between rounded-xl border border-primary/30 bg-card p-4 shadow-panel">
                  <div>
                    <p className="font-bold text-sm text-foreground">{req.name}</p>
                    <p className="text-[11px] text-muted-foreground">Wants to compete with you</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" onClick={() => handleAccept(req.connectionId)}>
                      Accept
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDecline(req.connectionId)}>
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active Competitor Battles */}
        <section className="space-y-4">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Flame className="size-5 text-amber-500 fill-amber-500" />
              Active Competitor Arena ({connections?.competitors?.length || 0})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live side-by-side activity and XP showdown.
            </p>
          </div>

          {connections?.competitors && connections.competitors.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connections.competitors.map((c) => (
                <div key={c.connectionId} className="rounded-xl border border-border bg-card p-5 shadow-panel space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-lg font-bold text-foreground">{c.name}</h4>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-success/10 text-success">
                      Active Duel
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">XP Score</p>
                      <p className="font-display text-xl font-bold text-primary mt-0.5">{c.xp} XP</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Active Streak</p>
                      <p className="font-display text-xl font-bold text-amber-500 mt-0.5">{c.streak} Days</p>
                    </div>
                  </div>

                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link to="/student/practice">
                      Earn XP to Overtake <Zap className="ml-1.5 size-3.5 text-primary" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 rounded-xl border border-dashed border-border bg-card">
              <Swords className="size-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-semibold text-sm text-foreground">No active competitors yet</p>
              <p className="text-xs text-muted-foreground mt-1">Challenge a classmate below to start your Friendly Fire duel!</p>
            </div>
          )}
        </section>

        {/* Classmate Discovery */}
        <section className="space-y-4 border-t border-border pt-8">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Discover Classmates ({classmates.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified students in your same school and classroom.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classmates.map((cm) => (
              <div key={cm.studentId} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-panel">
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-foreground">{cm.name}</p>
                  <p className="text-xs text-muted-foreground">Class {cm.classLevel} · {cm.xp} XP</p>
                </div>

                <div>
                  {cm.connectionStatus === "accepted" ? (
                    <span className="text-xs font-semibold text-success flex items-center gap-1">
                      <Check className="size-3.5" /> Competing
                    </span>
                  ) : cm.connectionStatus === "pending" ? (
                    <span className="text-xs font-semibold text-muted-foreground">
                      Pending...
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleChallenge(cm.studentId)}>
                      <UserPlus className="mr-1.5 size-3.5" /> Challenge
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

// ==========================================
// 8. STUDENT PRACTICE / ASSESSMENT DETAILS RUNNER
// ==========================================
export function StudentPracticeDetails() {
  const { practiceId } = useParams({ strict: false }) as { practiceId: string };
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (practiceId) {
      // Restore draft answers if available
      try {
        const saved = sessionStorage.getItem(`siksha_practice_${practiceId}`);
        if (saved) {
          setSelectedAnswers(JSON.parse(saved));
        }
      } catch {}

      setLoading(true);
      setErrorMsg(null);
      studentApi.getAssessmentDetails(practiceId)
        .then((data) => {
          setAssessment(data);
          if (data.status === "submitted" && (data as any).result) {
            setResult((data as any).result);
            setIsSubmitted(true);
          }
        })
        .catch((err) => {
          console.error("[StudentPracticeDetails] Error loading:", err);
          setErrorMsg(err.message || "Failed loading assessment");
        })
        .finally(() => setLoading(false));
    }
  }, [practiceId]);

  const questions = assessment?.questions || [];
  const currentQ = questions[currentIdx];

  const handleSelectOption = (opt: string) => {
    if (isSubmitted || !currentQ) return;
    const updated = { ...selectedAnswers, [currentQ.id]: opt };
    setSelectedAnswers(updated);
    try {
      sessionStorage.setItem(`siksha_practice_${practiceId}`, JSON.stringify(updated));
    } catch {}
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await studentApi.submitAssessment(practiceId, selectedAnswers);
      const resData = (res as any).result || res;
      setResult(resData);
      setIsSubmitted(true);
      try {
        sessionStorage.removeItem(`siksha_practice_${practiceId}`);
      } catch {}
      toast.success("Assessment submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed submitting assessment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell role="student" title="Loading Assessment...">
        <div className="text-center py-20">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading individualized questions...</p>
        </div>
      </AppShell>
    );
  }

  if (errorMsg || !assessment) {
    return (
      <AppShell role="student" title="Assessment Error">
        <div className="max-w-md mx-auto text-center py-16 space-y-4">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive mx-auto grid place-items-center">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">Could not open assessment</h2>
          <p className="text-xs text-muted-foreground">{errorMsg || "The requested assessment could not be loaded."}</p>
          <Button onClick={() => navigate({ to: "/student/assessments" })}>
            Return to Assessments
          </Button>
        </div>
      </AppShell>
    );
  }

  if (isSubmitted && result) {
    return (
      <AppShell role="student" title="Assessment Complete!" eyebrow="Results & Review">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-panel space-y-4">
            <div className="size-16 rounded-full bg-success/15 text-success mx-auto grid place-items-center">
              <CheckCircle2 className="size-8" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground">Great effort on your learning check!</h2>
            <p className="text-sm text-muted-foreground">
              You scored <strong className="text-foreground">{result.score} / {result.maxScore}</strong> ({result.percentage}%).
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary">
              <Zap className="size-4" /> +{result.xpEarned || 30} XP Awarded
            </div>
            <div className="pt-4 flex justify-center gap-3">
              <Button onClick={() => navigate({ to: "/student/assessments" })}>
                View All Assessments
              </Button>
              <Button variant="outline" onClick={() => navigate({ to: "/student" })}>
                Back to Home
              </Button>
            </div>
          </div>

          {result.responses && result.responses.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-display text-lg font-bold text-foreground">Question Review & Explanations</h3>
              {result.responses.map((resp: any, idx: number) => (
                <div key={resp.questionId || idx} className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Question {idx + 1}</span>
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1",
                      resp.isCorrect ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    )}>
                      {resp.isCorrect ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                      {resp.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{resp.questionText}</p>
                  <div className="text-xs space-y-1">
                    <p className="text-muted-foreground">
                      Your Answer: <strong className={resp.isCorrect ? "text-success" : "text-destructive"}>{resp.selectedAnswer || "None"}</strong>
                    </p>
                    {!resp.isCorrect && (
                      <p className="text-muted-foreground">
                        Correct Answer: <strong className="text-success">{resp.correctAnswer}</strong>
                      </p>
                    )}
                  </div>
                  {resp.explanation && (
                    <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Explanation: </strong>
                      {resp.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="student" title={assessment?.title || "Practice Session"} eyebrow={assessment?.subject || "Mathematics"}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b border-border pb-3">
          <span>Question {currentIdx + 1} of {questions.length}</span>
          <span>{assessment?.purpose || "Formative Check"}</span>
        </div>

        {currentQ ? (
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-panel space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{currentQ.topic} · {currentQ.skill}</p>
              <h3 className="font-display text-xl md:text-2xl font-bold text-foreground">{currentQ.questionText}</h3>
            </div>

            {currentQ.contextPassage && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
                {currentQ.contextPassage}
              </div>
            )}

            <div className="space-y-2.5">
              {currentQ.options?.map((opt: string) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-between",
                    selectedAnswers[currentQ.id] === opt
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                      : "border-border bg-card hover:bg-muted/40 text-foreground"
                  )}
                >
                  <span>{opt}</span>
                  {selectedAnswers[currentQ.id] === opt && <Check className="size-4 text-primary" />}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(currentIdx - 1)}
              >
                Previous
              </Button>

              {currentIdx < questions.length - 1 ? (
                <Button size="sm" onClick={() => setCurrentIdx(currentIdx + 1)}>
                  Next Question <ChevronRight className="ml-1 size-4" />
                </Button>
              ) : (
                <Button size="sm" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? "Submitting..." : "Submit Assessment"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl border border-border bg-card">
            <p className="text-sm text-muted-foreground">No questions found in this assessment.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ==========================================
// 9. STUDENT CLASS-SPECIFIC ADAPTIVE DIAGNOSTIC FLOW
// ==========================================
export function StudentDiagnostic() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "not_started" | "in_progress" | "completed">("loading");
  const [classLevel, setClassLevel] = useState<number>(user?.classLevel || 7);
  const [school, setSchool] = useState<string>(user?.school || "Delhi Public School, R.K. Puram");
  const [attemptId, setAttemptId] = useState<string>("");
  const [questionNumber, setQuestionNumber] = useState<number>(1);
  const [totalQuestions, setTotalQuestions] = useState<number>(5);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completionSummary, setCompletionSummary] = useState<any>(null);

  // 1. Check current diagnostic status from PostgreSQL
  useEffect(() => {
    studentApi.getDiagnosticStatus()
      .then((res) => {
        setClassLevel(res.classLevel || user?.classLevel || 7);
        if (res.school) setSchool(res.school);
        if (res.status === "completed") {
          setStatus("completed");
        } else if (res.status === "in_progress" && res.attemptId && res.currentQuestion) {
          setStatus("in_progress");
          setAttemptId(res.attemptId);
          setQuestionNumber(res.questionNumber || 1);
          setTotalQuestions(res.totalQuestions || 5);
          setCurrentQuestion(res.currentQuestion);
        } else {
          setStatus("not_started");
        }
      })
      .catch(() => {
        setStatus("not_started");
      });
  }, [user]);

  // 2. Start new Class-Specific Diagnostic
  const handleStart = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await studentApi.startDiagnostic(classLevel);
      if ((res as any).alreadyCompleted) {
        setStatus("completed");
        setCompletionSummary({
          title: "Your learning map is ready.",
          message: "We've mapped your strengths across Mathematics, Science, and English. Your personalized curriculum path is ready."
        });
        toast.info("Diagnostic already completed for this class.");
        return;
      }
      setAttemptId(res.attemptId);
      setQuestionNumber(res.questionNumber || 1);
      setTotalQuestions(res.totalQuestions || 5);
      setCurrentQuestion(res.question);
      setSelectedAnswer("");
      setStatus("in_progress");
    } catch (err: any) {
      toast.error(err.message || "Failed starting diagnostic");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Submit answer and adaptively transition to next question
  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion || !attemptId) {
      toast.error("Please select an answer to continue");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await studentApi.submitDiagnosticAnswer(attemptId, currentQuestion.id, selectedAnswer);
      if (res.isCompleted) {
        setStatus("completed");
        setCompletionSummary(res.summary || {
          title: "Your learning map is ready.",
          message: "We've mapped your strengths across Mathematics, Science, and English. Your personalized curriculum path is ready."
        });
        toast.success("Diagnostic completed!");
      } else if (res.question) {
        setCurrentQuestion(res.question);
        setQuestionNumber(res.questionNumber || questionNumber + 1);
        setSelectedAnswer("");
      }
    } catch (err: any) {
      if (err.message && (err.message.includes("already completed") || err.message.includes("completed"))) {
        setStatus("completed");
        setCompletionSummary({
          title: "Your learning map is ready.",
          message: "We've mapped your strengths across Mathematics, Science, and English. Your personalized curriculum path is ready."
        });
        toast.success("Diagnostic completed!");
      } else {
        toast.error(err.message || "Failed submitting answer");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <AppShell role="student" title="Learning Diagnostic" eyebrow="SIKHASETU">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Sparkles className="size-10 text-primary animate-pulse mb-4" />
          <p className="text-sm font-semibold text-muted-foreground">Checking learning diagnostic status...</p>
        </div>
      </AppShell>
    );
  }

  // State 1: Introduction (Not Started)
  if (status === "not_started") {
    return (
      <AppShell role="student" title={`Class ${classLevel} Adaptive Diagnostic`} eyebrow="Personalized Learning Check">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="rounded-2xl border border-primary/20 bg-card p-8 shadow-panel space-y-6">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="size-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Baseline Learning Check</span>
                <h2 className="font-display text-2xl font-bold text-foreground">Let's understand where you're ready to learn</h2>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              This short 5-question check adapts to your responses across Mathematics, Science, and English. It is not an exam with grades — it simply finds what you already understand so your teachers and learning journey support you best.
            </p>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/40 border border-border text-xs">
              <div>
                <span className="text-muted-foreground font-semibold">Declared Classroom:</span>
                <p className="font-bold text-foreground text-sm mt-0.5">Class {classLevel}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">School:</span>
                <p className="font-bold text-foreground text-sm mt-0.5 truncate">{school}</p>
              </div>
            </div>

            <div className="pt-2">
              <Button size="lg" className="w-full text-base font-bold shadow-md" onClick={handleStart} disabled={submitting}>
                {submitting ? "Starting Diagnostic..." : `Start Class ${classLevel} Diagnostic`} <ArrowRight className="ml-2 size-5" />
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // State 2: Active Question (In Progress)
  if (status === "in_progress" && currentQuestion) {
    return (
      <AppShell role="student" title={`Class ${classLevel} Diagnostic Check`} eyebrow={`Question ${questionNumber} of ${totalQuestions}`}>
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>Question {questionNumber} of {totalQuestions}</span>
              <span className="text-primary uppercase">{currentQuestion.subject}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-panel space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                  {currentQuestion.subject} · {currentQuestion.topic}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {currentQuestion.skill}
                </span>
              </div>
              <h3 className="font-display text-xl md:text-2xl font-bold text-foreground leading-snug">
                {currentQuestion.questionText}
              </h3>
            </div>

            {currentQuestion.contextPassage && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground font-serif">
                {currentQuestion.contextPassage}
              </div>
            )}

            {/* Options */}
            <div className="space-y-3 pt-2">
              {currentQuestion.options?.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedAnswer(opt)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-between",
                    selectedAnswer === opt
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary"
                      : "border-border bg-card hover:bg-muted/40 text-foreground"
                  )}
                >
                  <span>{opt}</span>
                  {selectedAnswer === opt && <Check className="size-4 text-primary" />}
                </button>
              ))}
            </div>

            {/* Submit Action */}
            <div className="pt-4 flex justify-end border-t border-border">
              <Button size="lg" onClick={handleSubmitAnswer} disabled={submitting || !selectedAnswer}>
                {submitting ? "Evaluating..." : questionNumber === totalQuestions ? "Finish Diagnostic" : "Next Question"} <ChevronRight className="ml-1.5 size-4" />
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // State 3: Completion State (Encouraging message with NO raw scores or group labels leaked)
  return (
    <AppShell role="student" title="Diagnostic Completed!" eyebrow="Personalized Path Active">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-10 text-center shadow-panel space-y-6">
          <div className="size-20 rounded-full bg-success/15 text-success mx-auto grid place-items-center">
            <CheckCircle2 className="size-10" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-3xl font-bold text-foreground">
              {completionSummary?.title || "Your learning map is ready."}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {completionSummary?.message || "We've mapped your active strengths across Mathematics, Science, and English. Your individualized practice and learning constellation are ready."}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span>Class {classLevel} curriculum and personalized practice recommendations unlocked.</span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="flex-1 text-base font-bold shadow-md" onClick={() => navigate({ to: "/student" })}>
              Continue to Student Home <ArrowRight className="ml-2 size-5" />
            </Button>
            <Button size="lg" variant="outline" className="flex-1 text-base font-bold" onClick={() => navigate({ to: "/student/progress" })}>
              View Subject Progress <TrendingUp className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

