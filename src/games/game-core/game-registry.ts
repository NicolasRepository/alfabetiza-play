/**
 * src/games/game-core/game-registry.ts
 * Lista única de jogos disponíveis na plataforma. O menu principal
 * (src/screens/main-menu.ts) apenas itera sobre `GAME_REGISTRY` — para
 * adicionar um jogo novo, basta importar e empurrar sua GameDefinition
 * aqui, sem tocar em mais nada.
 */
import type { GameDefinition } from "./game.interface";
import { lyricsGameDefinition } from "../lyrics-game/lyrics-game";
import { wordImageGameDefinition } from "../word-image-game/word-image-game";

export const GAME_REGISTRY: GameDefinition[] = [
  wordImageGameDefinition,
  lyricsGameDefinition,
];

export function getGameById(id: string): GameDefinition | undefined {
  return GAME_REGISTRY.find((g) => g.metadata.id === id);
}
