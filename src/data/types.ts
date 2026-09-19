// SIKHASETU TypeScript Data Interfaces

export type UserRole = "student" | "teacher" | "parent";

export interface School {
  id: string;
  name: string;
  location?: string;
  school_code?: string;
}

export interface Classroom {
  id: string;
  schoolId: string;
  classLevel: number;
  section: string;
  academicYear?: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  profileId: string;
  name: string;
  school?: string;
  schoolId?: string;
  classLevel?: number;
}

export type MasteryStatus = "Needs Support" | "Developing" | "Good" | "Strong";

export interface SkillMastery {
  name: string;
  topic?: string;
  score: number;
  status: MasteryStatus;
  evidenceCount?: number;
}

export interface SubjectProgressItem {
  subject: string;
  score: number;
  previousScore: number;
  growth: number;
  status?: MasteryStatus;
}

export interface DetailedSubjectProgress {
  subject: string;
  progressScore: number;
  previousScore: number;
  growth: number;
  strengthenedSkills: Array<{ skill: string; mastery: number; status: MasteryStatus }>;
  developingSkills: Array<{ skill: string; mastery: number; status: MasteryStatus }>;
  nextRecommendedSkill: string;
  recentActivityCount: number;
}

export interface StudentClassroomInfo {
  school: string;
  schoolId?: string;
  classLevel: number;
  section: string;
  classroomId?: string;
  teachers: Array<{ name: string; subject: string; email: string }>;
}

export type LearningPathNodeState = "complete" | "active" | "next" | "locked" | "needs_attention";

export interface LearningPathNode {
  id: string;
  type: "grade" | "diagnostic" | "subject" | "skill" | "assessment" | "recommendation" | "target";
  label: string;
  title: string;
  detail: string;
  subject?: string;
  topic?: string;
  skill?: string;
  progress?: number;
  score?: number;
  status: LearningPathNodeState;
  x: number;
  y: number;
  evidenceSummary?: string;
  reason?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface LearningPathData {
  student: {
    id: string;
    name: string;
    school: string;
    classLevel: number;
    section?: string;
    xp: number;
    diagnosticStatus: "completed" | "in_progress" | "not_started";
    diagnosticCompletedAt?: string;
  };
  hasSufficientEvidence: boolean;
  emptyStateMessage?: string;
  summary: {
    totalNodes: number;
    completedCount: number;
    activeCount: number;
    needsAttentionCount: number;
    overallMastery: number;
  };
  nodes: LearningPathNode[];
}

export interface ConstellationNode {
  label: string;
  detail: string;
  x: number;
  y: number;
  state: "complete" | "active" | "next";
}

export interface StudentProfileData {
  student: {
    id: string;
    name: string;
    school: string;
    classLevel: number;
    preferredLanguage: string;
    xp: number;
  };
  subjectProgress: SubjectProgressItem[];
  subjectSkills: Record<string, SkillMastery[]>;
  constellationNodes: ConstellationNode[];
}

export interface QuestionData {
  id: string;
  classLevel?: number;
  subject: string;
  topic: string;
  skill: string;
  questionText: string;
  questionType: "choice" | "short" | "reading" | "math" | "audio";
  contextPassage?: string;
  options: string[];
  marks: number;
}

export interface DiagnosticStartResponse {
  attemptId: string;
  classLevel: number;
  questionNumber: number;
  totalQuestions: number;
  question: QuestionData;
}

export interface DiagnosticAnswerResponse {
  isCompleted: boolean;
  questionNumber?: number;
  totalQuestions?: number;
  question?: QuestionData;
  summary?: {
    title: string;
    message: string;
    cta: string;
  };
}

export interface DiagnosticStatusResponse {
  status: "not_started" | "in_progress" | "completed";
  classLevel: number;
  school: string;
  attemptId?: string;
  questionNumber?: number;
  totalQuestions?: number;
  currentQuestion?: QuestionData | null;
  completedAt?: string;
}

export interface AssignedAssessment {
  assignmentId: string;
  assessmentId: string;
  title: string;
  subject: string;
  topics: string[];
  teacherName?: string;
  purpose: string;
  questionCount: number;
  status: "pending" | "in_progress" | "submitted";
  createdAt: string;
  result?: {
    score: number;
    maxScore: number;
    percentage: number;
    submittedAt: string;
  } | null;
}

export interface PracticeItem {
  id: string;
  title: string;
  subject: string;
  topic: string;
  skill: string;
  minutes: number;
  level: string;
  progress: number;
}

export interface PracticeQuestion {
  id: string;
  questionText: string;
  text?: string;
  options: string[];
  type?: string;
  questionType?: string;
  subject?: string;
  topic?: string;
  skill?: string;
  contextPassage?: string | null;
  marks?: number;
}

export interface PracticeSessionData {
  practiceId: string;
  title: string;
  subject: string;
  topic: string;
  skill: string;
  questions: PracticeQuestion[];
}

export interface PracticeSubmitResponse {
  success: boolean;
  score: number;
  totalQuestions: number;
  percentage: number;
  xpEarned: number;
  results: Array<{
    questionId: string;
    isCorrect: boolean;
    explanation?: string;
    studentAnswer?: string;
  }>;
  progressUpdates: Array<{
    subject: string;
    progressScore: number;
    growth: number;
  }>;
}

export interface QuizSessionData {
  attemptId: string;
  quizId?: string;
  quizTitle: string;
  quizType: "quick" | "topic" | "subject" | "challenge";
  subject: string;
  topic?: string;
  timeLimitMinutes: number;
  totalQuestions: number;
  questions: PracticeQuestion[];
}

export interface QuizSubmitResponse {
  success: boolean;
  score: number;
  totalQuestions: number;
  percentage: number;
  xpEarned: number;
  results: Array<{
    questionId: string;
    isCorrect: boolean;
    explanation?: string;
  }>;
  newlyUnlocked?: Array<{
    code: string;
    title: string;
    xpReward: number;
  }>;
}

export interface AchievementItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: "STREAKS" | "MASTERY" | "PRACTICE" | "QUIZZES" | "ASSESSMENTS" | "MILESTONES";
  icon: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progressText: string;
  progressPercent: number;
}

