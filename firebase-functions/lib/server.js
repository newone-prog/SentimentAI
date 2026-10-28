"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const express_1 = __importDefault(require("express"));
const serverApp = (0, express_1.default)();
// Mount API on both Firebase Functions emulator path and root path
serverApp.use("/sentimentai-48241/us-central1/api", index_1.app);
serverApp.use("/", index_1.app);
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
//# sourceMappingURL=server.js.map