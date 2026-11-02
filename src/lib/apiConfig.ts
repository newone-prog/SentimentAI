// Secure API configuration - Routes through backend proxy in production
export const API_CONFIG = {
  GNEWS_API_KEY: import.meta.env.VITE_GNEWS_API_KEY || '',
  MEDIASTACK_API_KEY: import.meta.env.VITE_MEDIASTACK_API_KEY || '',
  MARKETSTACK_API_KEY: import.meta.env.VITE_MARKETSTACK_API_KEY || '',
  INDIANAPI_KEY: import.meta.env.VITE_INDIANAPI_KEY || '',
  NVIDIA_NIM_KEY: import.meta.env.VITE_NVIDIA_NIM_KEY || '',
  ALPHA_VANTAGE_KEY: import.meta.env.VITE_ALPHA_VANTAGE_KEY || '',
  FMP_API_KEY: import.meta.env.VITE_FMP_API_KEY || '',
  TAVILY_API_KEY: import.meta.env.VITE_TAVILY_API_KEY || '',
  BRAVE_API_KEY: import.meta.env.VITE_BRAVE_API_KEY || '',
  FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  FIREBASE_CLIENT_EMAIL: import.meta.env.VITE_FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_PRIVATE_KEY: import.meta.env.VITE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  FIREBASE_FUNCTIONS_URL: import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || '/api',
  OPENROUTER_KEY: import.meta.env.VITE_OPENROUTER_KEY || '',
};

export const NEMOTRON_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";

export const NEMOTRON_MODELS = [
  { id: "nvidia/nemotron-3-ultra-550b-a55b", label: "Nemotron 3 Ultra 550B", shortLabel: "Ultra 550B", desc: "Most capable, best analysis" },
  { id: "nvidia/nemotron-3-ultra-8b-a55b", label: "Nemotron 3 Ultra 8B", shortLabel: "Ultra 8B", desc: "Fast, efficient responses" },
  { id: "meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B", shortLabel: "Llama 70B", desc: "Strong general reasoning" },
  { id: "nvidia/nemotron-3-120b-a55b", label: "Nemotron 3 Super VL 120B", shortLabel: "Super 120B", desc: "Balanced speed & accuracy" },
];

export const DEFAULT_MODEL = NEMOTRON_MODELS[0].id;

// Validate required keys in development
if (import.meta.env.DEV) {
  const requiredKeys = ['NVIDIA_NIM_KEY'];
  const missingKeys = requiredKeys.filter(key => !API_CONFIG[key as keyof typeof API_CONFIG]);

  if (missingKeys.length > 0) {
    console.warn(`Missing required API keys: ${missingKeys.join(', ')}`);
    console.warn('Please copy .env.example to .env and fill in the values');
  }
}

export const isProduction = import.meta.env.PROD;

export const hasBackendProxy = true;
