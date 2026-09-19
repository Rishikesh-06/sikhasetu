import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDatabase, query, getDatabaseHealth } from "./db";
import { seedCurriculumCatalog } from "./db/seed";
import { authRouter } from "./routes/auth.routes";
import { studentRouter } from "./routes/student.routes";
import { teacherRouter } from "./routes/teacher.routes";
import { parentRouter } from "./routes/parent.routes";
import { seedRouter } from "./routes/seed.routes";
import { aiTutorRouter } from "./routes/ai-tutor.routes";
import { dishaRouter } from "./routes/disha.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-demo-user-id"]
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logger for API calls
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    console.log(`[API ${req.method}] ${req.path}`);
  }
  next();
});

// General Health check
app.get(["/api/health", "/health"], (req, res) => {
  res.json({
    status: "healthy",
    platform: "SIKHASETU Adaptive Learning Intelligence",
    version: "2.0.0",
    timestamp: new Date().toISOString()
  });
});

// Real Database Health check
app.get(["/api/health/db", "/health/db"], async (req, res) => {
  try {
    const health = await getDatabaseHealth();
    if (health.status === "healthy") {
      res.json(health);
    } else {
      res.status(503).json(health);
    }
  } catch (err: any) {
    res.status(500).json({
      status: "unhealthy",
      database: "unknown",
      isCloudSupabase: Boolean(process.env.DATABASE_URL?.includes("supabase.com")),
      error: err.message
    });
  }
});

// AI Engine Health check
app.get(["/api/health/ai", "/health/ai"], async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY || process.env.XAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      status: "unhealthy",
      provider: "Groq",
      error: "GROQ_API_KEY is not configured in server environment."
    });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (response.ok) {
      const data = await response.json() as { data?: Array<{ id: string }> };
      res.json({
        status: "healthy",
        provider: "Groq",
        modelsAvailable: data.data?.length || 0,
        configuredModel: "llama-3.3-70b-versatile",
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(response.status).json({
        status: "unhealthy",
        provider: "Groq",
        statusCode: response.status,
        error: `Groq API responded with status ${response.status}`
      });
    }
  } catch (err: any) {
    res.status(500).json({
      status: "unhealthy",
      provider: "Groq",
      error: err.message
    });
  }
});

// Mount Routers (support both with and without /api prefix)
const apiRouter = express.Router();
apiRouter.use("/auth", authRouter);
apiRouter.use("/student/ai-tutor", aiTutorRouter);
apiRouter.use("/student/disha", dishaRouter);
apiRouter.use("/student", studentRouter);
apiRouter.use("/teacher", teacherRouter);
apiRouter.use("/parent", parentRouter);
apiRouter.use("/seed", seedRouter);

app.use("/api", apiRouter);
app.use("/", apiRouter);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Unhandled Express Error]:", err);
  res.status(500).json({
    error: err.message || "Internal server error"
  });
});

// Startup Routine
export async function ensureInitialized() {
  try {
    const qCountRes = await query(`SELECT COUNT(*) as cnt FROM questions`);
    const count = Number(qCountRes.rows[0]?.cnt || 0);

    if (count === 0) {
      console.log("[SIKHASETU] Database is empty. Seeding standard curriculum questions and schools...");
      await initDatabase();
      await seedCurriculumCatalog();
    }
  } catch (err: any) {
    console.error("[SIKHASETU] Non-fatal init check error:", err.message);
  }
}

async function startServer() {
  try {
    console.log("[SIKHASETU] Bootstrapping backend server...");
    await initDatabase();
    await ensureInitialized();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` SIKHASETU Adaptive API Server running on port ${PORT}`);
      console.log(` Health DB: http://localhost:${PORT}/api/health/db`);
      console.log(` Health AI: http://localhost:${PORT}/api/health/ai`);
      console.log(`====================================================`);
    });
  } catch (err: any) {
    console.error("[SIKHASETU] Failed starting backend server:", err);
  }
}

// Only listen if executed directly and not in serverless runtime
if (
  process.env.NODE_ENV !== "test" &&
  !process.env.VERCEL &&
  !process.env.AWS_LAMBDA_FUNCTION_NAME
) {
  startServer();
}

export default app;

