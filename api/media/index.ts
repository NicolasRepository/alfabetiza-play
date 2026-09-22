/**
 * GET  /api/media  -> lista imagens+palavras visíveis (públicas + próprias),
 *                     opcionalmente filtradas por ?category=
 * POST /api/media  -> cadastra uma nova imagem+palavra (professor/admin)
 *
 * Esta é a fonte de dados consumida pelo novo jogo
 * (src/games/word-image-game) para montar os 3 modos de exibição.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, or, eq, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { mediaItems } from "../../db/schema";
import { assertMethod, sendJson, withErrorHandling } from "../_lib/http";
import { readOptionalSession, requireSession, requireRole } from "../_lib/auth";
import { parseOrThrow, createMediaItemSchema } from "../_lib/validation";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === "GET") return handleList(req, res);
  if (req.method === "POST") return handleCreate(req, res);
  assertMethod(req, "GET", "POST");
});

async function handleList(req: VercelRequest, res: VercelResponse) {
  const session = await readOptionalSession(req);
  const category = typeof req.query["category"] === "string" ? req.query["category"] : undefined;

  const visibility = session
    ? or(eq(mediaItems.isPublic, true), eq(mediaItems.createdBy, session.sub))
    : eq(mediaItems.isPublic, true);

  const rows = await db
    .select()
    .from(mediaItems)
    .where(category ? and(visibility, eq(mediaItems.category, category)) : visibility)
    .orderBy(desc(mediaItems.createdAt));

  sendJson(res, 200, { mediaItems: rows });
}

async function handleCreate(req: VercelRequest, res: VercelResponse) {
  const session = await requireSession(req);
  requireRole(session, "teacher", "admin");

  const { word, imageUrl, category, isPublic } = parseOrThrow(createMediaItemSchema, req.body);

  const [created] = await db
    .insert(mediaItems)
    .values({ word: word.toUpperCase(), imageUrl, category, isPublic, createdBy: session.sub })
    .returning();

  sendJson(res, 201, { mediaItem: created });
}
