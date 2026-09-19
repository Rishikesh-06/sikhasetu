import { Router, type Request, type Response } from "express";
import { query } from "../db";
import { seedDatabase } from "../db/seed";

export const seedRouter = Router();

// POST /api/seed/reset (Development & Hackathon demo testing only)
seedRouter.post("/reset", async (req: Request, res: Response): Promise<void> => {
  const isDev = process.env.NODE_ENV !== "production" || process.env.ENABLE_SEED_ENDPOINT === "true";
  if (!isDev) {
    res.status(403).json({ error: "Forbidden: Seed endpoint is disabled in production" });
    return;
  }

  try {
    await seedDatabase();
    res.json({
      success: true,
      message: "Database schema successfully migrated and re-seeded with curriculum questions (Classes 6-12) and seed classroom records."
    });
  } catch (err: any) {
    res.status(500).json({ error: `Database seed failed: ${err.message}` });
  }
});

// GET /api/seed/status
seedRouter.get("/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const qCount = await query(`SELECT COUNT(*) as cnt FROM questions`);
    const sCount = await query(`SELECT COUNT(*) as cnt FROM student_profiles`);
    const aCount = await query(`SELECT COUNT(*) as cnt FROM adaptive_assessments`);
    const dCount = await query(`SELECT COUNT(*) as cnt FROM diagnostic_results`);

    res.json({
      databaseReady: true,
      questionsCount: Number(qCount.rows[0]?.cnt || 0),
      studentsCount: Number(sCount.rows[0]?.cnt || 0),
      assessmentsCount: Number(aCount.rows[0]?.cnt || 0),
      diagnosticsCount: Number(dCount.rows[0]?.cnt || 0),
      isDev: process.env.NODE_ENV !== "production" || process.env.ENABLE_SEED_ENDPOINT === "true"
    });
  } catch (err: any) {
    res.status(500).json({ error: `Status check failed: ${err.message}` });
  }
});