export interface AchievementStats {
  totalXp: number;
  streakDays: number;
  achievementsUnlocked: number;
  totalAchievements: number;
  learningLevel: number;
}

export interface AchievementsResponse {
  stats: AchievementStats;
  featuredAchievement: AchievementItem | null;
  categories: string[];
  achievements: AchievementItem[];
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  activeDays: number[];
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  xp: number;
  badge: string;
}

export interface StudentProgressData {
  streak: StreakInfo;
  achievements: any[];
  activities: Array<{ id: string; type: string; title: string; xp: number; date: string }>;
  friendlyLeaderboard: LeaderboardEntry[];
  subjectProgress: SubjectProgressItem[];
}

// Friendly Fire Competition Interfaces
export interface CompetitionClassmate {
  studentId: string;
  name: string;
  classLevel: number;
  school: string;
  xp: number;
  streak: number;
  connectionStatus: "none" | "pending" | "accepted" | "declined";
  isRequester: boolean;
  connectionId?: string | null;
}

export interface ActiveCompetitor {
  connectionId: string;
  competitorId: string;
  name: string;
  xp: number;
  streak: number;
  acceptedAt?: string;
}

export interface PendingChallenge {
  connectionId: string;
  competitorId: string;
  name: string;
  createdAt: string;
}

export interface CompetitionOverview {
  competitors: ActiveCompetitor[];
  pendingIncoming: PendingChallenge[];
  pendingOutgoing: PendingChallenge[];
}

// Teacher Types
export interface TeacherClassroomItem {
  classroomId: string;
  schoolId: string;
  schoolName: string;
  classLevel: number;
  section: string;
  subject: string;
  label: string;
}

export interface TeacherOverviewData {
  classLevel: number;
  classroomId?: string;
  totalStudents: number;
  completedDiagnostics: number;
  diagnosticCompletionRate: number;
  groupDistribution: Array<{
    group: string;
    name: string;
    label: string;
    count: number;
    color: "support" | "warning" | "success";
  }>;
  subjectAverages: Record<string, number>;
  activeAssessments: number;
  prioritySkills: Array<{
    skill: string;
    subject: string;
    studentsNeedingSupport: number;
    averageMastery: number;
  }>;
  pedagogicalNotice?: string;
}

