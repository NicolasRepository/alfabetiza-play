/**
 * src/games/game-core/game.interface.ts
 * -----------------------------------------------------------------------
 * Contrato que TODO jogo da plataforma deve implementar. É isso que torna
 * a estrutura "pronta para adicionar novos jogos no futuro": para criar um
 * jogo novo, basta criar uma pasta em src/games/<novo-jogo>/, implementar
 * esta interface e registrá-la em game-registry.ts — nenhuma outra parte
 * do app precisa mudar.
 * -----------------------------------------------------------------------
 */

export interface GameMetadata {
  /** Identificador único e estável (usado em URLs/roteamento e no registry). */
  id: string;
  /** Nome exibido no menu principal. */
  title: string;
  /** Frase curta descrevendo o jogo, exibida no card do menu. */
  description: string;
  /** Emoji/ícone simples para o card do menu (mantém o app leve, sem sprites). */
  icon: string;
}

export interface GameInstance {
  /** Renderiza a tela inicial do jogo dentro do container fornecido. */
  mount(container: HTMLElement): void | Promise<void>;
  /** Libera listeners/timers antes de trocar de tela (evita leaks de memória). */
  unmount(): void;
}

/** Callback fornecido pelo shell da aplicação para o jogo poder "voltar ao menu". */
export type OnExitGame = () => void;

export interface GameDefinition {
  metadata: GameMetadata;
  /** Fábrica: cria uma nova instância do jogo a cada partida. */
  create(onExit: OnExitGame): GameInstance;
}
