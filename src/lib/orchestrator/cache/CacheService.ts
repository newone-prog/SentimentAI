export class CacheService {
  /**
   * Fetches cached LLM report from MongoDB backend
   */
  public async get<T>(key: string): Promise<T | null> {
    console.log(`[CacheService] Checking MongoDB cache for ${key}`);
    try {
      const response = await fetch(`/api/cache/${encodeURIComponent(key)}`);
      if (!response.ok) return null;
      
      const json = await response.json();
      if (json.cached && json.data) {
        console.log(`[CacheService] Cache HIT for ${key}`);
        return json.data as T;
      }
      console.log(`[CacheService] Cache MISS for ${key}`);
      return null;
    } catch (err) {
      console.error(`[CacheService] Error reading from MongoDB cache for ${key}:`, err);
      return null;
    }
  }

  /**
   * Saves LLM report to MongoDB backend
   */
  public async set(key: string, value: any, _ttlSeconds: number): Promise<void> {
    console.log(`[CacheService] Saving cache to MongoDB for ${key}`);
    try {
      await fetch(`/api/cache/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(value)
      });
    } catch (err) {
      console.error(`[CacheService] Error writing to MongoDB cache for ${key}:`, err);
    }
  }
}
