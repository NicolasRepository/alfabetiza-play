/**
 * POST /api/auth/login
 * Autentica com e-mail OU nome de usuário + senha. Por segurança, a
 * mensagem de erro é sempre genérica (não revela se o e-mail existe).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, or } from "drizzle-orm";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { assertMethod, sendJson, withErrorHandling, HttpError } from "../_lib/http";
import { verifyPassword, createSessionToken, setSessionCookie } from "../_lib/auth";
import { parseOrThrow, loginSchema } from "../_lib/validation";

const INVALID_CREDENTIALS_MSG = "E-mail/usuário ou senha incorretos.";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  assertMethod(req, "POST");

  const { identifier, password } = parseOrThrow(loginSchema, req.body);
  const normalized = identifier.toLowerCase();

  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, normalized), eq(users.username, identifier)))
    .limit(1);

  if (!user) throw new HttpError(401, INVALID_CREDENTIALS_MSG);

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) throw new HttpError(401, INVALID_CREDENTIALS_MSG);

  const token = await createSessionToken({
    sub: user.id,
    username: user.username,
    role: user.role,
  });
  setSessionCookie(res, token);

  sendJson(res, 200, {
    user: { id: user.id, username: user.username, role: user.role },
  });
});
