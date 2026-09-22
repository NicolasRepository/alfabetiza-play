/**
 * db/migrate.ts
 * Aplica as migrações geradas pelo drizzle-kit (drizzle/migrations) ao Neon.
 * Uso: npm run db:migrate
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definida.");

  const sql = neon(connectionString);
  const db = drizzle(sql);

  console.log("Aplicando migrações em", connectionString.replace(/:\/\/.*@/, "://***@"));
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("Migrações aplicadas com sucesso.");
}

main().catch((err) => {
  console.error("Falha ao migrar:", err);
  process.exit(1);
});
