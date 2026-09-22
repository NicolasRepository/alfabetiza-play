/**
 * GET  /api/lyrics  -> lista músicas visíveis ao usuário (públicas + próprias)
 * POST /api/lyrics  -> cria uma nova música (requer sessão de professor/admin)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { or, eq, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { lyrics } from "../../db/schema";
import { assertMethod, sendJson, withErrorHandling } from "../_lib/http";
import { readOptionalSession, requireSession, requireRole } from "../_lib/auth";
import { parseOrThrow, createLyricsSchema } from "../_lib/validation";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === "GET") return handleList(req, res);
  if (req.method === "POST") return handleCreate(req, res);
  assertMethod(req, "GET", "POST");
});

async function handleList(req: VercelRequest, res: VercelResponse) {
  const session = await readOptionalSession(req);

  const rows = await db
    .select()
    .from(lyrics)
    .where(
      session
        ? or(eq(lyrics.isPublic, true), eq(lyrics.createdBy, session.sub))
        : eq(lyrics.isPublic, true)
    )
    .orderBy(desc(lyrics.createdAt));

  sendJson(res, 200, { lyrics: rows });
}

async function handleCreate(req: VercelRequest, res: VercelResponse) {
  const session = await requireSession(req);
  requireRole(session, "teacher", "admin");

  const { title, lines, isPublic } = parseOrThrow(createLyricsSchema, req.body);

  const [created] = await db
    .insert(lyrics)
    .values({ title, lines, isPublic, createdBy: session.sub })
    .returning();

  sendJson(res, 201, { lyrics: created });
}
