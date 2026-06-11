import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAK7rW3aPp_E9vSIBOwivXGUIFVeQ3rCPw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sentimentai-48241.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sentimentai-48241",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sentimentai-48241.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "398841833811",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:398841833811:web:80ae906dde6adc9ff899a6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2TMV8SMN7Q"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  hd: '',
  prompt: 'select_account'
});

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.log('Google sign-in popup closed by user');
      return null;
    }
    console.error('Google sign-in error:', error);
    throw error;
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export { auth, googleProvider };
export type { User };
