import { Router, type Request, type Response } from "express";
import { query } from "../db";
import { generateToken, authenticateToken, type AuthenticatedRequest } from "../middleware/auth";
import { parentLinkService, normalizeCode, hashCode } from "../services/parent-link.service";

export const authRouter = Router();

// Helper to get or create school entity
export async function getOrCreateSchool(schoolId?: string, schoolName?: string): Promise<{ id: string; name: string }> {
  if (schoolId) {
    const res = await query(`SELECT * FROM schools WHERE id = $1`, [schoolId]);
    if (res.rows.length > 0) return res.rows[0];
  }
  const name = (schoolName || "Delhi Public School, R.K. Puram").trim();
  const res = await query(`SELECT * FROM schools WHERE name ILIKE $1`, [name]);
  if (res.rows.length > 0) return res.rows[0];

  const id = `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const code = `SCH-${name.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  await query(`INSERT INTO schools (id, name, location, school_code) VALUES ($1, $2, $3, $4)`, [id, name, "New Delhi, India", code]);
  return { id, name };
}

// Helper to get or create classroom entity
export async function getOrCreateClassroom(schoolId: string, classLevel: number, section = "A"): Promise<{ id: string; class_level: number; section: string }> {
  const res = await query(
    `SELECT * FROM classrooms WHERE school_id = $1 AND class_level = $2 AND section = $3`,
    [schoolId, classLevel, section]
  );
  if (res.rows.length > 0) return res.rows[0];

  const id = `cls-${schoolId.slice(-6)}-c${classLevel}-${section.toLowerCase()}`;
  await query(
    `INSERT INTO classrooms (id, school_id, class_level, section, academic_year) VALUES ($1, $2, $3, $4, $5)`,
    [id, schoolId, classLevel, section, "2026-2027"]
  );
  return { id, class_level: classLevel, section };
}

// GET /api/auth/schools (List registered schools)
authRouter.get("/schools", async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolsRes = await query(`SELECT * FROM schools ORDER BY name ASC`);
    res.json({ schools: schoolsRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching schools: ${err.message}` });
  }
});

// POST /api/auth/schools (Register/add a school)
authRouter.post("/schools", async (req: Request, res: Response): Promise<void> => {
  const { name, location = "India", schoolCode } = req.body;
  if (!name) {
    res.status(400).json({ error: "School name is required" });
    return;
  }
  try {
    const existing = await query(`SELECT * FROM schools WHERE name ILIKE $1`, [name.trim()]);
    if (existing.rows.length > 0) {
      res.json({ school: existing.rows[0] });
      return;
    }
    const schoolId = `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const code = schoolCode || `SCH-${name.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    await query(
      `INSERT INTO schools (id, name, location, school_code) VALUES ($1, $2, $3, $4)`,
      [schoolId, name.trim(), location, code]
    );
    res.status(201).json({
      school: { id: schoolId, name: name.trim(), location, school_code: code }
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed registering school: ${err.message}` });
  }
});

