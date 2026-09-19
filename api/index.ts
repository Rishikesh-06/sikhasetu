import app, { ensureInitialized } from "../server/index";

let isReady = false;

export default async function handler(req: any, res: any) {
  if (!isReady) {
    try {
      await ensureInitialized();
      isReady = true;
    } catch (err: any) {
      console.warn("[Vercel API Handler] ensureInitialized warning:", err?.message || err);
    }
  }

  return app(req, res);
}
