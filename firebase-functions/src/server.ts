import { app } from "./index";
import express from "express";

const serverApp = express();

// Mount API on both Firebase Functions emulator path and root path
serverApp.use("/sentimentai-48241/us-central1/api", app);
serverApp.use("/", app);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;

const server = serverApp.listen(PORT, "127.0.0.1", () => {
  console.log(`[SentimentAI Backend] Server running on http://127.0.0.1:${PORT}`);
  console.log(`[SentimentAI Backend] Function proxy active: http://127.0.0.1:${PORT}/sentimentai-48241/us-central1/api`);
});

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  server.close();
  process.exit(0);
});
