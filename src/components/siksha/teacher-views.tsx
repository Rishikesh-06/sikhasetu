import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardCheck,
  Filter,
  Info,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Users,
  Sparkles,
  AlertTriangle,
  GraduationCap,
  Plus,
  School as SchoolIcon,
  CheckCircle2,
  Clock3
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppShell } from "./app-shell";
import { DemoNote, Insight, SectionHead, Stat } from "./page-elements";
import { MasteryBar, StatusBadge } from "./status";
import { teacherApi, type CreateAssessmentPayload } from "@/services/api/teacher-api";
import type {
  TeacherOverviewData,
  TeacherStudentItem,
  TeacherStudentDetail,
  LearningGroupItem,
  TeacherClassroomItem,
  TeacherAssessmentItem
} from "@/data/types";
import { getCurriculumTopics } from "@/data/curriculum";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ==========================================
// 1. TEACHER CLASS OVERVIEW
// ==========================================
export function TeacherHome() {
  const [classrooms, setClassrooms] = useState<TeacherClassroomItem[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [data, setData] = useState<TeacherOverviewData | null>(null);
  const [students, setStudents] = useState<TeacherStudentItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<TeacherStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Load teacher classrooms
  useEffect(() => {
    teacherApi.getClassrooms().then((res) => {
      setClassrooms(res.classrooms || []);
      if (res.classrooms && res.classrooms.length > 0) {
        setSelectedClassroomId(res.classrooms[0].classroomId);
      }
    }).catch(() => null);
  }, []);

  // 2. Load overview data and students for selected classroom
  useEffect(() => {
    if (!selectedClassroomId) return;
    setLoading(true);

    const selectedCls = classrooms.find((c) => c.classroomId === selectedClassroomId);
    const cl = selectedCls?.classLevel || 7;

    Promise.all([
      teacherApi.getOverview(cl, selectedClassroomId).catch(() => null),
      teacherApi.getStudents(cl, selectedClassroomId).catch(() => ({ students: [] }))
    ]).then(([overviewData, studentsData]) => {
      if (overviewData) setData(overviewData);
      if (studentsData) setStudents(studentsData.students || []);
    }).finally(() => setLoading(false));
  }, [selectedClassroomId, classrooms]);

  // 3. Load student detail modal
  useEffect(() => {
    if (selectedStudentId) {
      teacherApi.getStudentDetail(selectedStudentId)
        .then(setStudentDetail)
        .catch(() => null);
    } else {
      setStudentDetail(null);
    }
  }, [selectedStudentId]);

  const groupA = data?.groupDistribution.find((g) => g.group === "GROUP_A")?.count || 0;
  const groupB = data?.groupDistribution.find((g) => g.group === "GROUP_B")?.count || 0;
  const groupC = data?.groupDistribution.find((g) => g.group === "GROUP_C")?.count || 0;

  const currentClassroom = classrooms.find((c) => c.classroomId === selectedClassroomId);

  return (
    <AppShell
      role="teacher"
      title="Class Overview"
      eyebrow="Classroom Intelligence"
      actions={
        <div className="flex items-center gap-2">
          {classrooms.length > 0 && (
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground outline-none shadow-sm"
            >
              {classrooms.map((c) => (
                <option key={c.classroomId} value={c.classroomId}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          <Button asChild size="sm">
            <Link to="/teacher/assessment">
              <Plus className="mr-1 size-4" /> Create Adaptive Assessment
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Pedagogical Grouping Notice */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-primary shrink-0" />
            <span>
              <strong>Pedagogical Principle:</strong> Learning groups help personalize instructional support and assessment difficulty. They are not student rankings.
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-primary/10">
            {currentClassroom?.schoolName || "Delhi Public School"}
          </span>
        </div>

        {/* Top KPI Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Stat
            label="Total Enrolled"
            value={String(data?.totalStudents || students.length || 0)}
            detail={`Class ${currentClassroom?.classLevel || 7}-${currentClassroom?.section || "A"} Roster`}
          />
          <Stat
            label="Diagnostic Complete"
            value={`${data?.diagnosticCompletionRate || 100}%`}
            detail={`${data?.completedDiagnostics || students.length} / ${data?.totalStudents || students.length} Assessed`}
            tone="good"
          />
          <Stat
            label="Group A (Foundation)"
            value={String(groupA)}
            detail="0–50 Normalized Score"
            tone="warn"
          />
          <Stat
            label="Group B (Developing)"
            value={String(groupB)}
            detail="51–70 Normalized Score"
          />
          <Stat
            label="Group C (Advanced)"
            value={String(groupC)}
            detail="71–100 Normalized Score"
            tone="good"
          />
        </div>

        {/* Live Classroom Student Roster */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-panel space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">Classroom Student Roster</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live students enrolled in {currentClassroom?.label || "Classroom"}. Click a student to inspect learning evidence.
              </p>
            </div>
            <span className="text-xs font-semibold text-primary">
              {students.length} Students Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Diagnostic Score</th>
                  <th className="py-3 px-4">Instructional Group</th>
                  <th className="py-3 px-4">Subject Mastery (Math / Sci / Eng)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-foreground flex items-center gap-2.5">
                      <span className="size-7 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold grid place-items-center">
                        {s.initials}
                      </span>
                      <span>{s.name}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {s.diagnosticScore !== null ? (
                        <span className="font-mono font-bold text-foreground">{s.diagnosticScore} / 100</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending Check</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                        s.group.code === "GROUP_A" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                        s.group.code === "GROUP_B" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {s.group.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                      {s.subjectScores?.Mathematics || 60}% · {s.subjectScores?.Science || 60}% · {s.subjectScores?.English || 60}%
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStudentId(s.id)}
                        className="text-xs text-primary hover:text-primary"
                      >
                        Inspect Evidence →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Priority Skills Needing Support */}
        {data?.prioritySkills && data.prioritySkills.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-panel">
            <h3 className="font-display text-xl font-bold text-foreground mb-4">Priority Skills Needing Support</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {data.prioritySkills.map((ps) => (
                <div key={ps.skill} className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-primary">
                    <span>{ps.subject}</span>
                    <span className="text-amber-500">{ps.studentsNeedingSupport} Students</span>
                  </div>
                  <p className="font-display font-bold text-base text-foreground">{ps.skill}</p>
                  <p className="text-xs text-muted-foreground">Average Mastery: {ps.averageMastery}%</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Student Evidence Detail Modal */}
      {selectedStudentId && studentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl space-y-6">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Student Evidence Profile</span>
                <h2 className="font-display text-2xl font-bold text-foreground">{studentDetail.student.name}</h2>
                <p className="text-xs text-muted-foreground">{studentDetail.student.school} · Class {studentDetail.student.classLevel}</p>
              </div>
              <button
                onClick={() => setSelectedStudentId(null)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {studentDetail.diagnostic && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-primary">Authoritative Diagnostic Baseline</span>
                  <span className="font-mono font-bold text-sm text-foreground">{studentDetail.diagnostic.normalizedScore} / 100</span>
                </div>
                <p className="text-xs font-semibold text-foreground">
                  Instructional Tier: <strong>{studentDetail.diagnostic.group.label}</strong>
                </p>
                <p className="text-xs text-muted-foreground">{studentDetail.diagnostic.group.instructionalFocus}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-foreground mb-2">Sub-skill Evidence Breakdown</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {studentDetail.learningEvidence?.map((e) => (
                  <div key={e.skill} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/40 border border-border">
                    <div>
                      <p className="font-medium text-foreground">{e.skill}</p>
                      <p className="text-[10px] text-muted-foreground">{e.subject} · {e.topic}</p>
                    </div>
                    <span className="font-bold text-primary">{e.masteryScore}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={() => setSelectedStudentId(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ==========================================
// 2. TEACHER AUTOMATIC ADAPTIVE ASSESSMENT
// ==========================================
export function TeacherAdaptiveAssessment() {
  const [classrooms, setClassrooms] = useState<TeacherClassroomItem[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [assessments, setAssessments] = useState<TeacherAssessmentItem[]>([]);
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("Polynomials");
  const [customTopic, setCustomTopic] = useState("");
  const [title, setTitle] = useState("Class 9 Mathematics — Adaptive Check");
  const [questionCount, setQuestionCount] = useState(5);
  const [durationMins, setDurationMins] = useState(15);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAssessmentResults, setSelectedAssessmentResults] = useState<any | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  const selectedCls = useMemo(() => {
    return classrooms.find((c) => c.classroomId === selectedClassroomId) || classrooms[0];
  }, [classrooms, selectedClassroomId]);

  const activeClassLevel = selectedCls?.classLevel || 9;

  const availableTopics = useMemo(() => {
    return getCurriculumTopics(activeClassLevel, subject);
  }, [activeClassLevel, subject]);

  // Update default topic and title when classroom or subject changes
  useEffect(() => {
    if (availableTopics.length > 0) {
      const defaultTopic = availableTopics[0];
      setTopic(defaultTopic);
      setTitle(`Class ${activeClassLevel} ${subject} — ${defaultTopic}`);
    }
  }, [activeClassLevel, subject, availableTopics]);

  const loadData = async () => {
    try {
      const [clsRes, asmtRes] = await Promise.all([
        teacherApi.getClassrooms().catch(() => ({ classrooms: [] })),
        teacherApi.getAssessments(activeClassLevel).catch(() => ({ assessments: [] }))
      ]);
      setClassrooms(clsRes.classrooms || []);
      if (clsRes.classrooms && clsRes.classrooms.length > 0 && !selectedClassroomId) {
        setSelectedClassroomId(clsRes.classrooms[0].classroomId);
      }
      setAssessments(asmtRes.assessments || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTopicSelect = (val: string) => {
    setTopic(val);
    if (val !== "CUSTOM") {
      setTitle(`Class ${activeClassLevel} ${subject} — ${val}`);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTopic = topic === "CUSTOM" ? customTopic.trim() : topic;
    if (!finalTopic) {
      toast.error("Please specify a curriculum topic");
      return;
    }
    if (!title.trim()) {
      toast.error("Please provide an assessment title");
      return;
    }

    setLoading(true);
    try {
      const res = await teacherApi.createAssessment({
        classroomId: selectedClassroomId || selectedCls?.classroomId,
        classLevel: activeClassLevel,
        subject,
        topics: [finalTopic],
        title: title.trim(),
        purpose: "Formative Adaptive Check",
        questionCount,
        instructions: instructions.trim() || undefined
      });

      toast.success(res.message || `Created assessment with 3 personalized tiers for ${res.result?.assignedCount} students!`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Question generation is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = async (asmtId: string) => {
    setLoadingResults(true);
    try {
      const data = await teacherApi.getAssessmentResults(asmtId);
      setSelectedAssessmentResults(data);
    } catch (err: any) {
      toast.error(err.message || "Failed fetching assessment results");
    } finally {
      setLoadingResults(false);
    }
  };

  return (
    <AppShell role="teacher" title="Adaptive Assessments" eyebrow="Teacher $\rightarrow$ Grok AI $\rightarrow$ 3-Tier Personalization">
      <div className="space-y-10">
        {/* Assessment Creation Wizard */}
        <section className="rounded-2xl border-2 border-primary/30 bg-card p-6 md:p-8 shadow-panel space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-2">
                <Sparkles className="size-3.5" /> Grok AI Adaptive Generation
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Create ONE Assessment $\rightarrow$ Three Personalized Difficulty Sets
              </h2>
              <p className="mt-1 text-xs md:text-sm text-muted-foreground leading-relaxed">
                You configure the class, subject, and topic once. Grok AI automatically generates 3 calibrated question tiers: <strong>Group A (Foundation)</strong>, <strong>Group B (Moderate)</strong>, and <strong>Group C (Advanced)</strong>.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Enrolled Classroom</span>
              <span className="font-bold text-foreground text-sm">{selectedCls?.label || "Classroom"}</span>
            </div>
          </div>

          <form onSubmit={handleCreateAssessment} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* STEP 1: CLASSROOM */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <SchoolIcon className="size-3.5 text-primary" /> Step 1: Classroom
                </label>
                <select
                  value={selectedClassroomId}
                  onChange={(e) => setSelectedClassroomId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                >
                  {classrooms.map((c) => (
                    <option key={c.classroomId} value={c.classroomId}>{c.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">Assigned to: {selectedCls?.schoolName || "DPS"}</p>
              </div>

              {/* STEP 2: SUBJECT */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="size-3.5 text-primary" /> Step 2: Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                </select>
                <p className="text-[11px] text-muted-foreground">Class {activeClassLevel} curriculum</p>
              </div>

              {/* STEP 3: TOPIC */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="size-3.5 text-primary" /> Step 3: Class {activeClassLevel} Topic
                </label>
                <select
                  value={topic}
                  onChange={(e) => handleTopicSelect(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                >
                  {availableTopics.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="CUSTOM">+ Custom / Specific Topic</option>
                </select>
                {topic === "CUSTOM" && (
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="Enter custom topic..."
                    className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                )}
              </div>

              {/* STEP 4: QUESTION COUNT & DURATION */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock3 className="size-3.5 text-primary" /> Step 4: Questions & Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none shadow-sm"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                  </select>
                  <select
                    value={durationMins}
                    onChange={(e) => setDurationMins(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none shadow-sm"
                  >
                    <option value={10}>10 Mins</option>
                    <option value={15}>15 Mins</option>
                    <option value={20}>20 Mins</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Assessment Title & Optional Instructions */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assessment Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Class 9 Algebra Mid-Term Adaptive Check"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Optional Grok Instructions</label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Focus on word problems & factorization"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none shadow-sm"
                />
              </div>
            </div>

            {/* Action Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="size-4 text-primary shrink-0" />
                <span>
                  <strong>Cost-Optimized Backend:</strong> Calls Grok at most 3 times (1 per group tier) and assigns questions to students based on diagnostic readiness.
                </span>
              </div>

              <Button type="submit" size="lg" className="w-full sm:w-auto px-8 font-bold" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="size-4 animate-spin text-amber-300" />
                    Generating 3 Tiers with Grok AI...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="size-4" />
                    Generate Adaptive Assessment
                  </span>
                )}
              </Button>
            </div>
          </form>
        </section>

        {/* Classroom Completion Analytics */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">Classroom Adaptive Assessments</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live completion breakdown and personalized group assignments from PostgreSQL.
              </p>
            </div>
            <span className="text-xs font-semibold text-primary">{assessments.length} Assessments Active</span>
          </div>

          {assessments.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card">
              <ClipboardCheck className="size-10 mx-auto text-muted-foreground mb-3" />
              <h4 className="font-bold text-foreground">No assessments created yet</h4>
              <p className="text-xs text-muted-foreground mt-1">Use the generator above to create your first 3-way personalized test.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {assessments.map((a) => (
                <div key={a.id} className="rounded-xl border border-border bg-card p-5 shadow-panel space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-primary mb-2">
                      <span className="px-2 py-0.5 rounded bg-primary/10">{a.subject} · Class {a.classLevel}</span>
                      <span className="text-muted-foreground">{a.questionCount} Qs / Student</span>
                    </div>
                    <h4 className="font-display text-lg font-bold text-foreground">{a.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{a.topics?.join(", ")}</p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Classroom Completion</span>
                      <span className="text-foreground font-bold">{a.stats.completionRate}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${a.stats.completionRate}%` }} />
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                      <div className="p-2 rounded-lg bg-muted/40 border border-border">
                        <p className="text-muted-foreground font-bold">Assigned</p>
                        <p className="font-bold text-foreground text-sm mt-0.5">{a.stats.assignedCount}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-success/10 border border-success/20 text-success">
                        <p className="font-bold">Done</p>
                        <p className="font-bold text-sm mt-0.5">{a.stats.completedCount}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                        <p className="font-bold">Started</p>
                        <p className="font-bold text-sm mt-0.5">{a.stats.inProgressCount}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/40 border border-border text-muted-foreground">
                        <p className="font-bold">Pending</p>
                        <p className="font-bold text-sm mt-0.5">{a.stats.notStartedCount}</p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => handleViewResults(a.id)}
                    >
                      View Student Results & Tiers <ChevronRight className="ml-1 size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Assessment Results Modal */}
        {selectedAssessmentResults && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-primary/10">
                    {selectedAssessmentResults.subject} · Class {selectedAssessmentResults.classLevel}
                  </span>
                  <h3 className="font-display text-xl font-bold text-foreground mt-1">
                    {selectedAssessmentResults.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Individual student submissions and diagnostic group assignments.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedAssessmentResults(null)}>
                  Close
                </Button>
              </div>

              {/* Group Distribution Pill */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground font-bold">Group A (Foundation)</p>
                  <p className="font-display text-lg font-bold text-amber-600 mt-0.5">{selectedAssessmentResults.stats?.groupA || 0} Students</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground font-bold">Group B (Moderate)</p>
                  <p className="font-display text-lg font-bold text-primary mt-0.5">{selectedAssessmentResults.stats?.groupB || 0} Students</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground font-bold">Group C (Advanced)</p>
                  <p className="font-display text-lg font-bold text-success mt-0.5">{selectedAssessmentResults.stats?.groupC || 0} Students</p>
                </div>
              </div>

              {/* Student Table */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Diagnostic Tier</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedAssessmentResults.results?.map((r: any) => (
                      <tr key={r.assignmentId} className="hover:bg-muted/20">
                        <td className="py-3 px-3 font-semibold text-foreground">{r.studentName}</td>
                        <td className="py-3 px-3">
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                            r.groupType === "GROUP_A" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                            r.groupType === "GROUP_C" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                            "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          )}>
                            {r.groupType}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={cn(
                            "text-xs font-semibold",
                            r.status === "submitted" ? "text-success flex items-center gap-1" :
                            r.status === "in_progress" ? "text-primary" : "text-muted-foreground"
                          )}>
                            {r.status === "submitted" && <CheckCircle2 className="size-3.5" />}
                            {r.status === "submitted" ? "Completed" : r.status === "in_progress" ? "In Progress" : "Not Started"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-foreground">
                          {r.score !== null ? `${r.score} / ${r.maxScore} (${r.percentage}%)` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ==========================================
// 3. TEACHER DETAILED REPORTS
// ==========================================
export function TeacherReports() {
  const [reportsData, setReportsData] = useState<any>(null);
  const [classrooms, setClassrooms] = useState<TeacherClassroomItem[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");

  useEffect(() => {
    teacherApi.getClassrooms().then((res) => {
      setClassrooms(res.classrooms || []);
      if (res.classrooms && res.classrooms.length > 0) {
        setSelectedClassroomId(res.classrooms[0].classroomId);
      }
    }).catch(() => null);
  }, []);

  useEffect(() => {
    if (selectedClassroomId) {
      const cl = classrooms.find((c) => c.classroomId === selectedClassroomId)?.classLevel || 7;
      teacherApi.getReports(cl, selectedClassroomId).then(setReportsData).catch(() => null);
    }
  }, [selectedClassroomId, classrooms]);

  return (
    <AppShell role="teacher" title="Detailed Reports" eyebrow="Classroom Intelligence">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Multi-Dimensional Growth & Diagnostic Reports</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Analyze student growth trends, mastery distribution, and skill gaps across classrooms.
            </p>
          </div>

          {classrooms.length > 0 && (
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground outline-none shadow-sm"
            >
              {classrooms.map((c) => (
                <option key={c.classroomId} value={c.classroomId}>{c.label}</option>
              ))}
            </select>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportsData?.studentReports?.map((sr: any) => (
            <div key={sr.studentId} className="rounded-xl border border-border bg-card p-5 shadow-panel space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-foreground">{sr.studentName}</h3>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                  sr.groupType === "GROUP_A" ? "bg-amber-500/10 text-amber-600" :
                  sr.groupType === "GROUP_B" ? "bg-blue-500/10 text-blue-600" :
                  "bg-emerald-500/10 text-emerald-600"
                )}>
                  {sr.groupType.replace("GROUP_", "Group ")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-muted/40">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Diagnostic Score</p>
                  <p className="font-bold text-foreground text-sm mt-0.5">{sr.diagnosticScore ?? "N/A"}</p>
                </div>
                <div className="p-2 rounded bg-muted/40">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Skills Mastered</p>
                  <p className="font-bold text-success text-sm mt-0.5">{sr.skillsMastered} Skills</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Subject Progress</p>
                <div className="space-y-1">
                  {sr.subjectProgress?.map((sp: any) => (
                    <div key={sp.subject} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{sp.subject}</span>
                      <span className="font-bold text-foreground">{sp.score}% (+{sp.growth}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
