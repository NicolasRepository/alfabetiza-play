/**
 * src/games/word-image-game/word-mask.util.ts
 * -----------------------------------------------------------------------
 * Lógica PURA (sem tocar em DOM) dos 3 modos de exibição do jogo
 * "Imagem + Palavra". Fica isolada num módulo próprio para poder ser
 * testada unitariamente sem precisar montar a tela, e para ser reutilizada
 * caso outro jogo futuro precise da mesma mecânica de máscara de letras.
 *
 * Modo 1 (Apenas Vogais):      mostra vogais, oculta consoantes.
 * Modo 2 (Apenas Consoantes):  mostra consoantes, oculta vogais.
 * Modo 3 (Espaços em Branco):  oculta todas as letras (só traços).
 * -----------------------------------------------------------------------
 */

export type DisplayMode = "vowels" | "consonants" | "blanks";

export interface LetterSlot {
  /** Posição da letra dentro da palavra (0-based). */
  index: number;
  /** A letra correta, sempre em maiúscula, como está cadastrada. */
  letter: string;
  /** true = a letra já aparece revelada na tela; false = precisa ser preenchida. */
  revealed: boolean;
  /** Classificação fonética usada para decidir o que revelar em cada modo. */
  kind: "vowel" | "consonant" | "other"; // "other" cobre espaço/hífen em palavras compostas
}

const VOWEL_REGEX = /[AEIOU]/;

/**
 * Classifica uma letra como vogal/consoante ignorando acentuação
 * (Á, É, Ê, Õ, Ç... continuam sendo tratadas corretamente), mas preserva
 * o caractere original para exibição.
 */
function classifyLetter(char: string): LetterSlot["kind"] {
  if (/\s|-/.test(char)) return "other";
  const stripped = char
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacríticos (acentos, til, cedilha vira C)
    .toUpperCase();
  if (VOWEL_REGEX.test(stripped)) return "vowel";
  if (/[A-Z]/.test(stripped)) return "consonant";
  return "other";
}

/**
 * Constrói os slots de uma palavra para um modo de exibição específico.
 * Espaços/hífens (palavras compostas) nunca precisam ser "adivinhados":
 * ficam sempre revelados como separador visual.
 */
export function buildLetterSlots(word: string, mode: DisplayMode): LetterSlot[] {
  const normalizedWord = word.toUpperCase();

  return Array.from(normalizedWord).map((letter, index) => {
    const kind = classifyLetter(letter);

    let revealed: boolean;
    if (kind === "other") {
      revealed = true; // espaço/hífen sempre visível
    } else if (mode === "blanks") {
      revealed = false; // Modo 3: nada revelado
    } else if (mode === "vowels") {
      revealed = kind === "vowel"; // Modo 1: só vogal aparece
    } else {
      revealed = kind === "consonant"; // Modo 2: só consoante aparece
    }

    return { index, letter, revealed, kind };
  });
}

/** Letras (únicas) que o jogador precisa encontrar para completar a palavra. */
export function getMissingLetters(slots: LetterSlot[]): string[] {
  const missing = slots.filter((s) => !s.revealed).map((s) => s.letter);
  return Array.from(new Set(missing));
}

const DISTRACTOR_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Monta o banco de letras que aparece no teclado/bandeja inferior:
 * todas as letras que faltam (sem repetição) + distratores aleatórios,
 * embaralhados. `minOptions` garante um teclado com tamanho mínimo
 * consistente mesmo para palavras curtas, para não "entregar" a resposta.
 */
export function buildLetterBank(missingLetters: string[], minOptions = 8): string[] {
  const bank = new Set(missingLetters);
  const candidates = shuffle(DISTRACTOR_POOL.filter((l) => !bank.has(l)));

  let i = 0;
  while (bank.size < minOptions && i < candidates.length) {
    bank.add(candidates[i] as string);
    i++;
  }

  return shuffle(Array.from(bank));
}

/** Fisher-Yates shuffle — usado no teclado e na seleção de próxima palavra. */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
  }
  return arr;
}

export const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  vowels: "MODO 1 · APENAS VOGAIS",
  consonants: "MODO 2 · APENAS CONSOANTES",
  blanks: "MODO 3 · ESPAÇOS EM BRANCO",
};
