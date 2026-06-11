import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Trigger on new user creation
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const email = user.email || "";
  const displayName = user.displayName || "Anonymous";
  const photoURL = user.photoURL || "";

  const userRef = admin.firestore().collection("users").doc(uid);

  try {
    await userRef.set({
      uid,
      email,
      displayName,
      photoURL,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      plan: "free",
      analysisCount: 0,
      watchlistCount: 0
    }, { merge: true });

    // Initialize empty watchlist for user
    await admin.firestore().collection("watchlists").doc(uid).set({
      uid,
      stocks: [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`User profile created for ${email}`);
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw new Error("Failed to create user profile");
  }
});

// Trigger when a user deletes their account
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;

  try {
    // Clean up user data
    await admin.firestore().collection("users").doc(uid).delete();
    await admin.firestore().collection("watchlists").doc(uid).delete();
    await admin.firestore().collection("searchHistory").where("uid", "==", uid).get().then(snapshot => {
      const batch = admin.firestore().batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      return batch.commit();
    });

    console.log(`User data cleaned up for ${uid}`);
  } catch (error) {
    console.error("Error cleaning up user data:", error);
    throw new Error("Failed to clean up user data");
  }
});
