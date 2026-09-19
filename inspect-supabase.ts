import { Pool } from "pg";

const password = encodeURIComponent("sikshasetu@");
const projectRef = "juglfjtxuojeftvwnymw";
const uri = `postgresql://postgres.${projectRef}:${password}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`;

async function inspectSupabase() {
  const pool = new Pool({
    connectionString: uri,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log(`Found ${res.rows.length} existing tables in public schema:`);
    console.log(res.rows.map(r => r.table_name));
  } finally {
    await pool.end();
  }
}

inspectSupabase();
