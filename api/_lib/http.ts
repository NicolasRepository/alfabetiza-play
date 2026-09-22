/**
 * api/_lib/http.ts
 * Utilitários compartilhados por todas as Serverless Functions em /api.
 * Mantém as respostas consistentes (formato JSON, status, mensagens de erro)
 * sem repetir boilerplate em cada rota.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function sendJson(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).setHeader("Content-Type", "application/json").json(data);
}

export function sendError(res: VercelResponse, err: unknown): void {
  if (err instanceof HttpError) {
    sendJson(res, err.status, { error: err.message });
    return;
  }
  // Nunca vaze detalhes internos (stack trace, driver do banco) para o cliente.
  console.error("Erro não tratado:", err);
  sendJson(res, 500, { error: "Erro interno do servidor." });
}

/** Garante que a requisição usa um dos métodos HTTP permitidos pela rota. */
export function assertMethod(req: VercelRequest, ...methods: string[]): void {
  if (!req.method || !methods.includes(req.method)) {
    res_methodNotAllowed(methods);
  }
}

function res_methodNotAllowed(methods: string[]): never {
  throw new HttpError(405, `Método não permitido. Use: ${methods.join(", ")}.`);
}

/** Envolve o handler para capturar erros assíncronos e padronizar a resposta. */
export function withErrorHandling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      await handler(req, res);
    } catch (err) {
      sendError(res, err);
    }
  };
}
