import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function deployAndVerifySupabase() {
  console.log("=================================================");
  console.log(" 🚀 DEPLOYING SCHEMA & CATALOG TO SUPABASE DB");
  console.log("=================================================\n");

  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set in environment!");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Check Server details
    console.log("1. Checking connection to Supabase Cloud PostgreSQL...");
    const connCheck = await pool.query(`
      SELECT current_database(), current_user, version(), inet_server_addr()
    `);
    const row = connCheck.rows[0];
    console.log(`   ✔ Connected to Database: ${row.current_database}`);
    console.log(`   ✔ Connected User: ${row.current_user}`);
    console.log(`   ✔ Server Address: ${row.inet_server_addr}`);
    console.log(`   ✔ PostgreSQL Version: ${row.version.split(" on ")[0]}\n`);

    // 2. Read and apply schema.sql
    console.log("2. Deploying 29 Tables from schema.sql...");
    const schemaPath = path.join(process.cwd(), "server", "db", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    await pool.query(schemaSql);
    console.log("   ✔ DDL executed successfully on Supabase!\n");

    // 3. Count created tables in public schema
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`3. Verified ${tablesRes.rows.length} tables in Supabase public schema:`);
    const tableList = tablesRes.rows.map(r => r.table_name);
    console.log("   " + tableList.join(", "));
    console.log("");

    // 4. Seed Curriculum Catalog (66 NCERT/CBSE Questions & Classrooms/Schools)
    console.log("4. Checking / Seeding Curriculum Catalog...");
    const qCountRes = await pool.query("SELECT COUNT(*) FROM questions");
    const currentQCount = parseInt(qCountRes.rows[0].count, 10);
    console.log(`   Initial questions count: ${currentQCount}`);

    if (currentQCount === 0) {
      console.log("   Seeding standard curriculum catalog via seedCurriculumCatalog()...");
      const { seedCurriculumCatalog } = await import("./server/db/seed");
      await seedCurriculumCatalog();
      const newQCount = await pool.query("SELECT COUNT(*) FROM questions");
      console.log(`   ✔ Curriculum catalog seeded! Questions in Supabase: ${newQCount.rows[0].count}\n`);
    } else {
      console.log(`   ✔ Curriculum questions already present (${currentQCount} rows).\n`);
    }

    // 5. Final validation summary
    const schoolCount = await pool.query("SELECT COUNT(*) FROM schools");
    const classCount = await pool.query("SELECT COUNT(*) FROM classrooms");
    const finalQCount = await pool.query("SELECT COUNT(*) FROM questions");

    console.log("=================================================");
    console.log(" SUPABASE DEPLOYMENT SUMMARY");
    console.log("=================================================");
    console.log(` - Public Tables in Supabase: ${tablesRes.rows.length} / 29`);
    console.log(` - Schools: ${schoolCount.rows[0].count}`);
    console.log(` - Classrooms (Grades 6-12): ${classCount.rows[0].count}`);
    console.log(` - Curriculum Questions: ${finalQCount.rows[0].count}`);
    console.log("=================================================\n");

  } catch (err: any) {
    console.error("❌ Migration / Verification Failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

deployAndVerifySupabase();