export interface TeacherStudentItem {
  id: string;
  name: string;
  email: string;
  school: string;
  classLevel: number;
  xp: number;
  initials: string;
  diagnosticStatus: "completed" | "pending";
  diagnosticScore: number | null;
  group: {
    code: "GROUP_A" | "GROUP_B" | "GROUP_C";
    label: string;
    badgeColor: string;
    description: string;
  };
  subjectScores: Record<string, number>;
}

export interface TeacherStudentDetail {
  student: {
    id: string;
    name: string;
    email: string;
    school: string;
    classLevel: number;
    xp: number;
    initials: string;
  };
  diagnostic: {
    normalizedScore: number;
    rawScore: number;
    maxScore: number;
    completedAt: string;
    group: {
      code: "GROUP_A" | "GROUP_B" | "GROUP_C";
      label: string;
      badgeColor: string;
      description: string;
      instructionalFocus: string;
    };
    subjectScores: Record<string, number>;
  } | null;
  learningEvidence: Array<{
    subject: string;
    topic: string;
    skill: string;
    masteryScore: number;
    status: MasteryStatus;
    evidenceCount: number;
  }>;
  subjectProgress: Array<{
    subject: string;
    progressScore: number;
    previousScore: number;
    growth: number;
  }>;
  assessmentHistory: Array<{
    id: string;
    title: string;
    subject: string;
    score: number;
    maxScore: number;
    percentage: number;
    submittedAt: string;
  }>;
}

export interface TeacherAssessmentItem {
  id: string;
  title: string;
  classLevel: number;
  classroomId?: string;
  subject: string;
  topics: string[];
  purpose: string;
  questionCount: number;
  adaptiveMode: boolean;
  createdAt: string;
  stats: {
    assignedCount: number;
    completedCount: number;
    inProgressCount: number;
    notStartedCount: number;
    completionRate: number;
  };
}

export interface LearningGroupItem {
  groupCode: "GROUP_A" | "GROUP_B" | "GROUP_C";
  name: string;
  badgeColor: string;
  scoreRange: string;
  description: string;
  instructionalFocus: string;
  recommendedSupport: string;
  studentCount: number;
  students: Array<{ id: string; name: string; diagnosticScore: number | null; initials: string }>;
}

// Parent & Secure Parent-Child Linking Types
export interface ParentChildSummary {
  id: string;
  name: string;
  classLevel: number;
  school: string;
  relationshipType: "parent" | "guardian";
  verifiedAt: string;
}

export interface ParentOverviewData {
  student: {
    id: string;
    name: string;
    classLevel: number;
    school: string;
    relationshipType?: string;
  };
  overallMastery: number | null;
  overallGrowth: number | null;
  hasData: boolean;
  subjects: Array<{
    subject: string;
    score: number;
    growth: number;
    status: MasteryStatus;
  }>;
  streak: {
    currentStreak: number;
    longestStreak?: number;
    activeDays: number[];
  };
  recentActivities: Array<{ id: string; title: string; type?: string; date: string; xp?: number }>;
  recentAssessments?: Array<{
    id: string;
    title: string;
    subject: string;
    topics: string[];
    date: string;
    percentage: number;
    score: number;
    maxScore: number;
  }>;
  milestones: Array<{ id?: string; title: string; description: string; date: string; xpReward?: number }>;
  areasRequiringAttention?: Array<{
    subject: string;
    topic: string;
    skill: string;
    score: number;
    status: string;
  }>;
  nextFocus: string;
}

export interface ParentSubjectProgressData {
  student: {
    id: string;
    name: string;
    classLevel: number;
    school: string;
  };
  subjects: Array<{
    subject: string;
    progressScore: number | null;
    growth: number;
    status: string;
    topics: Array<{
      topic: string;
      skill: string;
      masteryScore: number;
      status: string;
      evidenceCount: number;
    }>;
  }>;
}

export interface ParentAssessmentItem {
  id: string;
  title: string;
  subject: string;
  topics: string[];
  purpose: string;
  submittedAt: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface ParentAchievementItem {
  id: string;
  badgeId: string;
  title: string;
  description: string;
  icon?: string;
  xpReward: number;
  unlockedAt: string;
}

export interface StudentParentCodeStatus {
  hasActiveCode: boolean;
  preview?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface StudentLinkedParent {
  relationshipId: string;
  parentProfileId: string;
  parentName: string;
  parentEmail: string;
  relationshipType: string;
  status: string;
  verifiedAt: string;
}
