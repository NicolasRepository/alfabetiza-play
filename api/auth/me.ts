import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertMethod, sendJson, withErrorHandling } from "../_lib/http.js";
import { readOptionalSession } from "../_lib/auth";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  assertMethod(req, "GET");
  const session = await readOptionalSession(req);
  sendJson(res, 200, {
    user: session ? { id: session.sub, username: session.username, role: session.role } : null,
  });
});
