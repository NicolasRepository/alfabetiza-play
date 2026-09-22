/**
 * api/_lib/validation.ts
 * Schemas Zod para validar o corpo das requisições antes de tocar no banco.
 */
import { z } from "zod";
import { HttpError } from "./http";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Nome de usuário precisa ter ao menos 3 caracteres.")
    .max(32, "Nome de usuário muito longo.")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Use apenas letras, números, ponto, traço ou underline."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
  role: z.enum(["teacher", "student"]).optional().default("teacher"),
});

export const loginSchema = z.object({
  // Permite login por e-mail OU username no mesmo campo "identifier".
  identifier: z.string().trim().min(1, "Informe seu e-mail ou usuário."),
  password: z.string().min(1, "Informe sua senha."),
});

export const createLyricsSchema = z.object({
  title: z.string().trim().min(1).max(160),
  lines: z.array(z.string().trim().min(1)).min(1, "A música precisa ter ao menos uma linha."),
  isPublic: z.boolean().optional().default(true),
});

export const createMediaItemSchema = z.object({
  word: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s-]+$/, "A palavra deve conter apenas letras."),
  imageUrl: z.string().trim().url("URL de imagem inválida."),
  category: z.string().trim().max(60).optional(),
  isPublic: z.boolean().optional().default(true),
});

/** Faz parse do body (já JSON) e transforma erro de validação em HttpError 400 padronizado. */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new HttpError(400, firstIssue?.message ?? "Dados inválidos.");
  }
  return result.data;
}
