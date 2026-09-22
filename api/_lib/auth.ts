/**
 * api/_lib/auth.ts
 * -----------------------------------------------------------------------
 * Regras de autenticação usadas por todas as rotas em /api/auth/* e por
 * qualquer rota protegida (ex.: criar música/mídia exige login).
 *
 * Estratégia:
 *  - Senhas: hash com bcrypt (bcryptjs, puro JS — evita problemas de
 *    compilação nativa em ambiente serverless da Vercel).
 *  - Sessão: JWT assinado (HS256, via `jose`) guardado em cookie
 *    httpOnly + Secure + SameSite=Lax. Não usamos localStorage para o
 *    token de sessão porque isso exporia a criança/professor a roubo de
 *    sessão via XSS; o cookie httpOnly não é acessível por JavaScript.
 * -----------------------------------------------------------------------
 */
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { HttpError } from "./http";

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "alfabetiza_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET não configurado nas variáveis de ambiente.");
}
const secretKey = new TextEncoder().encode(JWT_SECRET);

const BCRYPT_SALT_ROUNDS = 12;

export interface SessionPayload {
  sub: string; // user id
  username: string;
  role: "admin" | "teacher" | "student";
}

/* ------------------------- Senhas ------------------------- */

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

/* ------------------------- JWT / Cookie ------------------------- */

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ username: payload.username, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secretKey);
  return {
    sub: String(payload.sub),
    username: String(payload["username"]),
    role: payload["role"] as SessionPayload["role"],
  };
}

/** Define o cookie de sessão httpOnly na resposta (usado em login/registro). */
export function setSessionCookie(res: VercelResponse, token: string): void {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    "SameSite=Lax",
  ];
  if (isProd) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

/** Remove o cookie de sessão (logout). */
export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
}

function readCookie(req: VercelRequest, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const match = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/** Lê e valida a sessão a partir do cookie da requisição. Lança 401 se ausente/inválida. */
export async function requireSession(req: VercelRequest): Promise<SessionPayload> {
  const token = readCookie(req, SESSION_COOKIE_NAME);
  if (!token) throw new HttpError(401, "Não autenticado. Faça login novamente.");
  try {
    return await verifySessionToken(token);
  } catch {
    throw new HttpError(401, "Sessão inválida ou expirada.");
  }
}

/** Versão "opcional": retorna null em vez de lançar erro, para rotas públicas
 *  que só precisam saber SE existe usuário logado (ex.: personalizar a home). */
export async function readOptionalSession(req: VercelRequest): Promise<SessionPayload | null> {
  const token = readCookie(req, SESSION_COOKIE_NAME);
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/** Garante que o usuário logado possui um dos papéis exigidos (ex.: só "teacher"/"admin" cadastram conteúdo). */
export function requireRole(session: SessionPayload, ...roles: SessionPayload["role"][]): void {
  if (!roles.includes(session.role)) {
    throw new HttpError(403, "Você não tem permissão para executar esta ação.");
  }
}
