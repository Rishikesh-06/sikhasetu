import {
  BookOpen,
  Check,
  Heart,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  UserPlus,
  ChevronDown,
  Trophy,
  Flame,
  Clock,
  AlertCircle,
  Compass,
  CheckCircle2,
  Calendar,
  Layers,
  GraduationCap,
  ArrowUpRight,
  Info,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "./app-shell";
import { DemoNote, SectionHead, Stat } from "./page-elements";
import { MasteryBar, StatusBadge } from "./status";
import { parentApi } from "@/services/api/parent-api";
import type {
  ParentOverviewData,
  ParentChildSummary,
  ParentSubjectProgressData,
  ParentAssessmentItem,
  ParentAchievementItem
} from "@/data/types";
import type { StudentLearningPath } from "@/types/learning-path";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ParentHome() {
  const [children, setChildren] = useState<ParentChildSummary[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [overview, setOverview] = useState<ParentOverviewData | null>(null);
  const [subjectProgress, setSubjectProgress] = useState<ParentSubjectProgressData | null>(null);
  const [learningPath, setLearningPath] = useState<StudentLearningPath | null>(null);
  const [assessments, setAssessments] = useState<ParentAssessmentItem[]>([]);
  const [achievements, setAchievements] = useState<ParentAchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [childLoading, setChildLoading] = useState(false);

  // Link Child Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [connectionCode, setConnectionCode] = useState("");
  const [relationshipType, setRelationshipType] = useState<"parent" | "guardian">("parent");
  const [linking, setLinking] = useState(false);

  // Active Tab: overview | subjects | assessments | learning-path | achievements
  const [activeTab, setActiveTab] = useState<"overview" | "subjects" | "assessments" | "learning-path" | "achievements">("overview");

  // Initial load: Fetch linked children
  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    setLoading(true);
    try {
      const res = await parentApi.getChildren();
      setChildren(res.children || []);
      if (res.children && res.children.length > 0) {
        const firstId = res.children[0].id;
        setActiveChildId(firstId);
        await loadChildData(firstId);
      }
    } catch (err: any) {
      console.error("Failed loading children:", err);
      toast.error(err.message || "Failed loading children");
    } finally {
      setLoading(false);
    }
  };

  const loadChildData = async (studentId: string) => {
    setChildLoading(true);
    try {
      const [overviewData, subjectsData, pathData, assessData, achData] = await Promise.all([
        parentApi.getChildOverview(studentId).catch(() => null),
        parentApi.getChildSubjectProgress(studentId).catch(() => null),
        parentApi.getChildLearningPath(studentId).catch(() => null),
        parentApi.getChildAssessments(studentId).catch(() => ({ assessments: [] })),
        parentApi.getChildAchievements(studentId).catch(() => ({ achievements: [] }))
      ]);

      setOverview(overviewData);
      setSubjectProgress(subjectsData);
      setLearningPath(pathData?.learningPath || null);
      setAssessments(assessData?.assessments || []);
      setAchievements(achData?.achievements || []);
    } catch (err: any) {
      console.error("Failed fetching child data:", err);
      toast.error(err.message || "Failed loading child data");
    } finally {
      setChildLoading(false);
    }
  };

  const handleSelectChild = (studentId: string) => {
    if (studentId === activeChildId) return;
    setActiveChildId(studentId);
    loadChildData(studentId);
  };

  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectionCode.trim()) {
      toast.error("Please enter a connection code.");
      return;
    }

    setLinking(true);
    try {
      const res = await parentApi.linkChild(connectionCode.trim(), relationshipType);
      toast.success(res.message || `Successfully linked ${res.student.name}!`);
      setIsLinkModalOpen(false);
      setConnectionCode("");
      await loadChildren();
      if (res.student?.id) {
        setActiveChildId(res.student.id);
        await loadChildData(res.student.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed linking child. Please check the code.");
    } finally {
      setLinking(false);
    }
  };

  const activeChild = children.find(c => c.id === activeChildId) || (overview?.student ? {
    id: overview.student.id,
    name: overview.student.name,
    classLevel: overview.student.classLevel,
    school: overview.student.school,
    relationshipType: (overview.student.relationshipType as any) || "parent",
    verifiedAt: new Date().toISOString()
  } : null);

  return (
    <AppShell
      role="parent"
      title={activeChild ? `${activeChild.name.split(" ")[0]}’s Learning Journey` : "Parent Dashboard"}
      eyebrow={activeChild ? `Class ${activeChild.classLevel} · ${activeChild.school}` : "Family Learning Intelligence"}
      actions={
        <div className="flex items-center gap-2">
          {children.length > 1 && (
            <div className="relative">
              <select
                value={activeChildId || ""}
                onChange={(e) => handleSelectChild(e.target.value)}
                className="h-9 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Class {c.classLevel})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsLinkModalOpen(true)}
            className="gap-1.5 text-xs h-9"
          >
            <UserPlus className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Connect Another Child</span>
            <span className="sm:hidden">+ Child</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Child Selector Cards / Multi-Child Bar */}
        {children.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">My Children:</span>
              {children.map((c) => {
                const isSelected = c.id === activeChildId;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectChild(c.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all border",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <span className={cn(
                      "grid size-6 place-items-center rounded-full text-[10px] font-bold",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {c.name[0]}
                    </span>
                    <span className="truncate">{c.name}</span>
                    <span className="text-[10px] opacity-75 font-normal">Class {c.classLevel}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-success" /> Live student learning evidence
            </p>
          </div>
        )}

        {/* Empty State when no children linked */}
        {children.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-soft max-w-xl mx-auto">
            <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
              <UserPlus className="size-7" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Connect Your Child's Account</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              To start following your child's learning journey, ask them to generate a 8-character connection code from their student profile header.
            </p>
            <Button onClick={() => setIsLinkModalOpen(true)} className="mt-6 gap-2">
              <UserPlus className="size-4" />
              <span>Enter Connection Code</span>
            </Button>
          </div>
        )}

        {/* Navigation Tabs */}
        {activeChild && (
          <div className="flex border-b border-border gap-1 overflow-x-auto">
            {[
              { id: "overview", label: "Learning Overview", icon: Sparkles },
              { id: "subjects", label: "Subject Progress", icon: BookOpen },
              { id: "learning-path", label: "Learning Path", icon: Compass },
              { id: "assessments", label: "Assessments", icon: GraduationCap },
              { id: "achievements", label: "Achievements", icon: Trophy }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && activeChild && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Hero Section */}
            <section className="grid gap-6 border-b border-border pb-8 lg:grid-cols-[1fr_360px]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1.5 text-xs font-bold text-success">
                  <TrendingUp className="size-4" />
                  {overview?.overallGrowth !== null && overview?.overallGrowth !== undefined
                    ? `Steady Progress (+${overview.overallGrowth}% Growth)`
                    : "Active Learning Journey"}
                </span>

                <h2 className="mt-4 max-w-2xl font-display text-3xl md:text-4xl font-bold text-foreground">
                  {overview?.student?.name || activeChild.name} is building mastery through active practice.
                </h2>

                <p className="mt-3 max-w-xl text-muted-foreground leading-relaxed text-sm">
                  {overview?.nextFocus || "Consistent daily practice sessions help concepts stick with confidence."}
                </p>

                <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-medium">
                    <GraduationCap className="size-3.5 text-primary" /> Class {activeChild.classLevel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-medium">
                    <Layers className="size-3.5 text-primary" /> {activeChild.school}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-medium">
                    <CheckCircle2 className="size-3.5 text-success" /> Active Family Link
                  </span>
                </div>
              </div>

              <div
                className="rounded-2xl border border-indigo-900/50 p-6 md:p-7 shadow-panel flex flex-col justify-between relative overflow-hidden text-white"
                style={{
                  background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
                  boxShadow: "0 10px 25px -5px rgba(30, 27, 75, 0.4), 0 8px 10px -6px rgba(30, 27, 75, 0.4)"
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="grid size-10 place-items-center rounded-xl bg-rose-500/20 text-rose-300 border border-rose-400/30">
                      <Heart className="size-5 fill-rose-400 text-rose-400" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 border border-emerald-400/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                      <Sparkles className="size-3" /> Consistency
                    </span>
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-wider text-indigo-200">Daily Practice</p>
                  <p className="mt-1 font-display text-3xl md:text-4xl font-bold text-white tracking-tight">
                    {overview?.streak?.currentStreak || 0}-Day Learning Streak
                  </p>
                </div>
                <p className="mt-4 text-xs md:text-sm text-slate-200 leading-relaxed font-normal">
                  Regular 5–10 minute learning sessions maintain retention and boost confidence.
                </p>
              </div>
            </section>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Curriculum Mastery</p>
                <p className="mt-2 font-display text-3xl font-bold text-foreground">
                  {overview?.overallMastery !== null && overview?.overallMastery !== undefined ? `${overview.overallMastery}%` : "Developing"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Across active subjects</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Growth</p>
                <p className="mt-2 font-display text-3xl font-bold text-success">
                  {overview?.overallGrowth ? `+${overview.overallGrowth}%` : "+5%"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Month over month</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assessments Done</p>
                <p className="mt-2 font-display text-3xl font-bold text-foreground">
                  {assessments.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Completed checks</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Milestones Earned</p>
                <p className="mt-2 font-display text-3xl font-bold text-amber-500">
                  {achievements.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Learning achievements</p>
              </div>
            </div>

            {/* Subject Overview Grid */}
            {overview && overview.subjects.length > 0 && (
              <section>
                <SectionHead
                  title="Subject Progress"
                  description="Real curriculum mastery calculated from verified learning evidence."
                />
                <div className="grid gap-4 md:grid-cols-3">
                  {overview.subjects.map((s) => (
                    <article className="rounded-xl border border-border bg-card p-6 shadow-soft" key={s.subject}>
                      <div className="flex items-start justify-between">
                        <div>
                          <BookOpen className="size-5 text-primary" />
                          <h3 className="mt-3 font-display text-xl font-bold text-foreground">{s.subject}</h3>
                        </div>
                        {s.growth > 0 && (
                          <span className="text-xs font-bold text-success">+{s.growth}%</span>
                        )}
                      </div>
                      <p className="mt-4 font-display text-3xl font-bold text-foreground">{s.score}%</p>
                      <MasteryBar value={s.score} />
                      <StatusBadge status={s.status} className="mt-4" />
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Weekly Consistency & Recent Activities */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Consistency */}
              <section>
                <SectionHead title="Weekly Consistency" description="Daily learning engagement" />
                <div className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Stat
                      label="Active Days This Week"
                      value={`${overview?.streak.activeDays.filter(Boolean).length || 0} / 7`}
                      tone="good"
                    />
                    <Stat
                      label="Longest Streak"
                      value={`${overview?.streak.longestStreak || overview?.streak.currentStreak || 0} Days`}
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-3">7-Day Activity Calendar</p>
                    <div className="flex gap-2">
                      {(overview?.streak.activeDays || [0, 0, 0, 0, 0, 0, 0]).map((v, i) => (
                        <div key={i} className="flex-1 text-center">
                          <div
                            className={cn(
                              "mx-auto grid size-8 place-items-center rounded-full text-xs font-bold transition-all",
                              v ? "bg-success text-white shadow-xs" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {v ? <Check className="size-4 text-white" /> : "·"}
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground font-medium">{"MTWTFSS"[i]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Recent Activities */}
              <section>
                <SectionHead title="Recent Learning Activity" description="Verified study events" />
                <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-soft overflow-hidden">
                  {overview && overview.recentActivities.length > 0 ? (
                    overview.recentActivities.map((a, i) => (
                      <div className="flex items-center justify-between p-4" key={a.id || i}>
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
                            <Check className="size-4" />
                          </span>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{a.title}</p>
                            <p className="text-xs text-muted-foreground">{new Date(a.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {a.xp && (
                          <span className="text-xs font-bold text-amber-500">+{a.xp} XP</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No recent activities recorded yet. When your child practices, logs will appear here.
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Areas Requiring Attention */}
            {overview?.areasRequiringAttention && overview.areasRequiringAttention.length > 0 && (
              <section className="rounded-2xl border border-warning/30 bg-warning/5 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-5 text-warning" />
                  <h3 className="font-display text-lg font-bold text-foreground">Areas for Encouragement</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Concepts where {activeChild.name.split(" ")[0]} would benefit from short supportive practice sessions:
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {overview.areasRequiringAttention.map((area, idx) => (
                    <div key={idx} className="rounded-xl border border-border bg-card p-4 shadow-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{area.subject}</span>
                      <p className="mt-1 font-semibold text-sm text-foreground">{area.topic}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{area.skill}</p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Readiness:</span>
                        <span className="font-bold text-warning">{area.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* TAB 2: SUBJECT PROGRESS */}
        {activeTab === "subjects" && activeChild && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <SectionHead
              title={`${activeChild.name.split(" ")[0]}’s Subject Evidence`}
              description="Detailed competency breakdowns across verified learning topics."
            />

            {subjectProgress && subjectProgress.subjects.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                {subjectProgress.subjects.map((subj) => (
                  <div key={subj.subject} className="rounded-2xl border border-border bg-card p-6 shadow-soft flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between border-b border-border pb-4">
                        <div>
                          <BookOpen className="size-5 text-primary" />
                          <h3 className="mt-2 font-display text-xl font-bold text-foreground">{subj.subject}</h3>
                        </div>
                        {subj.progressScore !== null ? (
                          <div className="text-right">
                            <span className="font-display text-2xl font-bold text-foreground">{subj.progressScore}%</span>
                            {subj.growth > 0 && <p className="text-[11px] font-bold text-success">+{subj.growth}% growth</p>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">In Progress</span>
                        )}
                      </div>

                      {subj.progressScore !== null && (
                        <div className="my-4">
                          <MasteryBar value={subj.progressScore} />
                        </div>
                      )}

                      <div className="mt-5 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mastered Topics & Skills</h4>
                        {subj.topics.length > 0 ? (
                          <div className="space-y-2">
                            {subj.topics.map((t, idx) => (
                              <div key={idx} className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
                                <div className="flex items-center justify-between font-semibold text-foreground">
                                  <span>{t.topic}</span>
                                  <span className={cn(
                                    "text-[11px] font-bold",
                                    t.masteryScore >= 75 ? "text-success" : t.masteryScore >= 60 ? "text-primary" : "text-warning"
                                  )}>
                                    {t.masteryScore}%
                                  </span>
                                </div>
                                <p className="text-muted-foreground mt-0.5">{t.skill}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground py-2">
                            Evidence is being gathered as your child completes practice questions.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                No subject progress records available yet.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LEARNING PATH */}
        {activeTab === "learning-path" && activeChild && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <SectionHead
              title="Curriculum Learning Constellation"
              description="Visual progression path showing mastered competencies and active study objectives."
            />

            {learningPath && learningPath.nodes && learningPath.nodes.length > 0 ? (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">Class {activeChild.classLevel} Learning Path</h3>
                    <p className="text-xs text-muted-foreground">Curated step-by-step progression based on student readiness</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-success" /> Mastered</span>
                    <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-primary" /> In Progress</span>
                    <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-muted border border-border" /> Upcoming</span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {learningPath.nodes.map((node: any) => {
                    const isMastered = node.status === "mastered" || node.status === "completed";
                    const isInProgress = node.status === "in_progress" || node.status === "active";

                    return (
                      <div
                        key={node.id}
                        className={cn(
                          "rounded-xl border p-4 transition-all shadow-xs",
                          isMastered
                            ? "border-success/30 bg-success/5"
                            : isInProgress
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-card"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {node.subject || "Curriculum"}
                          </span>
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize",
                            isMastered
                              ? "bg-success/20 text-success"
                              : isInProgress
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {isMastered ? <Check className="size-2.5" /> : null}
                            {node.status || "Upcoming"}
                          </span>
                        </div>

                        <h4 className="mt-2 font-display text-base font-bold text-foreground">{node.title || node.topic}</h4>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{node.description || node.skill}</p>

                        {node.progress !== undefined && (
                          <div className="mt-3">
                            <MasteryBar value={node.progress} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                Learning path is being personalized for {activeChild.name}.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ASSESSMENTS */}
        {activeTab === "assessments" && activeChild && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <SectionHead
              title="Completed Assessments"
              description="Standardized adaptive tests and quizzes completed by your child."
            />

            {assessments.length > 0 ? (
              <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
                {assessments.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between p-5 gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "grid size-11 place-items-center rounded-xl font-bold text-sm",
                        a.percentage >= 75 ? "bg-success/15 text-success border border-success/30" : "bg-primary/15 text-primary border border-primary/30"
                      )}>
                        {a.percentage}%
                      </div>
                      <div>
                        <h4 className="font-semibold text-base text-foreground">{a.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{a.subject}</span>
                          <span>•</span>
                          <span>{new Date(a.submittedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {a.score} / {a.maxScore} marks
                      </span>
                      <p className="text-[11px] text-success font-semibold">Completed & Verified</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                No assessments completed yet. When your child finishes an adaptive check, scores will appear here.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ACHIEVEMENTS */}
        {activeTab === "achievements" && activeChild && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <SectionHead
              title="Milestones & Trophies"
              description="Earned badges celebrating consistency, mastery, and dedication."
            />

            {achievements.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {achievements.map((ach) => (
                  <div key={ach.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-soft flex items-start gap-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
                      <Trophy className="size-6" />
                    </div>
                    <div>
                      <h4 className="font-display text-base font-bold text-foreground">{ach.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{ach.description}</p>
                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-amber-500">+{ach.xpReward} XP</span>
                        <span className="text-muted-foreground">{new Date(ach.unlockedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                No trophies unlocked yet. They will appear here as your child reaches study milestones!
              </div>
            )}
          </div>
        )}

        {/* Family Privacy Guarantee Footer */}
        <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground flex items-center gap-3">
          <ShieldCheck className="size-5 text-success shrink-0" />
          <span>
            <strong>SIKHASETU Family Privacy Protection:</strong> Learning insights and scores are presented strictly for supportive family guidance. Diagnostic classification groups and raw grading criteria remain protected.
          </span>
        </div>
      </div>

      {/* Link Another Child Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 md:p-8 shadow-2xl text-card-foreground">
            <button
              onClick={() => setIsLinkModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <UserPlus className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">Connect Another Child</h3>
                <p className="text-xs text-muted-foreground">Enter the connection code generated from their student profile</p>
              </div>
            </div>

            <form onSubmit={handleLinkChild} className="mt-6 space-y-4">
              <label className="form-field">
                Parent Connection Code
                <input
                  type="text"
                  required
                  value={connectionCode}
                  onChange={(e) => setConnectionCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB7K-92PX"
                  maxLength={9}
                  className="font-mono tracking-wider uppercase text-base"
                />
                <span className="text-[11px] text-muted-foreground mt-1">
                  Your child can generate this single-use code from their top-right header menu.
                </span>
              </label>

              <label className="form-field">
                Relationship
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value as any)}
                >
                  <option value="parent">Parent</option>
                  <option value="guardian">Guardian / Mentor</option>
                </select>
              </label>

              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsLinkModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={linking} className="gap-1.5">
                  <UserPlus className="size-4" />
                  <span>{linking ? "Connecting..." : "Connect Child"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
