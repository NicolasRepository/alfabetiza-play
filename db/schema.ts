/**
 * db/schema.ts
 * -----------------------------------------------------------------------
 * Modelagem do banco de dados (Neon Postgres) usando Drizzle ORM.
 *
 * Este arquivo é a ÚNICA fonte de verdade do esquema. Tanto as Serverless
 * Functions (api/**) quanto os scripts de migração/seed (db/migrate.ts,
 * db/seed.ts) importam os tipos e tabelas daqui — nunca duplique DDL em
 * outro lugar.
 *
 * Rode `npm run db:generate` sempre que este arquivo mudar, para o
 * drizzle-kit gerar o SQL de migração em /drizzle/migrations.
 * -----------------------------------------------------------------------
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

// Papel do usuário na plataforma. "teacher" pode cadastrar músicas/mídias;
// "student" apenas joga. "admin" tem acesso irrestrito (moderação futura).
export const userRoleEnum = pgEnum("user_role", ["admin", "teacher", "student"]);

/* ------------------------------------------------------------------ */
/* Tabela: users                                                       */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 32 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    // Nunca armazenar senha em texto puro: guardamos apenas o hash bcrypt.
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("teacher"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // E-mail e username precisam ser únicos para login e cadastro.
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    usernameIdx: uniqueIndex("users_username_idx").on(table.username),
  })
);

/* ------------------------------------------------------------------ */
/* Tabela: lyrics (letras de músicas — jogo "Texto Lacunado/Fatiado")   */
/* ------------------------------------------------------------------ */

export const lyrics = pgTable(
  "lyrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 160 }).notNull(),
    // Cada linha da música vira um elemento do array. Guardar como JSONB
    // evita uma tabela filha extra para um conteúdo pequeno e sempre lido
    // por inteiro (a música toda é buscada de uma vez pelo jogo).
    lines: jsonb("lines").$type<string[]>().notNull(),
    // Associa a música a quem a cadastrou (professor). Músicas "seed" do
    // sistema podem ter createdBy = null.
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    // Controla se a música aparece para todos os usuários ou só para o autor.
    isPublic: boolean("is_public").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdByIdx: index("lyrics_created_by_idx").on(table.createdBy),
  })
);

/* ------------------------------------------------------------------ */
/* Tabela: media_items (imagem + palavra — novo jogo de vogais/consoantes) */
/* ------------------------------------------------------------------ */

export const mediaItems = pgTable(
  "media_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // URL pública da imagem (Vercel Blob, S3, Cloudinary, ou /public/media/*).
    imageUrl: text("image_url").notNull(),
    // Palavra associada à imagem, sempre normalizada em maiúsculas e sem
    // acento na hora da comparação (ver src/games/word-image-game/word-mask.util.ts),
    // mas armazenada com a grafia correta para exibição.
    word: varchar("word", { length: 60 }).notNull(),
    // Categoria opcional para futura filtragem (ex.: "animais", "frutas").
    category: varchar("category", { length: 60 }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    isPublic: boolean("is_public").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdByIdx: index("media_items_created_by_idx").on(table.createdBy),
    wordIdx: index("media_items_word_idx").on(table.word),
  })
);

/* ------------------------------------------------------------------ */
/* Relations (usadas por drizzle-orm para joins tipados, ex. `with:`)   */
/* ------------------------------------------------------------------ */

export const usersRelations = relations(users, ({ many }) => ({
  lyrics: many(lyrics),
  mediaItems: many(mediaItems),
}));

export const lyricsRelations = relations(lyrics, ({ one }) => ({
  author: one(users, { fields: [lyrics.createdBy], references: [users.id] }),
}));

export const mediaItemsRelations = relations(mediaItems, ({ one }) => ({
  author: one(users, { fields: [mediaItems.createdBy], references: [users.id] }),
}));

/* ------------------------------------------------------------------ */
/* Tipos inferidos (usados em toda a API e no frontend via src/core/types.ts) */
/* ------------------------------------------------------------------ */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Lyrics = typeof lyrics.$inferSelect;
export type NewLyrics = typeof lyrics.$inferInsert;

export type MediaItem = typeof mediaItems.$inferSelect;
export type NewMediaItem = typeof mediaItems.$inferInsert;
