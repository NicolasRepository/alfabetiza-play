/**
 * src/games/word-image-game/word-image-game.ts
 * -----------------------------------------------------------------------
 * Jogo "Imagem + Palavra": mostra uma imagem cadastrada e a palavra
 * associada mascarada segundo um dos 3 modos (vogais / consoantes /
 * espaços em branco). A criança preenche as letras que faltam usando o
 * teclado virtual.
 *
 * REQUISITO CRÍTICO DE UI (lousa interativa):
 *   - `.top-display`  -> SÓ exibe imagem + palavra. Nenhum elemento
 *                        clicável vive aqui.
 *   - `.bottom-controls` -> TODOS os elementos interativos (teclado,
 *                        desfazer, verificar, menu) ficam agrupados na
 *                        parte inferior da tela, ao alcance de uma
 *                        criança em frente a uma lousa digital.
 * Essa divisão é a mesma classe CSS (.top-display/.bottom-controls)
 * usada pelo jogo de letras de música refatorado, garantindo consistência
 * de ergonomia em toda a plataforma (ver src/styles/game-shell.css).
 * -----------------------------------------------------------------------
 */
import "./word-image-game.css";
import { api } from "../../core/api-client";
import type { MediaItem } from "../../core/types";
import type { GameDefinition, GameInstance, OnExitGame } from "../game-core/game.interface";
import {
  buildLetterSlots,
  buildLetterBank,
  getMissingLetters,
  DISPLAY_MODE_LABELS,
  shuffle,
  type DisplayMode,
  type LetterSlot,
} from "./word-mask.util";
import { renderVirtualKeyboard } from "./virtual-keyboard";

class WordImageGame implements GameInstance {
  private container: HTMLElement | null = null;
  private mediaItems: MediaItem[] = [];
  private mode: DisplayMode | null = null;

  // Estado da rodada atual
  private currentItem: MediaItem | null = null;
  private slots: LetterSlot[] = [];
  private filled: Array<string | null> = [];
  private hiddenSlotOrder: number[] = []; // índices (na palavra) que precisam ser preenchidos, em ordem
  private letterBank: string[] = [];

  constructor(private readonly onExit: OnExitGame) {}

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;
    this.renderLoading();

    try {
      const { mediaItems } = await api.media.list();
      this.mediaItems = mediaItems;
    } catch (err) {
      this.renderError("NÃO FOI POSSÍVEL CARREGAR AS IMAGENS. TENTE NOVAMENTE.");
      return;
    }

    if (this.mediaItems.length === 0) {
      this.renderError("NENHUMA IMAGEM CADASTRADA AINDA. PEÇA À PROFESSORA PARA CADASTRAR!");
      return;
    }

