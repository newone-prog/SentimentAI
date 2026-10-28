"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.localCache = exports.EDriveCache = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Enforce strict local caching to E: drive as per strict constraints
const CACHE_DIR = 'E:\\WebApps\\Finance Projects\\SentimentAI\\data_cache';
class EDriveCache {
    constructor() {
        this.ensureDirectoryExists();
    }
    ensureDirectoryExists() {
        try {
            if (!fs.existsSync(CACHE_DIR)) {
                fs.mkdirSync(CACHE_DIR, { recursive: true });
                console.log(`[EDriveCache] Created base directory: ${CACHE_DIR}`);
            }
        }
        catch (error) {
            console.error(`[EDriveCache] Critical Error creating E: drive directory:`, error);
        }
    }
    getFilePath(key) {
        // Sanitize key to prevent path traversal
        const safeKey = key.replace(/[^a-z0-9_-]/gi, '_');
        return path.join(CACHE_DIR, `${safeKey}.json`);
    }
    async set(key, data) {
        try {
            this.ensureDirectoryExists();
            const filePath = this.getFilePath(key);
            const payload = {
                timestamp: Date.now(),
                data
            };
            await fs.promises.writeFile(filePath, JSON.stringify(payload), 'utf8');
            return true;
        }
        catch (error) {
            console.error(`[EDriveCache] Failed to write to E: drive for ${key}:`, error);
            return false;
        }
    }
    async get(key, ttlMs = 24 * 60 * 60 * 1000) {
        try {
            const filePath = this.getFilePath(key);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            const payload = JSON.parse(fileContent);
            if (Date.now() - payload.timestamp > ttlMs) {
                // Stale, clean it up
                await this.delete(key);
                return null;
            }
            return payload.data;
        }
        catch (error) {
            console.error(`[EDriveCache] Failed to read from E: drive for ${key}:`, error);
            return null;
        }
    }
    async delete(key) {
        try {
            const filePath = this.getFilePath(key);
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
            }
        }
        catch (error) {
            console.error(`[EDriveCache] Failed to delete file for ${key}:`, error);
        }
    }
}
exports.EDriveCache = EDriveCache;
exports.localCache = new EDriveCache();
//# sourceMappingURL=EDriveCache.js.map