// POST /api/auth/signup
authRouter.post("/signup", async (req: Request, res: Response): Promise<void> => {
  const {
    email,
    role = "student",
    name,
    classLevel = 7,
    classLevels, // for teachers e.g. [7, 8, 9]
    schoolId,
    school: schoolNameInput,
    section = "A",
    subjectSpecialization = "Mathematics",
    preferredLanguage = "English",
    parentConnectionCode,
    relationshipType = "parent",
    supabaseUserId
  } = req.body;

  if (!email || !name) {
    res.status(400).json({ error: "Email and name are required" });
    return;
  }

  if (!["student", "teacher", "parent"].includes(role)) {
    res.status(400).json({ error: "Invalid role. Must be 'student', 'teacher', or 'parent'" });
    return;
  }

  if (role === "parent" && !parentConnectionCode) {
    res.status(400).json({ error: "A valid Student Parent Connection Code is required to create a parent account." });
    return;
  }

  try {
    // Check if user already exists
    const existing = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    let userId = "";

    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      let hasProfile = false;
      let existingProfileId = "";

      if (existingUser.role === "student") {
        const p = await query(`SELECT id FROM student_profiles WHERE user_id = $1`, [existingUser.id]);
        if (p.rows.length > 0) {
          hasProfile = true;
          existingProfileId = p.rows[0].id;
        }
      } else if (existingUser.role === "teacher") {
        const p = await query(`SELECT id FROM teacher_profiles WHERE user_id = $1`, [existingUser.id]);
        if (p.rows.length > 0) {
          hasProfile = true;
          existingProfileId = p.rows[0].id;
        }
      } else if (existingUser.role === "parent") {
        const p = await query(`SELECT id FROM parent_profiles WHERE user_id = $1`, [existingUser.id]);
        if (p.rows.length > 0) {
          hasProfile = true;
          existingProfileId = p.rows[0].id;
        }
      }

      if (hasProfile) {
        res.status(409).json({ error: "An active account with this email already exists. Please sign in." });
        return;
      }

      // User record existed (e.g. from Google auth) but profile was not created -> reuse user ID
      userId = existingUser.id;
      if (supabaseUserId && (!existingUser.supabase_user_id || existingUser.supabase_user_id.startsWith("sb-auth-"))) {
        await query(`UPDATE users SET supabase_user_id = $1, role = $2 WHERE id = $3`, [supabaseUserId, role, userId]);
      }
    } else {
      userId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const sbUserId = supabaseUserId || `sb-auth-${userId}`;

      await query(
        `INSERT INTO users (id, supabase_user_id, email, role) VALUES ($1, $2, $3, $4)`,
        [userId, sbUserId, email, role]
      );
    }

    // Resolve real school entity
    const schoolEntity = await getOrCreateSchool(schoolId, schoolNameInput);
    let profileId = "";
    let linkedStudentInfo: any = null;

    if (role === "student") {
      profileId = `std-${Date.now()}`;
      const cl = Number(classLevel) || 7;

      await query(
        `INSERT INTO student_profiles (id, user_id, school_id, name, school, class_level, preferred_language, xp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [profileId, userId, schoolEntity.id, name, schoolEntity.name, cl, preferredLanguage, 0]
      );

      // Connect to Classroom & Enroll
      const classroom = await getOrCreateClassroom(schoolEntity.id, cl, section);
      await query(
        `INSERT INTO class_enrollments (id, student_id, classroom_id, status)
         VALUES ($1, $2, $3, $4)`,
        [`enr-${profileId}`, profileId, classroom.id, "active"]
      );

      // Initialize default streak
      await query(
        `INSERT INTO student_streaks (id, student_id, current_streak, longest_streak, last_activity_date, active_days)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [`strk-${profileId}`, profileId, 1, 1, new Date().toISOString().split("T")[0], JSON.stringify([1, 0, 0, 0, 0, 0, 0])]
      );
    } else if (role === "teacher") {
      profileId = `tch-${Date.now()}`;
      const assignedClasses: number[] = Array.isArray(classLevels) && classLevels.length > 0
        ? classLevels.map(Number)
        : [Number(classLevel) || 7];

      const classLabels = assignedClasses.map(c => `Class ${c}`);

      await query(
        `INSERT INTO teacher_profiles (id, user_id, school_id, name, school, subject_specialization, class_assignments)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [profileId, userId, schoolEntity.id, name, schoolEntity.name, subjectSpecialization, JSON.stringify(classLabels)]
      );

      // Connect teacher to each assigned classroom
      for (const cl of assignedClasses) {
        const classroom = await getOrCreateClassroom(schoolEntity.id, cl, section);
        await query(
          `INSERT INTO teacher_classrooms (id, teacher_id, classroom_id, subject)
           VALUES ($1, $2, $3, $4)`,
          [`tc-${profileId}-c${cl}`, profileId, classroom.id, subjectSpecialization]
        );
      }
    } else if (role === "parent") {
      profileId = `par-${Date.now()}`;
      await query(
        `INSERT INTO parent_profiles (id, user_id, name)
         VALUES ($1, $2, $3)`,
        [profileId, userId, name]
      );

      // Server-side code redemption and relationship creation
      const redeemResult = await parentLinkService.verifyAndRedeemCode(
        parentConnectionCode,
        profileId,
        relationshipType === "guardian" ? "guardian" : "parent"
      );
      linkedStudentInfo = redeemResult.student;
    }

    const token = generateToken({ id: userId, email, role, profileId });

    res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        role,
        profileId,
        name,
        school: role === "parent" ? (linkedStudentInfo?.school || schoolEntity.name) : schoolEntity.name,
        schoolId: schoolEntity.id,
        classLevel: role === "student" ? Number(classLevel) : undefined,
        linkedStudent: linkedStudentInfo
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: `Registration error: ${err.message}` });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  try {
    const userRes = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ error: "User not found with this email" });
      return;
    }

    const user = userRes.rows[0];
    let profileId = "";
    let name = user.email.split("@")[0];
    let classLevel: number | undefined;
    let school = "Delhi Public School";
    let schoolId = "";

    if (user.role === "student") {
      const pRes = await query(`SELECT * FROM student_profiles WHERE user_id = $1`, [user.id]);
      if (pRes.rows.length > 0) {
        profileId = pRes.rows[0].id;
        name = pRes.rows[0].name;
        classLevel = pRes.rows[0].class_level;
        school = pRes.rows[0].school;
        schoolId = pRes.rows[0].school_id;
      }
    } else if (user.role === "teacher") {
      const pRes = await query(`SELECT * FROM teacher_profiles WHERE user_id = $1`, [user.id]);
      if (pRes.rows.length > 0) {
        profileId = pRes.rows[0].id;
        name = pRes.rows[0].name;
        school = pRes.rows[0].school;
        schoolId = pRes.rows[0].school_id;
      }
    } else if (user.role === "parent") {
      const pRes = await query(`SELECT * FROM parent_profiles WHERE user_id = $1`, [user.id]);
      if (pRes.rows.length > 0) {
        profileId = pRes.rows[0].id;
        name = pRes.rows[0].name;
      }
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role, profileId });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profileId,
        name,
        school,
        schoolId,
        classLevel
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: `Login error: ${err.message}` });
  }
});

// POST /api/auth/google-auth (Google OAuth verification & existing account resolution)
authRouter.post("/google-auth", async (req: Request, res: Response): Promise<void> => {
  const { email, name: googleName, supabaseUserId, role = "student" } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email is required for Google authentication." });
    return;
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const userRes = await query(`SELECT * FROM users WHERE LOWER(email) = $1`, [cleanEmail]);

    if (userRes.rows.length > 0) {
      // Existing User -> Authenticate & Return Profile
      const user = userRes.rows[0];

      // Update Supabase user id linkage if provided
      if (supabaseUserId && (!user.supabase_user_id || user.supabase_user_id.startsWith("sb-auth-"))) {
        await query(`UPDATE users SET supabase_user_id = $1 WHERE id = $2`, [supabaseUserId, user.id]);
      }

      let profileId = "";
      let name = googleName || user.email.split("@")[0];
      let classLevel: number | undefined;
      let school = "Delhi Public School";
      let schoolId = "";

      if (user.role === "student") {
        const pRes = await query(`SELECT * FROM student_profiles WHERE user_id = $1`, [user.id]);
        if (pRes.rows.length > 0) {
          profileId = pRes.rows[0].id;
          name = pRes.rows[0].name;
          classLevel = pRes.rows[0].class_level;
          school = pRes.rows[0].school;
          schoolId = pRes.rows[0].school_id;
        }
      } else if (user.role === "teacher") {
        const pRes = await query(`SELECT * FROM teacher_profiles WHERE user_id = $1`, [user.id]);
        if (pRes.rows.length > 0) {
          profileId = pRes.rows[0].id;
          name = pRes.rows[0].name;
          school = pRes.rows[0].school;
          schoolId = pRes.rows[0].school_id;
        }
      } else if (user.role === "parent") {
        const pRes = await query(`SELECT * FROM parent_profiles WHERE user_id = $1`, [user.id]);
        if (pRes.rows.length > 0) {
          profileId = pRes.rows[0].id;
          name = pRes.rows[0].name;
        }
      }

      if (profileId) {
        const token = generateToken({ id: user.id, email: user.email, role: user.role, profileId });

        res.json({
          isExistingUser: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            profileId,
            name,
            school,
            schoolId,
            classLevel
          }
        });
        return;
      }
    }

    // New User or User without completed profile -> Prompt onboarding/signup with prefilled Google info
    res.json({
      isExistingUser: false,
      email: cleanEmail,
      name: googleName || cleanEmail.split("@")[0],
      supabaseUserId: supabaseUserId || `sb-google-${Date.now()}`
    });
  } catch (err: any) {
    res.status(500).json({ error: `Google auth error: ${err.message}` });
  }
});

// GET /api/auth/me
authRouter.get("/me", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// GET /api/auth/demo-accounts (Development/testing convenience)
authRouter.get("/demo-accounts", async (req: Request, res: Response): Promise<void> => {
  try {
    const studentsRes = await query(
      `SELECT u.id as user_id, u.email, sp.id as profile_id, sp.name, sp.class_level, sp.school, dr.normalized_score, dr.group_type
       FROM users u
       JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN diagnostic_results dr ON sp.id = dr.student_id
       WHERE u.role = 'student'
       ORDER BY sp.class_level ASC, sp.name ASC`
    );

    const teachersRes = await query(
      `SELECT u.id as user_id, u.email, tp.id as profile_id, tp.name, tp.school, tp.subject_specialization
       FROM users u
       JOIN teacher_profiles tp ON u.id = tp.user_id
       WHERE u.role = 'teacher'
       ORDER BY tp.name ASC`
    );

    const parentRes = await query(
      `SELECT u.id as user_id, u.email, pp.id as profile_id, pp.name
       FROM users u
       JOIN parent_profiles pp ON u.id = pp.user_id
       WHERE u.role = 'parent'
       LIMIT 1`
    );

    const formatStudent = (s: any) => ({
      userId: s.user_id,
      email: s.email,
      profileId: s.profile_id,
      name: s.name,
      role: "student",
      classLevel: s.class_level,
      school: s.school,
      diagnosticScore: s.normalized_score ?? null,
      group: s.group_type ?? null,
      token: generateToken({ id: s.user_id, email: s.email, role: "student", profileId: s.profile_id })
    });

    res.json({
      students: studentsRes.rows.map(formatStudent),
      teachers: teachersRes.rows.map(t => ({
        userId: t.user_id,
        email: t.email,
        profileId: t.profile_id,
        name: t.name,
        school: t.school,
        subject: t.subject_specialization,
        role: "teacher",
        token: generateToken({ id: t.user_id, email: t.email, role: "teacher", profileId: t.profile_id })
      })),
      teacher: teachersRes.rows[0] ? {
        userId: teachersRes.rows[0].user_id,
        email: teachersRes.rows[0].email,
        profileId: teachersRes.rows[0].profile_id,
        name: teachersRes.rows[0].name,
        school: teachersRes.rows[0].school,
        role: "teacher",
        token: generateToken({ id: teachersRes.rows[0].user_id, email: teachersRes.rows[0].email, role: "teacher", profileId: teachersRes.rows[0].profile_id })
      } : null,
      parent: parentRes.rows[0] ? {
        userId: parentRes.rows[0].user_id,
        email: parentRes.rows[0].email,
        profileId: parentRes.rows[0].profile_id,
        name: parentRes.rows[0].name,
        role: "parent",
        token: generateToken({ id: parentRes.rows[0].user_id, email: parentRes.rows[0].email, role: "parent", profileId: parentRes.rows[0].profile_id })
      } : null
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed fetching demo accounts: ${err.message}` });
  }
});
