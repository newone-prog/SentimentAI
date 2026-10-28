"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoReportCacheService = void 0;
class MongoReportCacheService {
    db;
    collectionName = 'analyses';
    MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500MB limit
    TTL_SECONDS = 7200; // 2 hours
    constructor(db) {
        this.db = db;
        this.initCollection();
    }
    async initCollection() {
        try {
            const collections = await this.db.listCollections({ name: this.collectionName }).toArray();
            if (collections.length === 0) {
                // Create as a capped collection to enforce the 500MB size limit
                // Capped collections automatically overwrite oldest documents when full.
                await this.db.createCollection(this.collectionName, {
                    capped: true,
                    size: this.MAX_SIZE_BYTES
                });
                console.log(`[MongoReportCache] Created capped collection ${this.collectionName} with size ${this.MAX_SIZE_BYTES} bytes`);
            }
            else {
                const collInfo = collections[0];
                if (!collInfo.options?.capped) {
                    console.warn(`[MongoReportCache] Collection ${this.collectionName} exists but is NOT capped. Size limits won't apply automatically unless converted.`);
                }
            }
            // TTL index to delete reports after 2 hours
            await this.db.collection(this.collectionName).createIndex({ "lastAccessedAt": 1 }, { expireAfterSeconds: this.TTL_SECONDS }).catch(() => { });
            // Symbol index for fast queries
            await this.db.collection(this.collectionName).createIndex({ symbol: 1 }).catch(() => { });
        }
        catch (error) {
            console.error(`[MongoReportCache] Initialization failed:`, error);
        }
    }
    async get(symbol) {
        try {
            const collection = this.db.collection(this.collectionName);
            const cached = await collection.findOne({ symbol }, { sort: { generatedAt: -1 } });
            if (cached && cached.generatedAt) {
                const generatedTime = new Date(cached.generatedAt).getTime();
                if (Date.now() - generatedTime < this.TTL_SECONDS * 1000) {
                    // Update lastAccessedAt so TTL index resets (LRU-like behavior within the 2hr window)
                    await collection.updateOne({ _id: cached._id }, { $set: { lastAccessedAt: new Date() } }).catch(() => { });
                    return cached;
                }
            }
            return null;
        }
        catch (error) {
            console.error(`[MongoReportCache] Get failed for ${symbol}`, error);
            return null;
        }
    }
    async save(symbol, data) {
        try {
            const collection = this.db.collection(this.collectionName);
            const now = new Date();
            const document = {
                ...data,
                symbol,
                generatedAt: now,
                lastAccessedAt: now
            };
            // Capped collections don't support upsert or updates that change document size.
            // We will just insert the new document. The TTL index or capped size will prune old ones.
            // When querying, findOne will return the oldest by default, so we should query by symbol and sort by generatedAt DESC.
            // Wait, in `get()` we use `findOne({ symbol })`, so we need to ensure we get the latest!
            try {
                // Because findOne without sort might return older ones in a capped collection,
                // we should delete the old one first. Wait, deleteOne throws on capped collections!
                // So in a capped collection, if we just insert, `get()` must sort by generatedAt DESC!
                await collection.insertOne(document);
            }
            catch (insertError) {
                throw insertError;
            }
            return true;
        }
        catch (error) {
            console.error(`[MongoReportCache] Save failed for ${symbol}`, error);
            return false;
        }
    }
}
exports.MongoReportCacheService = MongoReportCacheService;
//# sourceMappingURL=MongoReportCache.js.map