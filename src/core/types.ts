/**
 * src/core/types.ts
 * Tipos de dados compartilhados entre telas e jogos. Espelham os shapes
 * retornados pela API (api/**), mas em formato "camelCase puro" — sem
 * depender diretamente do Drizzle no bundle do navegador.
 */

export type UserRole = "admin" | "teacher" | "student";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface LyricsSong {
  id: string;
  title: string;
  lines: string[];
  isPublic: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  word: string;
  imageUrl: string;
  category: string | null;
  isPublic: boolean;
  createdAt: string;
}
