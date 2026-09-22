import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { mediaItems } from "../../db/schema";
import { assertMethod, sendJson, withErrorHandling, HttpError } from "../_lib/http";
import { requireSession } from "../_lib/auth";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const id = String(req.query["id"]);

  if (req.method === "GET") {
    const [row] = await db.select().from(mediaItems).where(eq(mediaItems.id, id)).limit(1);
    if (!row) throw new HttpError(404, "Item não encontrado.");
    sendJson(res, 200, { mediaItem: row });
    return;
  }

  if (req.method === "DELETE") {
    const session = await requireSession(req);
    const [row] = await db.select().from(mediaItems).where(eq(mediaItems.id, id)).limit(1);
    if (!row) throw new HttpError(404, "Item não encontrado.");
    if (session.role !== "admin" && row.createdBy !== session.sub) {
      throw new HttpError(403, "Você só pode remover itens que você mesmo cadastrou.");
    }
    await db.delete(mediaItems).where(eq(mediaItems.id, id));
    sendJson(res, 200, { ok: true });
    return;
  }

  assertMethod(req, "GET", "DELETE");
});
