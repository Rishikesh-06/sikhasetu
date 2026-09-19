import dotenv from "dotenv";
import { query } from "./server/db";

dotenv.config();

async function migrate() {
  console.log("[Migration] Adding structured_summary to disha_documents...");
  try {
    await query(`ALTER TABLE disha_documents ADD COLUMN IF NOT EXISTS structured_summary JSONB DEFAULT '{}'::jsonb;`);
    console.log("[Migration] Column structured_summary added successfully!");
    process.exit(0);
  } catch (err) {
    console.error("[Migration Error]", err);
    process.exit(1);
  }
}

migrate();
