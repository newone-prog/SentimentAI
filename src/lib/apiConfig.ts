// Secure API configuration - Routes through backend proxy in production
export const API_CONFIG = {
  GNEWS_API_KEY: import.meta.env.VITE_GNEWS_API_KEY || '',
  MEDIASTACK_API_KEY: import.meta.env.VITE_MEDIASTACK_API_KEY || '',
  MARKETSTACK_API_KEY: import.meta.env.VITE_MARKETSTACK_API_KEY || '',
  INDIANAPI_KEY: import.meta.env.VITE_INDIANAPI_KEY || '',
  NVIDIA_NIM_KEY: import.meta.env.VITE_NVIDIA_NIM_KEY || '',
  OPENROUTER_KEY: import.meta.env.VITE_OPENROUTER_KEY || '',
  FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  FIREBASE_CLIENT_EMAIL: import.meta.env.VITE_FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_PRIVATE_KEY: import.meta.env.VITE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
};

// Validate required keys in development
if (import.meta.env.DEV) {
  const requiredKeys = ['NVIDIA_NIM_KEY', 'OPENROUTER_KEY'];
  const missingKeys = requiredKeys.filter(key => !API_CONFIG[key as keyof typeof API_CONFIG]);

  if (missingKeys.length > 0) {
    console.warn(`Missing required API keys: ${missingKeys.join(', ')}`);
    console.warn('Please copy .env.example to .env and fill in the values');
  }
}

export const isProduction = import.meta.env.PROD;

// In dev mode Vite proxy handles routing.
// In prod the deployed backend (Firebase Functions / Cloud Run) handles /api/* and /llm/* routes.
export const hasBackendProxy = isProduction
  ? true // Backend is always present in production
  : true; // Dev proxy is also present via vite.config.ts
