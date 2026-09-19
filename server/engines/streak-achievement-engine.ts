import { query } from "../db";

export type AchievementCategory = "ALL" | "STREAKS" | "MASTERY" | "PRACTICE" | "QUIZZES" | "ASSESSMENTS" | "MILESTONES";

export interface AchievementDefinition {
  code: string;
  title: string;
  description: string;
  category: "STREAKS" | "MASTERY" | "PRACTICE" | "QUIZZES" | "ASSESSMENTS" | "MILESTONES";
  iconName: string;
  xpReward: number;
  requirementType: "activity_count" | "diagnostic_done" | "streak_days" | "practice_count" | "quiz_count" | "perfect_score" | "skill_mastery" | "subject_mastery" | "daily_momentum";
  requirementTarget: number;
  unit: string;
}

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    code: "FIRST_STEP",
    title: "First Step",
    description: "Complete your first learning activity (diagnostic, practice, or quiz).",
    category: "MILESTONES",
    iconName: "Footprints",
    xpReward: 25,
    requirementType: "activity_count",
    requirementTarget: 1,
    unit: "activities"
  },
  {
    code: "DIAGNOSTIC_READY",
    title: "Baseline Explorer",
    description: "Complete your initial adaptive diagnostic learning check.",
    category: "MILESTONES",
    iconName: "Compass",
    xpReward: 50,
    requirementType: "diagnostic_done",
    requirementTarget: 1,
    unit: "diagnostic"
  },
  {
    code: "STREAK_3",
    title: "Streak Starter",
    description: "Maintain a 3-day consecutive learning streak.",
    category: "STREAKS",
    iconName: "Flame",
    xpReward: 30,
    requirementType: "streak_days",
    requirementTarget: 3,
    unit: "days"
  },
  {
    code: "WEEK_WARRIOR",
    title: "7-Day Streak Warrior",
    description: "Learn consistently for 7 consecutive days.",
    category: "STREAKS",
    iconName: "Zap",
    xpReward: 75,
    requirementType: "streak_days",
    requirementTarget: 7,
    unit: "days"
  },
  {
    code: "STREAK_MASTER",
    title: "30-Day Master",
    description: "Achieve an impressive 30-day continuous learning streak.",
    category: "STREAKS",
    iconName: "Crown",
    xpReward: 200,
    requirementType: "streak_days",
    requirementTarget: 30,
    unit: "days"
  },
  {
    code: "PRACTICE_BUILDER",
    title: "Practice Builder",
    description: "Complete 5 focused skill booster practice sessions.",
    category: "PRACTICE",
    iconName: "Target",
    xpReward: 50,
    requirementType: "practice_count",
    requirementTarget: 5,
    unit: "sessions"
  },
  {
    code: "QUIZ_EXPLORER",
    title: "Quiz Explorer",
    description: "Successfully complete 5 learning quizzes or challenges.",
    category: "QUIZZES",
    iconName: "BookOpenCheck",
    xpReward: 50,
    requirementType: "quiz_count",
    requirementTarget: 5,
    unit: "quizzes"
  },
  {
    code: "PERFECT_SCORE",
    title: "Flawless Execution",
    description: "Achieve a perfect 100% score on any assessment or quiz.",
    category: "ASSESSMENTS",
    iconName: "Award",
    xpReward: 100,
    requirementType: "perfect_score",
    requirementTarget: 1,
    unit: "perfect tests"
  },
  {
    code: "SKILL_BUILDER",
    title: "Skill Champion",
    description: "Reach Strong mastery (≥80%) on any curriculum skill.",
    category: "MASTERY",
    iconName: "TrendingUp",
    xpReward: 50,
    requirementType: "skill_mastery",
    requirementTarget: 80,
    unit: "% mastery"
  },
  {
    code: "SUBJECT_MASTER",
    title: "Subject Laureate",
    description: "Reach Strong overall mastery (≥80%) across an entire subject.",
    category: "MASTERY",
    iconName: "Medal",
    xpReward: 100,
    requirementType: "subject_mastery",
    requirementTarget: 80,
    unit: "% mastery"
  },
  {
    code: "MOMENTUM_MAKER",
    title: "Learning Momentum",
    description: "Complete 3 learning activities in a single calendar day.",
    category: "MILESTONES",
    iconName: "Rocket",
    xpReward: 40,
    requirementType: "daily_momentum",
    requirementTarget: 3,
    unit: "activities today"
  }
];

export interface FormattedAchievement {
  code: string;
  title: string;
  description: string;
  category: "STREAKS" | "MASTERY" | "PRACTICE" | "QUIZZES" | "ASSESSMENTS" | "MILESTONES";
  iconName: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  progressLabel: string;
  unit: string;
}

