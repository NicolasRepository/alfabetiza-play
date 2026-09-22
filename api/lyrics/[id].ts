/**
 * GET    /api/lyrics/:id  -> detalhe de uma música
 * PUT    /api/lyrics/:id  -> edita (apenas o autor ou admin)
 * DELETE /api/lyrics/:id  -> remove (apenas o autor ou admin)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { lyrics } from "../../db/schema";
import { assertMethod, sendJson, withErrorHandling, HttpError } from "../_lib/http";
import { requireSession } from "../_lib/auth";
import { parseOrThrow, createLyricsSchema } from "../_lib/validation";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const id = String(req.query["id"]);

  if (req.method === "GET") return handleGet(id, res);
  if (req.method === "PUT") return handleUpdate(req, res, id);
  if (req.method === "DELETE") return handleDelete(req, res, id);
  assertMethod(req, "GET", "PUT", "DELETE");
});

async function findOwned(id: string, userId: string, isAdmin: boolean) {
  const [row] = await db.select().from(lyrics).where(eq(lyrics.id, id)).limit(1);
  if (!row) throw new HttpError(404, "Música não encontrada.");
  if (!isAdmin && row.createdBy !== userId) {
    throw new HttpError(403, "Você só pode editar suas próprias músicas.");
  }
  return row;
}

async function handleGet(id: string, res: VercelResponse) {
  const [row] = await db.select().from(lyrics).where(eq(lyrics.id, id)).limit(1);
  if (!row) throw new HttpError(404, "Música não encontrada.");
  sendJson(res, 200, { lyrics: row });
}

async function handleUpdate(req: VercelRequest, res: VercelResponse, id: string) {
  const session = await requireSession(req);
  await findOwned(id, session.sub, session.role === "admin");

  const { title, lines, isPublic } = parseOrThrow(createLyricsSchema, req.body);
  const [updated] = await db
    .update(lyrics)
    .set({ title, lines, isPublic, updatedAt: new Date() })
    .where(eq(lyrics.id, id))
    .returning();

  sendJson(res, 200, { lyrics: updated });
}

async function handleDelete(req: VercelRequest, res: VercelResponse, id: string) {
  const session = await requireSession(req);
  await findOwned(id, session.sub, session.role === "admin");

  await db.delete(lyrics).where(eq(lyrics.id, id));
  sendJson(res, 200, { ok: true });
}
