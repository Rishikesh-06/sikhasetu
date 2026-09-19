import crypto from "crypto";
import { query } from "../db";

// Generates a cryptographically strong 8-character connection code formatted as "XXXX-XXXX"
export function createRandomConnectionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // unambiguous charset
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// Normalizes connection code input (e.g. removes spaces, hyphens, uppercases)
export function normalizeCode(rawCode: string): { normalized: string; formatted: string } {
  const cleaned = rawCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const formatted = cleaned.length === 8 ? `${cleaned.slice(0, 4)}-${cleaned.slice(4)}` : cleaned;
  return { normalized: cleaned, formatted };
}

// Computes SHA-256 hash of formatted connection code
export function hashCode(formattedCode: string): string {
  return crypto.createHash("sha256").update(formattedCode.trim().toUpperCase()).digest("hex");
}

export const parentLinkService = {
  /**
   * Student generates a new temporary parent connection code.
   * Automatically revokes any prior unredeemed codes for this student.
   * Valid for 48 hours.
   */
  async generateConnectionCode(studentId: string, expiresInHours = 48): Promise<{
    code: string;
    expiresAt: Date;
    createdAt: Date;
    studentName: string;
  }> {
    // 1. Verify student exists
    const stdRes = await query(`SELECT id, name FROM student_profiles WHERE id = $1`, [studentId]);
    if (stdRes.rows.length === 0) {
      throw new Error("Student profile not found.");
    }
    const student = stdRes.rows[0];

    // 2. Revoke any previous unused/active codes for this student
    await query(
      `UPDATE parent_link_codes 
       SET revoked_at = CURRENT_TIMESTAMP 
       WHERE student_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
      [studentId]
    );

    // 3. Generate cryptographic code & hash
    const rawCode = createRandomConnectionCode();
    const hash = hashCode(rawCode);
    const codeId = `plc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    const createdAt = new Date();
    const preview = `${rawCode.slice(0, 4)}-****`;

    await query(
      `INSERT INTO parent_link_codes (id, student_id, code_hash, code_preview, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [codeId, studentId, hash, preview, expiresAt.toISOString(), createdAt.toISOString()]
    );

    return {
      code: rawCode,
      expiresAt,
      createdAt,
      studentName: student.name
    };
  },

  /**
   * Student checks their active connection code status.
   */
  async getActiveCodeStatus(studentId: string): Promise<{
    hasActiveCode: boolean;
    preview?: string;
    expiresAt?: Date;
    createdAt?: Date;
  }> {
    const res = await query(
      `SELECT code_preview, expires_at, created_at 
       FROM parent_link_codes 
       WHERE student_id = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC LIMIT 1`,
      [studentId]
    );

    if (res.rows.length === 0) {
      return { hasActiveCode: false };
    }

    const row = res.rows[0];
    return {
      hasActiveCode: true,
      preview: row.code_preview,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at)
    };
  },

  /**
   * Student explicitly revokes their active parent connection code.
   */
  async revokeActiveCode(studentId: string): Promise<boolean> {
    const res = await query(
      `UPDATE parent_link_codes 
       SET revoked_at = CURRENT_TIMESTAMP 
       WHERE student_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
      [studentId]
    );
    return (res.rowCount ?? 0) > 0;
  },

  /**
   * Get all parents/guardians currently linked to a student.
   */
  async getLinkedParentsForStudent(studentId: string): Promise<Array<{
    relationshipId: string;
    parentProfileId: string;
    parentName: string;
    parentEmail: string;
    relationshipType: string;
    status: string;
    verifiedAt: string;
  }>> {
    const res = await query(
      `SELECT psr.id as relationship_id, psr.relationship_type, psr.status, psr.verified_at,
              pp.id as parent_profile_id, pp.name as parent_name, u.email as parent_email
       FROM parent_student_relationships psr
       JOIN parent_profiles pp ON psr.parent_id = pp.id
       JOIN users u ON pp.user_id = u.id
       WHERE psr.student_id = $1 AND psr.status = 'active'
       ORDER BY psr.created_at ASC`,
      [studentId]
    );

    return res.rows.map(r => ({
      relationshipId: r.relationship_id,
      parentProfileId: r.parent_profile_id,
      parentName: r.parent_name,
      parentEmail: r.parent_email,
      relationshipType: r.relationship_type,
      status: r.status,
      verifiedAt: r.verified_at
    }));
  },

  /**
   * Validates and redeems a connection code server-side to link a parent to a student.
   * Enforces expiration, revocation, single-use, and valid student resolution.
   */
  async verifyAndRedeemCode(
    rawCode: string,
    parentProfileId: string,
    relationshipType: "parent" | "guardian" = "parent"
  ): Promise<{
    student: {
      id: string;
      name: string;
      classLevel: number;
      school: string;
      preferredLanguage: string;
    };
    relationshipId: string;
    isNewLink: boolean;
  }> {
    const { formatted } = normalizeCode(rawCode);
    if (!formatted || formatted.length < 8) {
      throw new Error("Invalid connection code format. Please check the code and try again.");
    }

    const hash = hashCode(formatted);

    // 1. Look up the code in parent_link_codes
    const codeRes = await query(
      `SELECT plc.*, sp.id as student_id, sp.name as student_name, sp.class_level, sp.school, sp.preferred_language
       FROM parent_link_codes plc
       JOIN student_profiles sp ON plc.student_id = sp.id
       WHERE plc.code_hash = $1`,
      [hash]
    );

    if (codeRes.rows.length === 0) {
      throw new Error("Connection code is invalid. Please request a valid code from your child.");
    }

    const codeRecord = codeRes.rows[0];

    // 2. Validate revocation
    if (codeRecord.revoked_at) {
      throw new Error("This connection code has been revoked by the student. Please request a new code.");
    }

    // 3. Validate single-use (used_at)
    if (codeRecord.used_at) {
      throw new Error("This connection code has already been used. Each connection code can only be used once.");
    }

    // 4. Validate expiration
    const now = new Date();
    const expiresAt = new Date(codeRecord.expires_at);
    if (now > expiresAt) {
      throw new Error("This connection code has expired. Please ask your child to generate a fresh code.");
    }

    const studentId = codeRecord.student_id;

    // 5. Check if relationship already exists
    const existingRel = await query(
      `SELECT * FROM parent_student_relationships 
       WHERE parent_id = $1 AND student_id = $2`,
      [parentProfileId, studentId]
    );

    let relationshipId = "";
    let isNewLink = true;

    if (existingRel.rows.length > 0) {
      const rel = existingRel.rows[0];
      if (rel.status === "active") {
        // Already active
        relationshipId = rel.id;
        isNewLink = false;
      } else {
        // Reactivate previously revoked link
        relationshipId = rel.id;
        await query(
          `UPDATE parent_student_relationships 
           SET status = 'active', relationship_type = $1, verified_at = CURRENT_TIMESTAMP, revoked_at = NULL 
           WHERE id = $2`,
          [relationshipType, rel.id]
        );
      }
    } else {
      // Create new relationship
      relationshipId = `psr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await query(
        `INSERT INTO parent_student_relationships (id, parent_id, student_id, relationship_type, status, created_at, verified_at)
         VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [relationshipId, parentProfileId, studentId, relationshipType]
      );
    }

    // 6. Mark code as used
    await query(
      `UPDATE parent_link_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [codeRecord.id]
    );

    // 7. Update parent_profiles fallback student_id if null
    await query(
      `UPDATE parent_profiles SET student_id = $1 WHERE id = $2 AND student_id IS NULL`,
      [studentId, parentProfileId]
    );

    return {
      student: {
        id: studentId,
        name: codeRecord.student_name,
        classLevel: codeRecord.class_level,
        school: codeRecord.school,
        preferredLanguage: codeRecord.preferred_language
      },
      relationshipId,
      isNewLink
    };
  },

  /**
   * Authoritatively verify if a parent has an ACTIVE relationship with a student.
   * Used as strict security gate on every parent API call.
   */
  async verifyParentChildAccess(parentProfileId: string, studentId: string): Promise<{
    authorized: boolean;
    student?: {
      id: string;
      name: string;
      classLevel: number;
      school: string;
    };
    relationship?: {
      id: string;
      type: string;
      status: string;
      verifiedAt: string;
    };
  }> {
    if (!parentProfileId || !studentId) {
      return { authorized: false };
    }

    const res = await query(
      `SELECT psr.id as relationship_id, psr.relationship_type, psr.status, psr.verified_at,
              sp.id as student_id, sp.name as student_name, sp.class_level, sp.school
       FROM parent_student_relationships psr
       JOIN student_profiles sp ON psr.student_id = sp.id
       WHERE psr.parent_id = $1 AND psr.student_id = $2 AND psr.status = 'active'`,
      [parentProfileId, studentId]
    );

    if (res.rows.length === 0) {
      return { authorized: false };
    }

    const row = res.rows[0];
    return {
      authorized: true,
      student: {
        id: row.student_id,
        name: row.student_name,
        classLevel: row.class_level,
        school: row.school
      },
      relationship: {
        id: row.relationship_id,
        type: row.relationship_type,
        status: row.status,
        verifiedAt: row.verified_at
      }
    };
  },

  /**
   * Get all active linked children for a parent.
   */
  async getChildrenForParent(parentProfileId: string): Promise<Array<{
    id: string;
    name: string;
    classLevel: number;
    school: string;
    relationshipType: string;
    verifiedAt: string;
  }>> {
    const res = await query(
      `SELECT sp.id, sp.name, sp.class_level, sp.school, psr.relationship_type, psr.verified_at
       FROM parent_student_relationships psr
       JOIN student_profiles sp ON psr.student_id = sp.id
       WHERE psr.parent_id = $1 AND psr.status = 'active'
       ORDER BY sp.name ASC`,
      [parentProfileId]
    );

    return res.rows.map(r => ({
      id: r.id,
      name: r.name,
      classLevel: r.class_level,
      school: r.school,
      relationshipType: r.relationship_type,
      verifiedAt: r.verified_at
    }));
  },

  /**
   * Parent or Student can revoke a link.
   */
  async revokeRelationship(parentProfileId: string, studentId: string): Promise<boolean> {
    const res = await query(
      `UPDATE parent_student_relationships 
       SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP 
       WHERE parent_id = $1 AND student_id = $2 AND status = 'active'`,
      [parentProfileId, studentId]
    );
    return (res.rowCount ?? 0) > 0;
  }
};