export interface StudentAchievementsOverview {
  student: {
    id: string;
    name: string;
    school: string;
    classLevel: number;
    totalXp: number;
    learningLevel: {
      level: number;
      title: string;
      currentXp: number;
      nextLevelXp: number;
      progressPct: number;
    };
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string;
    activeDays: number[];
  };
  summary: {
    totalAchievements: number;
    unlockedCount: number;
    lockedCount: number;
    totalXpEarnedFromBadges: number;
  };
  featuredAchievement: FormattedAchievement;
  categories: string[];
  achievements: FormattedAchievement[];
}

export class StreakAchievementEngine {
  /**
   * Evaluates all achievement criteria against real database records and authoritatively awards XP
   */
  public static async evaluateAchievements(studentId: string): Promise<FormattedAchievement[]> {
    // 1. Gather all activity stats from PostgreSQL for this student
    const [
      diagRes,
      streakRes,
      pracRes,
      quizRes,
      asmtRes,
      evRes,
      spRes,
      actTodayRes,
      existingAchRes
    ] = await Promise.all([
      query(`SELECT COUNT(*) as cnt FROM diagnostic_results WHERE student_id = $1`, [studentId]),
      query(`SELECT * FROM student_streaks WHERE student_id = $1`, [studentId]),
      query(`SELECT COUNT(*) as cnt FROM practice_activities WHERE student_id = $1 AND (progress >= 80 OR completed_at IS NOT NULL)`, [studentId]),
      query(`SELECT COUNT(*) as cnt, COALESCE(MAX(percentage), 0) as max_pct FROM quiz_attempts WHERE student_id = $1`, [studentId]),
      query(`SELECT COUNT(*) as cnt, COALESCE(MAX(percentage), 0) as max_pct FROM assessment_attempts WHERE student_id = $1`, [studentId]),
      query(`SELECT COALESCE(MAX(mastery_score), 0) as max_score FROM learning_evidence WHERE student_id = $1`, [studentId]),
      query(`SELECT COALESCE(MAX(progress_score), 0) as max_score FROM subject_progress WHERE student_id = $1`, [studentId]),
      query(`SELECT COUNT(*) as cnt FROM activity_logs WHERE student_id = $1 AND DATE(activity_date) = CURRENT_DATE`, [studentId]),
      query(`SELECT * FROM student_achievements WHERE student_id = $1`, [studentId])
    ]);

    const diagnosticCount = Number(diagRes.rows[0]?.cnt || 0);
    const streakRow = streakRes.rows[0];
    const currentStreak = Number(streakRow?.current_streak || 1);
    const practiceCount = Number(pracRes.rows[0]?.cnt || 0);
    const quizCount = Number(quizRes.rows[0]?.cnt || 0);
    const maxQuizPct = Number(quizRes.rows[0]?.max_pct || 0);
    const asmtCount = Number(asmtRes.rows[0]?.cnt || 0);
    const maxAsmtPct = Number(asmtRes.rows[0]?.max_pct || 0);
    const maxSkillMastery = Number(evRes.rows[0]?.max_score || 0);
    const maxSubjectMastery = Number(spRes.rows[0]?.max_score || 0);
    const todayActivities = Number(actTodayRes.rows[0]?.cnt || 0);
    const totalActivities = diagnosticCount + practiceCount + quizCount + asmtCount;

    const existingUnlockedKeys = new Set(existingAchRes.rows.map(r => r.badge_key));
    const newlyUnlocked: FormattedAchievement[] = [];

    for (const def of ACHIEVEMENT_CATALOG) {
      let currentValue = 0;

      switch (def.requirementType) {
        case "activity_count":
          currentValue = totalActivities;
          break;
        case "diagnostic_done":
          currentValue = diagnosticCount;
          break;
        case "streak_days":
          currentValue = currentStreak;
          break;
        case "practice_count":
          currentValue = practiceCount;
          break;
        case "quiz_count":
          currentValue = quizCount;
          break;
        case "perfect_score":
          currentValue = (maxQuizPct >= 100 || maxAsmtPct >= 100) ? 1 : 0;
          break;
        case "skill_mastery":
          currentValue = maxSkillMastery;
          break;
        case "subject_mastery":
          currentValue = maxSubjectMastery;
          break;
        case "daily_momentum":
          currentValue = todayActivities;
          break;
      }

      const meetsRequirement = currentValue >= def.requirementTarget;

      if (meetsRequirement && !existingUnlockedKeys.has(def.code)) {
        // Unlock newly achieved badge
        const achId = `ach-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const unlockedAt = new Date().toISOString();

        // 1. Insert into student_achievements
        await query(
          `INSERT INTO student_achievements (id, student_id, badge_key, title, description, unlocked_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [achId, studentId, def.code, def.title, def.description, unlockedAt]
        );

        // 2. Authoritatively award XP to student_profiles
        await query(
          `UPDATE student_profiles SET xp = xp + $1 WHERE id = $2`,
          [def.xpReward, studentId]
        );

        // 3. Record in activity_logs
        const logId = `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        await query(
          `INSERT INTO activity_logs (id, student_id, activity_type, title, xp_earned, activity_date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [logId, studentId, "achievement_unlocked", `Unlocked ${def.title}`, def.xpReward, unlockedAt]
        );

        existingUnlockedKeys.add(def.code);

        newlyUnlocked.push({
          code: def.code,
          title: def.title,
          description: def.description,
          category: def.category,
          iconName: def.iconName,
          xpReward: def.xpReward,
          isUnlocked: true,
          unlockedAt,
          currentValue: def.requirementTarget,
          targetValue: def.requirementTarget,
          progressPercentage: 100,
          progressLabel: `Unlocked (${def.requirementTarget} / ${def.requirementTarget} ${def.unit})`,
          unit: def.unit
        });
      }
    }

    return newlyUnlocked;
  }

