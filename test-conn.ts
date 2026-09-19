import { Pool } from "pg";

const password = encodeURIComponent("sikshasetu@");
const projectRef = "juglfjtxuojeftvwnymw";

const configs = [
  // 1. Session pooler (port 5432)
  `postgresql://postgres.${projectRef}:${password}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  // 2. Transaction pooler (port 65432)
  `postgresql://postgres.${projectRef}:${password}@aws-0-ap-northeast-1.pooler.supabase.com:65432/postgres`,
];

async function testConnections() {
  console.log("Testing Supabase PostgreSQL connection options...");
  for (let i = 0; i < configs.length; i++) {
    const uri = configs[i];
    console.log(`\nAttempt ${i + 1}: Connecting to ${uri.split("@")[1]}...`);
    
    const pool = new Pool({
      connectionString: uri,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 15000,
    });

    try {
      const res = await pool.query("SELECT current_database(), current_user, version(), inet_server_addr()");
      console.log("✔ Connection SUCCESSFUL!");
      console.log("Details:", res.rows[0]);
      console.log("Working URI:", uri.replace(password, "********"));
      await pool.end();
      return uri;
    } catch (err: any) {
      console.error(`❌ Attempt ${i + 1} failed:`, err.message);
      await pool.end();
    }
  }
}

testConnections();
