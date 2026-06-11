import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// POST /search?query=Reli — Autocomplete company search
export const searchCompany = functions.https.onCall(async (data, context) => {
  const query = (data.query || "").trim().toLowerCase();
  if (query.length < 2) return [];

  const snapshot = await db.collection("companies")
    .where("isActive", "==", true)
    .limit(50)
    .get();

  const results = snapshot.docs
    .map(doc => doc.data())
    .filter(c => {
      const name = (c.companyName || "").toLowerCase();
      const sym  = (c.symbol || "").toLowerCase();
      return name.includes(query) || sym.startsWith(query);
    })
    .slice(0, 10)
    .map(c => ({
      symbol: c.symbol,
      companyName: c.companyName,
      exchange: c.exchange,
      sector: c.sector
    }));

  return results;
});

// GET /company?symbol=RELIANCE — Fetch company metadata
export const getCompany = functions.https.onCall(async (data, context) => {
  const symbol = (data.symbol || "").trim().toUpperCase();
  if (!symbol) return null;

  const doc = await db.collection("companies").doc(symbol).get();
  if (!doc.exists) return null;
  return doc.data();
});

// POST /searchHistory — Log search for analytics & user history
export const logSearch = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) return;

  const { symbol, companyName } = data;
  if (!symbol) return;

  await db.collection("searchHistory").add({
    uid,
    symbol,
    companyName: companyName || symbol,
    searchedAt: admin.firestore.FieldValue.serverTimestamp()
  });
});

// GET /watchlist — Get user's watchlist
export const getWatchlist = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) return [];

  const doc = await db.collection("watchlists").doc(uid).get();
  if (!doc.exists) return [];
  return doc.data()?.stocks || [];
});

// POST /watchlist — Update user's watchlist
export const updateWatchlist = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "Login required");

  const { stocks } = data;
  if (!Array.isArray(stocks)) throw new functions.https.HttpsError("invalid-argument", "stocks must be an array");

  await db.collection("watchlists").doc(uid).set({
    uid,
    stocks,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { success: true };
});
