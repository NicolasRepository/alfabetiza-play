/**
 * db/client.ts
 * -----------------------------------------------------------------------
 * Conexão com o Neon Postgres via driver HTTP serverless (@neondatabase/serverless).
 *
 * Por que o driver HTTP e não um pool TCP tradicional (ex.: `pg`)?
 * Serverless Functions da Vercel são efêmeras: cada invocação pode rodar
 * em uma instância nova, então pools de conexão TCP tendem a esgotar o
 * limite de conexões do Postgres rapidamente. O driver HTTP do Neon abre
 * uma conexão por requisição sobre HTTPS (fetch), o que escala
 * naturalmente com o modelo serverless e é a opção recomendada pela
 * própria Neon para esse ambiente.
 *
 * `db` é exportado como singleton por processo (reaproveitado entre
 * invocações "quentes" da mesma função, sem custo adicional).
 * -----------------------------------------------------------------------
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não configurada. Defina-a nas variáveis de ambiente do Vercel " +
      "(Project Settings > Environment Variables) ou em um arquivo .env local."
  );
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });

export type Database = typeof db;
