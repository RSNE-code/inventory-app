/**
 * API client — authenticated fetch wrapper for the Vercel-hosted Next.js API.
 * Bearer token auth, 15s timeout (construction-site WiFi), typed errors.
 */
import { supabase } from "./supabase";
import { ENV } from "./env";

const API_TIMEOUT_MS = 15_000;

// ── Error hierarchy ──

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ── Core fetch ──

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new AuthError("Not authenticated");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const url = `${ENV.API_URL}${path}`;
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...options.headers,
      },
    });

    if (res.status === 401) {
      throw new AuthError("Session expired — please sign in again");
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "Unknown error");
      throw new ApiError(res.status, body);
    }

    // 204 No Content (e.g., DELETE)
    if (res.status === 204) {
      return undefined as T;
    }

    const json = await res.json();
    return json;
  } catch (e) {
    if (e instanceof AuthError || e instanceof ApiError) throw e;
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new NetworkError("Request timed out — check your connection");
    }
    throw new NetworkError(
      e instanceof Error ? e.message : "Network error — check your connection"
    );
  } finally {
    clearTimeout(timeout);
  }
}

// ── Shorthands ──

export function apiGet<T>(path: string) {
  return apiFetch<T>(path);
}

export function apiPost<T>(path: string, body: unknown) {
  return apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiPut<T>(path: string, body: unknown) {
  return apiFetch<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string) {
  return apiFetch<T>(path, { method: "DELETE" });
}