    this.renderModeSelection();
  }

  unmount(): void {
    // Este jogo não usa timers/listeners globais além dos elementos que
    // são substituídos via innerHTML, então não há nada extra a limpar.
    // O método existe para cumprir o contrato GameInstance e para servir
    // de ponto de extensão caso um jogo futuro precise (ex.: clearInterval).
    this.container = null;
  }

  /* ---------------------------- Telas ---------------------------- */

  private renderLoading(): void {
    if (!this.container) return;
    this.container.innerHTML = `<div class="game-shell"><div class="top-display centered">CARREGANDO...</div></div>`;
  }

  private renderError(message: string): void {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="game-shell">
        <div class="top-display centered">${message}</div>
        <div class="bottom-controls">
          <div class="action-bar">
            <button class="btn" id="btn-voltar-erro">VOLTAR AO MENU</button>
          </div>
        </div>
      </div>`;
    this.container
      .querySelector("#btn-voltar-erro")
      ?.addEventListener("click", () => this.onExit());
  }

  /** Tela de escolha de modo — TODOS os botões ficam na metade inferior,
   * mesmo sem imagem em exibição, para manter a ergonomia consistente. */
  private renderModeSelection(): void {
    if (!this.container) return;

    const modes: DisplayMode[] = ["vowels", "consonants", "blanks"];

    this.container.innerHTML = `
      <div class="game-shell">
        <div class="top-display centered">
          <h1 class="mode-select-title">IMAGEM + PALAVRA</h1>
          <p class="mode-select-subtitle">ESCOLHA COMO AS LETRAS VÃO APARECER</p>
        </div>
        <div class="bottom-controls">
          <div class="mode-select-list">
            ${modes
              .map(
                (m) =>
                  `<button class="btn mode-btn" data-mode="${m}">${DISPLAY_MODE_LABELS[m]}</button>`
              )
              .join("")}
          </div>
          <div class="action-bar">
            <button class="btn" id="btn-voltar-modo">VOLTAR</button>
          </div>
        </div>
      </div>`;

    this.container.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.mode = btn.dataset["mode"] as DisplayMode;
        this.startRound();
      });
    });
    this.container
      .querySelector("#btn-voltar-modo")
      ?.addEventListener("click", () => this.onExit());
  }

  /* ---------------------------- Rodada ---------------------------- */

  private startRound(): void {
    if (!this.mode) return;

    const pool = shuffle(this.mediaItems);
    this.currentItem = pool[0] as MediaItem;
    this.slots = buildLetterSlots(this.currentItem.word, this.mode);
    this.filled = this.slots.map((s) => (s.revealed ? s.letter : null));
    this.hiddenSlotOrder = this.slots.filter((s) => !s.revealed).map((s) => s.index);
    this.letterBank = buildLetterBank(getMissingLetters(this.slots));

    this.renderRound();
  }

  private renderRound(): void {
    if (!this.container || !this.currentItem) return;

    const isComplete = this.filled.every((v) => v !== null);

    this.container.innerHTML = `
      <div class="game-shell">
        <div class="top-display">
          <div class="word-image-frame">
            <img src="${this.currentItem.imageUrl}" alt="" class="word-image" draggable="false" />
          </div>
          <div class="word-slots" aria-label="Palavra a descobrir">
            ${this.renderWordSlotsHtml()}
          </div>
        </div>
        <div class="bottom-controls">
          <div id="feedback-msg">${
            isComplete ? "TUDO PREENCHIDO! TOQUE EM VERIFICAR." : "TOQUE NAS LETRAS PARA COMPLETAR A PALAVRA:"
          }</div>
          <div id="letter-bank-slot"></div>
          <div class="action-bar">
            <button class="btn" id="btn-menu">MENU</button>
            <button class="btn" id="btn-desfazer" ${this.hasFilledAny() ? "" : "disabled"}>DESFAZER</button>
            <button class="btn" id="btn-verificar" ${isComplete ? "" : "disabled"}>VERIFICAR</button>
          </div>
        </div>
      </div>`;

    const keyboardSlot = this.container.querySelector("#letter-bank-slot") as HTMLElement;
    keyboardSlot.appendChild(
      renderVirtualKeyboard({
        letters: this.letterBank,
        disabled: isComplete,
        onLetterClick: (letter) => this.handleLetterClick(letter),
      })
    );

    this.container.querySelector("#btn-menu")?.addEventListener("click", () => this.onExit());
    this.container
      .querySelector("#btn-desfazer")
      ?.addEventListener("click", () => this.handleUndo());
    this.container
      .querySelector("#btn-verificar")
      ?.addEventListener("click", () => this.handleVerify());
  }

  private renderWordSlotsHtml(): string {
    return this.slots
      .map((slot, i) => {
        if (slot.kind === "other") {
          // Espaço/hífen de palavra composta: exibido como espaço em branco real.
          return `<span class="word-slot separator"> </span>`;
        }
        const value = this.filled[i];
        if (value) {
          const cls = slot.revealed ? "word-slot revealed" : "word-slot filled";
          return `<span class="${cls}">${value}</span>`;
        }
        return `<span class="word-slot empty">_</span>`;
      })
      .join("");
  }

  private hasFilledAny(): boolean {
    return this.hiddenSlotOrder.some((idx) => this.filled[idx] !== null);
  }

  private handleLetterClick(letter: string): void {
    // Preenche o próximo espaço oculto ainda vazio, na ordem da palavra —
    // mesma mecânica "sequencial" usada no jogo de letras de música,
    // simples o bastante para crianças pequenas entenderem sem instruções.
    const nextIndex = this.hiddenSlotOrder.find((idx) => this.filled[idx] === null);
    if (nextIndex === undefined) return;

    this.filled[nextIndex] = letter;

    const bankPos = this.letterBank.indexOf(letter);
    if (bankPos !== -1) this.letterBank.splice(bankPos, 1);

    this.renderRound();
  }

  private handleUndo(): void {
    // Remove o último espaço oculto preenchido (da direita para a esquerda).
    const lastFilledIndex = [...this.hiddenSlotOrder]
      .reverse()
      .find((idx) => this.filled[idx] !== null);
    if (lastFilledIndex === undefined) return;

    const letter = this.filled[lastFilledIndex] as string;
    this.filled[lastFilledIndex] = null;
    this.letterBank.push(letter);
    this.letterBank = shuffle(this.letterBank);

    this.renderRound();
  }

  private handleVerify(): void {
    if (!this.currentItem) return;

    const correctCount = this.hiddenSlotOrder.filter(
      (idx) => this.filled[idx] === this.slots[idx]?.letter
    ).length;
    const total = this.hiddenSlotOrder.length;

    this.renderResultModal(correctCount, total);
  }

  private renderResultModal(correct: number, total: number): void {
    if (!this.container) return;

    const perfect = correct === total;
    const message = perfect ? "🎉 PARABÉNS! VOCÊ ACERTOU TUDO! 🎉" : "QUASE LÁ! VAMOS TENTAR DE NOVO?";

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content" style="align-items:center; text-align:center;">
        <h2>FIM DE JOGO!</h2>
        <h3>VOCÊ ACERTOU ${correct} DE ${total} LETRAS</h3>
        <h4>${message}</h4>
        <div class="modal-btn-group" style="width:100%; justify-content:center; margin-top:15px;">
          <button class="btn" id="btn-jogar-novamente">JOGAR NOVAMENTE</button>
          <button class="btn" id="btn-voltar-menu-modal">VOLTAR AO MENU</button>
        </div>
      </div>`;

    this.container.appendChild(modal);

    modal.querySelector("#btn-jogar-novamente")?.addEventListener("click", () => {
      modal.remove();
      this.startRound();
    });
    modal.querySelector("#btn-voltar-menu-modal")?.addEventListener("click", () => {
      modal.remove();
      this.onExit();
    });
  }
}

/** Definição exportada e registrada em game-registry.ts. */
export const wordImageGameDefinition: GameDefinition = {
  metadata: {
    id: "word-image",
    title: "Imagem + Palavra",
    description: "Descubra a palavra usando vogais, consoantes ou espaços em branco.",
    icon: "🖼️",
  },
  create(onExit: OnExitGame): GameInstance {
    return new WordImageGame(onExit);
  },
};
