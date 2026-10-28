import * as fs from 'fs';
import * as path from 'path';

// Enforce strict local caching to E: drive as per strict constraints
const CACHE_DIR = 'E:\\WebApps\\Finance Projects\\SentimentAI\\data_cache';

export class EDriveCache {
  constructor() {
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists() {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        console.log(`[EDriveCache] Created base directory: ${CACHE_DIR}`);
      }
    } catch (error) {
      console.error(`[EDriveCache] Critical Error creating E: drive directory:`, error);
    }
  }

  private getFilePath(key: string): string {
    // Sanitize key to prevent path traversal
    const safeKey = key.replace(/[^a-z0-9_-]/gi, '_');
    return path.join(CACHE_DIR, `${safeKey}.json`);
  }

  public async set(key: string, data: any): Promise<boolean> {
    try {
      this.ensureDirectoryExists();
      const filePath = this.getFilePath(key);
      
      const payload = {
        timestamp: Date.now(),
        data
      };

      await fs.promises.writeFile(filePath, JSON.stringify(payload), 'utf8');
      return true;
    } catch (error) {
      console.error(`[EDriveCache] Failed to write to E: drive for ${key}:`, error);
      return false;
    }
  }

  public async get(key: string, ttlMs: number = 24 * 60 * 60 * 1000): Promise<any | null> {
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
    } catch (error) {
      console.error(`[EDriveCache] Failed to read from E: drive for ${key}:`, error);
      return null;
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error(`[EDriveCache] Failed to delete file for ${key}:`, error);
    }
  }
}

export const localCache = new EDriveCache();
