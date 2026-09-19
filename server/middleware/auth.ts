import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { query } from "../db";

const JWT_SECRET = process.env.JWT_SECRET || "sikhsetu_adaptive_learning_secret_jwt_key_2026";

export interface AuthenticatedUser {
  id: string;
  supabase_user_id: string;
  email: string;
  role: "student" | "teacher" | "parent";
  profileId: string;
  name: string;
  classLevel?: number;
  school?: string;
  schoolId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  // Development/Demo fallback: header x-demo-user-id or token
  const demoUserId = req.headers["x-demo-user-id"] as string | undefined;

  if (!token && !demoUserId) {
    res.status(401).json({ error: "Unauthorized: Missing authentication token" });
    return;
  }

  try {
    let userId = "";

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.sub || decoded.id || decoded.userId;
      } catch (jwtErr) {
        // If not matching secret, check if it's a Supabase Auth JWT payload
        const decoded = jwt.decode(token) as any;
        if (decoded && (decoded.sub || decoded.email)) {
          userId = decoded.sub;
        } else {
          throw new Error("Invalid JWT token signature");
        }
      }
    } else if (demoUserId && process.env.NODE_ENV !== "production") {
      userId = demoUserId;
    }

    // Query user record from PostgreSQL
    let userRes = await query(
      `SELECT u.* FROM users u WHERE u.id = $1 OR u.supabase_user_id = $1 OR u.email = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      // If user not in database yet (new Supabase registration), check if email is present
      res.status(401).json({ error: "Authenticated user record not found in application database" });
      return;
    }

    const user = userRes.rows[0];

    // Fetch corresponding profile
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
        school = pRes.rows[0].school || school;
        schoolId = pRes.rows[0].school_id || schoolId;
      }
    } else if (user.role === "teacher") {
      const pRes = await query(`SELECT * FROM teacher_profiles WHERE user_id = $1`, [user.id]);
      if (pRes.rows.length > 0) {
        profileId = pRes.rows[0].id;
        name = pRes.rows[0].name;
        school = pRes.rows[0].school || school;
        schoolId = pRes.rows[0].school_id || schoolId;
      }
    } else if (user.role === "parent") {
      const pRes = await query(`SELECT * FROM parent_profiles WHERE user_id = $1`, [user.id]);
      if (pRes.rows.length > 0) {
        profileId = pRes.rows[0].id;
        name = pRes.rows[0].name;
      }
    }

    req.user = {
      id: user.id,
      supabase_user_id: user.supabase_user_id,
      email: user.email,
      role: user.role,
      profileId,
      name,
      classLevel,
      school,
      schoolId
    };

    next();
  } catch (err: any) {
    res.status(401).json({ error: `Authentication failed: ${err.message}` });
  }
}

export function requireRole(...allowedRoles: Array<"student" | "teacher" | "parent">) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized: User not authenticated" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Access restricted to ${allowedRoles.join(" / ")}. Current role: ${req.user.role}`
      });
      return;
    }

    next();
  };
}

export function generateToken(payload: { id: string; email: string; role: string; profileId?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
