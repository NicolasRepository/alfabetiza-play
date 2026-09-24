/**
 * POST /api/auth/register
 * Cria um novo usuário (professor ou aluno). A senha nunca é salva em
 * texto puro: apenas o hash bcrypt vai para o banco.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users } from "../../db/schema";
import { assertMethod, sendJson, withErrorHandling, HttpError } from "../_lib/http";
import { hashPassword, createSessionToken, setSessionCookie } from "../_lib/auth";
import { parseOrThrow, registerSchema } from "../_lib/validation";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  assertMethod(req, "POST");

  const { username, email, password, role } = parseOrThrow(registerSchema, req.body);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1);

  if (existing.length > 0) {
    throw new HttpError(409, "Já existe uma conta com este e-mail ou nome de usuário.");
  }

  const passwordHash = await hashPassword(password);

  const [created] = await db
    .insert(users)
    .values({ username, email, passwordHash, role })
    .returning({ id: users.id, username: users.username, role: users.role });

  if (!created) throw new HttpError(500, "Não foi possível criar o usuário.");

  const token = await createSessionToken({
    sub: created.id,
    username: created.username,
    role: created.role,
  });
  setSessionCookie(res, token);

  sendJson(res, 201, {
    user: { id: created.id, username: created.username, role: created.role },
  });
});
