/**
 * db/seed.ts
 * Popula a tabela media_items com exemplos iniciais para o jogo
 * "Imagem + Palavra". Uso: npm run db:seed
 *
 * Substitua as imageUrl por assets reais hospedados (Vercel Blob, S3, ou
 * arquivos em /public/media/*.png servidos estaticamente pelo próprio site).
 */
import { db } from "./client";
import { mediaItems, lyrics } from "./schema";

// Músicas que já existiam no protótipo original (musicas.txt), preservadas
// aqui para quem migra do projeto antigo não perder o conteúdo já testado.
const SEED_LYRICS: Array<{ title: string; lines: string[] }> = [
  {
    title: "A DONA ARANHA",
    lines: [
      "A dona aranha subiu pela parede",
      "Veio a chuva forte e a derrubou",
      "Já passou a chuva, o sol já vem surgindo",
      "E a dona aranha continua a subir",
    ],
  },
  {
    title: "O SAPO NÃO LAVA O PÉ",
    lines: [
      "O sapo não lava o pé",
      "Não lava porque não quer",
      "Ele mora lá na lagoa",
      "Não lava o pé porque não quer, mas que chulé!",
    ],
  },
  {
    title: "BORBOLETINHA",
    lines: [
      "Borboletinha tá na cozinha",
      "Fazendo chocolate para a madrinha",
      "Poti-poti, perna de pau",
      "Olho de vidro e nariz de pica-pau",
    ],
  },
  {
    title: "A BARATA DIZ QUE TEM",
    lines: [
      "A barata diz que tem sete saias de filó",
      "É mentira da barata, ela tem é uma só",
      "A-ha, ho-ho, ela tem é uma só!",
      "A-ha, ho-ho, ela tem é uma só!",
    ],
  },
  {
    title: "CIRANDA, CIRANDINHA",
    lines: [
      "Ciranda, cirandinha, vamos todos cirandar",
      "Vamos dar a meia-volta, volta e meia vamos dar",
      "O anel que tu me deste era vidro e se quebrou",
      "O amor que tu me tinhas era pouco e se acabou",
    ],
  },
  {
    title: "O PINTINHO AMARELINHO",
    lines: [
      "Meu pintinho amarelinho",
      "Cabe aqui na minha mão, na minha mão",
      "Quando quer comer bichinhos",
      "Com seus pezinhos ele cisca o chão",
    ],
  },
];

const SEED_ITEMS: Array<{ word: string; imageUrl: string; category: string }> = [
  { word: "GATO", imageUrl: "/media/gato.png", category: "animais" },
  { word: "CACHORRO", imageUrl: "/media/cachorro.png", category: "animais" },
  { word: "BANANA", imageUrl: "/media/banana.png", category: "frutas" },
  { word: "ABACAXI", imageUrl: "/media/abacaxi.png", category: "frutas" },
  { word: "BOLA", imageUrl: "/media/bola.png", category: "brinquedos" },
  { word: "CASA", imageUrl: "/media/casa.png", category: "objetos" },
  { word: "SOL", imageUrl: "/media/sol.png", category: "natureza" },
  { word: "LUA", imageUrl: "/media/lua.png", category: "natureza" },
];

async function main() {
  console.log(`Inserindo ${SEED_ITEMS.length} media_items...`);
  await db.insert(mediaItems).values(SEED_ITEMS.map((item) => ({ ...item, isPublic: true })));

  console.log(`Inserindo ${SEED_LYRICS.length} músicas (lyrics)...`);
  await db.insert(lyrics).values(SEED_LYRICS.map((song) => ({ ...song, isPublic: true })));

  console.log("Seed concluído.");
}

main()
  .catch((err) => {
    console.error("Falha no seed:", err);
    process.exit(1);
  })
  .then(() => process.exit(0));
