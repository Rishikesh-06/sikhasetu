import { query } from "./server/db";

async function runMigration() {
  console.log("Running parent schema migration on live database...");

  // 1. Make student_id in parent_profiles nullable if it exists
  await query(`
    ALTER TABLE parent_profiles 
    ALTER COLUMN student_id DROP NOT NULL;
  `).catch(err => console.log("Note on alter parent_profiles:", err.message));

  // 2. Create parent_student_relationships table
  await query(`
    CREATE TABLE IF NOT EXISTS parent_student_relationships (
      id VARCHAR(36) PRIMARY KEY,
      parent_id VARCHAR(36) REFERENCES parent_profiles(id) ON DELETE CASCADE,
      student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
      relationship_type VARCHAR(20) DEFAULT 'parent' CHECK (relationship_type IN ('parent', 'guardian')),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'revoked')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      revoked_at TIMESTAMP WITH TIME ZONE
    );
  `);
  console.log("Created table parent_student_relationships");

  // 3. Create parent_link_codes table
  await query(`
    CREATE TABLE IF NOT EXISTS parent_link_codes (
      id VARCHAR(36) PRIMARY KEY,
      student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
      code_hash VARCHAR(128) NOT NULL,
      code_preview VARCHAR(16),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      revoked_at TIMESTAMP WITH TIME ZONE
    );
  `);
  console.log("Created table parent_link_codes");

  // 4. Create indices for fast lookup
  await query(`
    CREATE INDEX IF NOT EXISTS idx_parent_student_rel_parent ON parent_student_relationships(parent_id);
    CREATE INDEX IF NOT EXISTS idx_parent_student_rel_student ON parent_student_relationships(student_id);
    CREATE INDEX IF NOT EXISTS idx_parent_link_codes_hash ON parent_link_codes(code_hash);
    CREATE INDEX IF NOT EXISTS idx_parent_link_codes_student ON parent_link_codes(student_id);
  `);
  console.log("Created indices");

  // 5. Migrate existing parent_profiles student_id links into parent_student_relationships if any
  const existingParents = await query(`SELECT id, student_id FROM parent_profiles WHERE student_id IS NOT NULL`);
  for (const p of existingParents.rows) {
    const check = await query(
      `SELECT id FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2`,
      [p.id, p.student_id]
    );
    if (check.rows.length === 0) {
      await query(
        `INSERT INTO parent_student_relationships (id, parent_id, student_id, relationship_type, status, created_at, verified_at)
         VALUES ($1, $2, $3, 'parent', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [`psr-${p.id.slice(-6)}-${p.student_id.slice(-6)}`, p.id, p.student_id]
      );
      console.log(`Migrated legacy link for parent ${p.id} -> student ${p.student_id}`);
    }
  }

  console.log("Parent schema migration completed successfully!");
  process.exit(0);
}

runMigration().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
