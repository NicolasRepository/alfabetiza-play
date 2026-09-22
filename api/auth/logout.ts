import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertMethod, sendJson, withErrorHandling } from "../_lib/http";
import { clearSessionCookie } from "../_lib/auth";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  assertMethod(req, "POST");
  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
});