  /**
   * Fetches full gamified achievements overview for the student dashboard
   */
  public static async getStudentAchievements(studentId: string): Promise<StudentAchievementsOverview> {
    // Trigger evaluation first to ensure state is fresh
    await this.evaluateAchievements(studentId);

    // 1. Fetch Student Profile
    const profileRes = await query(`SELECT * FROM student_profiles WHERE id = $1`, [studentId]);
    if (profileRes.rows.length === 0) {
      throw new Error(`Student not found: ${studentId}`);
    }
    const student = profileRes.rows[0];
    const totalXp = Number(student.xp) || 0;

    // 2. Compute Learning Level
    const LEVEL_STEP = 150;
    const levelNumber = Math.max(1, Math.floor(totalXp / LEVEL_STEP) + 1);
    const levelTitles = [
      "Novice Learner",
      "Curious Scholar",
      "Concept Builder",
      "Knowledge Pioneer",
      "Master Strategist",
      "Virtuoso"
    ];
    const levelTitle = levelTitles[Math.min(levelNumber - 1, levelTitles.length - 1)];
    const currentLevelBaseXp = (levelNumber - 1) * LEVEL_STEP;
    const nextLevelXp = levelNumber * LEVEL_STEP;
    const xpIntoLevel = totalXp - currentLevelBaseXp;
    const levelProgressPct = Math.min(100, Math.round((xpIntoLevel / LEVEL_STEP) * 100));

    // 3. Fetch Streaks
    const streakRes = await query(`SELECT * FROM student_streaks WHERE student_id = $1`, [studentId]);
    const streakRow = streakRes.rows[0];
    let activeDays = [1, 1, 1, 1, 1, 0, 1];
    if (streakRow?.active_days) {
      try {
        activeDays = typeof streakRow.active_days === "string" ? JSON.parse(streakRow.active_days) : streakRow.active_days;
      } catch {
        activeDays = [1, 1, 1, 1, 1, 0, 1];
      }
    }
    const currentStreak = Number(streakRow?.current_streak || 1);
    const longestStreak = Number(streakRow?.longest_streak || currentStreak);

    // 4. Fetch Unlocked Achievements from Database
    const achRes = await query(`SELECT * FROM student_achievements WHERE student_id = $1 ORDER BY unlocked_at DESC`, [studentId]);
    const unlockedMap = new Map<string, any>();
    for (const r of achRes.rows) {
      unlockedMap.set(r.badge_key, r);
    }

    // 5. Query Activity Counts for Locked Progress
    const [
      diagRes,
      pracRes,
      quizRes,
      asmtRes,
      evRes,
      spRes,
      actTodayRes
    ] = await Promise.all([
      query(`SELECT COUNT(*) as cnt FROM diagnostic_results WHERE student_id = $1`, [studentId]),
      query(`SELECT COUNT(*) as cnt FROM practice_activities WHERE student_id = $1 AND (progress >= 80 OR completed_at IS NOT NULL)`, [studentId]),
      query(`SELECT COUNT(*) as cnt, COALESCE(MAX(percentage), 0) as max_pct FROM quiz_attempts WHERE student_id = $1`, [studentId]),
      query(`SELECT COUNT(*) as cnt, COALESCE(MAX(percentage), 0) as max_pct FROM assessment_attempts WHERE student_id = $1`, [studentId]),
      query(`SELECT COALESCE(MAX(mastery_score), 0) as max_score FROM learning_evidence WHERE student_id = $1`, [studentId]),
      query(`SELECT COALESCE(MAX(progress_score), 0) as max_score FROM subject_progress WHERE student_id = $1`, [studentId]),
      query(`SELECT COUNT(*) as cnt FROM activity_logs WHERE student_id = $1 AND DATE(activity_date) = CURRENT_DATE`, [studentId])
    ]);

    const diagnosticCount = Number(diagRes.rows[0]?.cnt || 0);
    const practiceCount = Number(pracRes.rows[0]?.cnt || 0);
    const quizCount = Number(quizRes.rows[0]?.cnt || 0);
    const maxQuizPct = Number(quizRes.rows[0]?.max_pct || 0);
    const asmtCount = Number(asmtRes.rows[0]?.cnt || 0);
    const maxAsmtPct = Number(asmtRes.rows[0]?.max_pct || 0);
    const maxSkillMastery = Number(evRes.rows[0]?.max_score || 0);
    const maxSubjectMastery = Number(spRes.rows[0]?.max_score || 0);
    const todayActivities = Number(actTodayRes.rows[0]?.cnt || 0);
    const totalActivities = diagnosticCount + practiceCount + quizCount + asmtCount;

    // 6. Map all definitions to formatted achievements
    const achievements: FormattedAchievement[] = ACHIEVEMENT_CATALOG.map(def => {
      const unlocked = unlockedMap.get(def.code);
      const isUnlocked = Boolean(unlocked);

      let currentValue = 0;
      switch (def.requirementType) {
        case "activity_count":
          currentValue = totalActivities;
          break;
        case "diagnostic_done":
          currentValue = diagnosticCount;
          break;
        case "streak_days":
          currentValue = currentStreak;
          break;
        case "practice_count":
          currentValue = practiceCount;
          break;
        case "quiz_count":
          currentValue = quizCount;
          break;
        case "perfect_score":
          currentValue = (maxQuizPct >= 100 || maxAsmtPct >= 100) ? 1 : 0;
          break;
        case "skill_mastery":
          currentValue = maxSkillMastery;
          break;
        case "subject_mastery":
          currentValue = maxSubjectMastery;
          break;
        case "daily_momentum":
          currentValue = todayActivities;
          break;
      }

      const progressPercentage = isUnlocked
        ? 100
        : Math.min(100, Math.round((currentValue / def.requirementTarget) * 100));

      const progressLabel = isUnlocked
        ? `Unlocked · ${def.requirementTarget} / ${def.requirementTarget} ${def.unit}`
        : `${Math.min(currentValue, def.requirementTarget)} / ${def.requirementTarget} ${def.unit}`;

      return {
        code: def.code,
        title: def.title,
        description: def.description,
        category: def.category,
        iconName: def.iconName,
        xpReward: def.xpReward,
        isUnlocked,
        unlockedAt: unlocked?.unlocked_at,
        currentValue,
        targetValue: def.requirementTarget,
        progressPercentage,
        progressLabel,
        unit: def.unit
      };
    });

    const unlockedList = achievements.filter(a => a.isUnlocked);
    const lockedList = achievements.filter(a => !a.isUnlocked);

    // Featured achievement: latest unlocked, or the locked achievement closest to completion
    let featuredAchievement: FormattedAchievement;
    if (unlockedList.length > 0) {
      featuredAchievement = unlockedList[0];
    } else {
      const sortedLocked = [...lockedList].sort((a, b) => b.progressPercentage - a.progressPercentage);
      featuredAchievement = sortedLocked[0] || achievements[0];
    }

    const totalXpEarnedFromBadges = unlockedList.reduce((sum, a) => sum + a.xpReward, 0);

    return {
      student: {
        id: student.id,
        name: student.name,
        school: student.school,
        classLevel: student.class_level,
        totalXp,
        learningLevel: {
          level: levelNumber,
          title: levelTitle,
          currentXp: totalXp,
          nextLevelXp,
          progressPct: levelProgressPct
        }
      },
      streak: {
        currentStreak,
        longestStreak,
        lastActivityDate: streakRow?.last_activity_date || new Date().toISOString().split("T")[0],
        activeDays
      },
      summary: {
        totalAchievements: achievements.length,
        unlockedCount: unlockedList.length,
        lockedCount: lockedList.length,
        totalXpEarnedFromBadges
      },
      featuredAchievement,
      categories: ["ALL", "STREAKS", "MASTERY", "PRACTICE", "QUIZZES", "ASSESSMENTS", "MILESTONES"],
      achievements
    };
  }

  /**
   * Friendly competition leaderboard (never exposes diagnostic group/scores)
   */
  public static async getFriendlyLeaderboard(studentId: string) {
    const res = await query(
      `SELECT id, name, xp, school FROM student_profiles ORDER BY xp DESC LIMIT 10`
    );

    return res.rows.map((std, idx) => ({
      rank: idx + 1,
      studentId: std.id,
      name: std.name,
      xp: Number(std.xp) || 0,
      isCurrentStudent: std.id === studentId,
      badge: idx === 0 ? "Gold Scholar" : idx === 1 ? "Silver Scholar" : idx === 2 ? "Bronze Scholar" : "Active Learner"
    }));
  }
}
