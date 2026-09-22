/**
 * src/core/api-client.ts
 * Fina camada sobre `fetch` para falar com as Serverless Functions em /api.
 * `credentials: "include"` é essencial: é o que envia/recebe o cookie
 * httpOnly de sessão em cada requisição.
 */
import type { AuthUser, LyricsSong, MediaItem } from "./types";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? "Ocorreu um erro inesperado.");
  }
  return body as T;
}

export const api = {
  auth: {
    me: () => request<{ user: AuthUser | null }>("/auth/me"),
    login: (identifier: string, password: string) =>
      request<{ user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      }),
    register: (username: string, email: string, password: string) =>
      request<{ user: AuthUser }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      }),
    logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
  },
  lyrics: {
    list: () => request<{ lyrics: LyricsSong[] }>("/lyrics"),
    create: (title: string, lines: string[]) =>
      request<{ lyrics: LyricsSong }>("/lyrics", {
        method: "POST",
        body: JSON.stringify({ title, lines }),
      }),
  },
  media: {
    list: (category?: string) =>
      request<{ mediaItems: MediaItem[] }>(`/media${category ? `?category=${category}` : ""}`),
    create: (word: string, imageUrl: string, category?: string) =>
      request<{ mediaItem: MediaItem }>("/media", {
        method: "POST",
        body: JSON.stringify({ word, imageUrl, category }),
      }),
  },
};

export { ApiError };
