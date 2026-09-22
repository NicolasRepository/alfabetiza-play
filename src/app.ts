/**
 * src/app.ts
 * Orquestrador central e simples "roteador" client-side (sem depender de
 * um framework de rotas — a plataforma tem poucas telas). Responsável por:
 *   1. Montar/desmontar telas dentro do #app.
 *   2. Chamar unmount() do jogo ativo antes de trocar de tela, evitando
 *      listeners "fantasmas" acumulados.
 *   3. Expor uma API mínima (AppRouter) para as telas navegarem sem
 *      conhecer os detalhes umas das outras.
 */
import { renderMainMenu } from "./screens/main-menu";
import { renderLogin, renderRegister } from "./screens/auth-screens";
import { getGameById } from "./games/game-core/game-registry";
import type { GameInstance } from "./games/game-core/game.interface";

export interface AppRouter {
  goToMainMenu(): void;
  goToLogin(): void;
  goToRegister(): void;
  openGame(gameId: string): void;
}

export class App implements AppRouter {
  private activeGame: GameInstance | null = null;

  constructor(private readonly root: HTMLElement) {}

  private teardownActiveGame(): void {
    this.activeGame?.unmount();
    this.activeGame = null;
  }

  goToMainMenu(): void {
    this.teardownActiveGame();
    renderMainMenu(this.root, this);
  }

  goToLogin(): void {
    this.teardownActiveGame();
    renderLogin(this.root, this);
  }

  goToRegister(): void {
    this.teardownActiveGame();
    renderRegister(this.root, this);
  }

  openGame(gameId: string): void {
    const definition = getGameById(gameId);
    if (!definition) {
      console.error(`Jogo desconhecido: ${gameId}`);
      this.goToMainMenu();
      return;
    }

    this.teardownActiveGame();
    this.activeGame = definition.create(() => this.goToMainMenu());
    void this.activeGame.mount(this.root);
  }
}
