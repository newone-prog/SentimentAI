"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoCacheService = void 0;
class MongoCacheService {
    db;
    collectionName;
    constructor(db, collectionName = 'api_responses') {
        this.db = db;
        this.collectionName = collectionName;
        this.initCollection();
    }
    async initCollection() {
        try {
            // Create TTL index to automatically delete expired documents
            await this.db.collection(this.collectionName).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        }
        catch (error) {
            console.warn(`[MongoCache] Failed to initialize index on ${this.collectionName}`, error);
        }
    }
    async get(key) {
        try {
            const doc = await this.db.collection(this.collectionName).findOne({ _id: key });
            if (!doc)
                return null;
            if (doc.expiresAt && doc.expiresAt < new Date()) {
                await this.delete(key);
                return null;
            }
            return doc.data;
        }
        catch (error) {
            console.error(`[MongoCache] Get failed for ${key}`, error);
            return null;
        }
    }
    async set(key, data, ttlSeconds = 86400) {
        try {
            const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
            await this.db.collection(this.collectionName).updateOne({ _id: key }, {
                $set: {
                    data,
                    expiresAt,
                    updatedAt: new Date()
                }
            }, { upsert: true });
            return true;
        }
        catch (error) {
            console.error(`[MongoCache] Set failed for ${key}`, error);
            return false;
        }
    }
    async delete(key) {
        try {
            await this.db.collection(this.collectionName).deleteOne({ _id: key });
        }
        catch (error) {
            console.error(`[MongoCache] Delete failed for ${key}`, error);
        }
    }
}
exports.MongoCacheService = MongoCacheService;
//# sourceMappingURL=MongoCache.js.map