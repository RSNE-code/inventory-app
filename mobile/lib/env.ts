/**
 * Environment variables — validated at import time.
 * All EXPO_PUBLIC_* vars are embedded at build time.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.warn(`Missing environment variable: ${key}`);
    return "";
  }
  return value;
}

export const ENV = {
  API_URL: requireEnv("EXPO_PUBLIC_API_URL"),
  SUPABASE_URL: requireEnv("EXPO_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY: requireEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
} as const;
