import { Db } from 'mongodb';

export class MongoCacheService {
  private db: Db;
  private collectionName: string;

  constructor(db: Db, collectionName: string = 'api_responses') {
    this.db = db;
    this.collectionName = collectionName;
    this.initCollection();
  }

  private async initCollection() {
    try {
      // Create TTL index to automatically delete expired documents
      await this.db.collection(this.collectionName).createIndex(
        { expiresAt: 1 }, 
        { expireAfterSeconds: 0 }
      );
    } catch (error) {
      console.warn(`[MongoCache] Failed to initialize index on ${this.collectionName}`, error);
    }
  }

  public async get(key: string): Promise<any | null> {
    try {
      const doc = await this.db.collection(this.collectionName).findOne({ _id: key as any });
      if (!doc) return null;
      if (doc.expiresAt && doc.expiresAt < new Date()) {
        await this.delete(key);
        return null;
      }
      return doc.data;
    } catch (error) {
      console.error(`[MongoCache] Get failed for ${key}`, error);
      return null;
    }
  }

  public async set(key: string, data: any, ttlSeconds: number = 86400): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      await this.db.collection(this.collectionName).updateOne(
        { _id: key as any },
        { 
          $set: { 
            data,
            expiresAt,
            updatedAt: new Date()
          } 
        },
        { upsert: true }
      );
      return true;
    } catch (error) {
      console.error(`[MongoCache] Set failed for ${key}`, error);
      return false;
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).deleteOne({ _id: key as any });
    } catch (error) {
      console.error(`[MongoCache] Delete failed for ${key}`, error);
    }
  }
}
