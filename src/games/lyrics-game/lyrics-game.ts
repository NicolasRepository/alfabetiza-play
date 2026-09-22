/**
 * src/games/lyrics-game/lyrics-game.ts
 * -----------------------------------------------------------------------
 * Jogo original da plataforma (Texto Lacunado / Fatiado / Fatiado+Lacunado),
 * portado do protótipo em index.html para a arquitetura modular e para
 * consumir músicas do banco (via /api/lyrics) em vez de musicas.txt +
 * localStorage.
 *
 * A lógica de negócio (gerar lacunas, embaralhar, verificar) é a mesma do
 * protótipo original — apenas reorganizada em métodos de classe e usando
 * o layout compartilhado .top-display/.bottom-controls (ver game-shell.css),
 * o que já garante a ergonomia de "controles sempre embaixo" também aqui.
 * -----------------------------------------------------------------------
 */
import "./lyrics-game.css";
import { api } from "../../core/api-client";
import type { LyricsSong } from "../../core/types";
import type { GameDefinition, GameInstance, OnExitGame } from "../game-core/game.interface";
import { shuffle } from "../word-image-game/word-mask.util";

type LyricsMode = "lacunado" | "fatiado" | "fatiado-lacunado";

interface LacunaLine {
  inicio: string;
  lacuna: string;
  fim: string;
}

/** Sorteia, em cada linha da música, uma palavra (>2 letras) para virar lacuna. */
function buildLacunaGame(song: LyricsSong): { title: string; lines: LacunaLine[]; words: string[] } {
  const seenLineToWord: Record<string, string> = {};
  const lines: LacunaLine[] = [];
  const words: string[] = [];

  for (const rawLine of song.lines) {
    const normalized = rawLine.trim().toUpperCase();
    let chosenWord = seenLineToWord[normalized] ?? "";

    if (!chosenWord) {
      const candidates = (rawLine.match(/[A-ZÁÉÍÓÚÂÊÔÃÕÇ]+/gi) ?? []).filter((w) => w.length > 2);
      const pool = candidates.length > 0 ? candidates : rawLine.match(/[A-ZÁÉÍÓÚÂÊÔÃÕÇ]+/gi) ?? [];
      if (pool.length > 0) {
        chosenWord = pool[Math.floor(Math.random() * pool.length)] as string;
        seenLineToWord[normalized] = chosenWord;
      }
    }

    const idx = chosenWord ? rawLine.indexOf(chosenWord) : -1;
    if (idx === -1) {
      lines.push({ inicio: rawLine, lacuna: "", fim: "" });
    } else {
      lines.push({ inicio: rawLine.slice(0, idx), lacuna: chosenWord, fim: rawLine.slice(idx + chosenWord.length) });
      words.push(chosenWord);
    }
  }

  return { title: song.title, lines, words };
}

class LyricsGame implements GameInstance {
  private container: HTMLElement | null = null;
  private allSongs: LyricsSong[] = [];
  private mode: LyricsMode | null = null;

  // Estado da partida atual
  private currentSong: LyricsSong | null = null;
  private lacunaGame: { title: string; lines: LacunaLine[]; words: string[] } | null = null;
  private slicedLines: string[] = []; // usado no modo "fatiado"
  private phase: 1 | 2 = 1; // usado só no "fatiado-lacunado"
  private filled: string[] = [];
  private pool: string[] = [];

  constructor(private readonly onExit: OnExitGame) {}

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;
    this.renderModeSelection();
    try {
      const { lyrics } = await api.lyrics.list();
      this.allSongs = lyrics;
    } catch {
      // Falha silenciosa aqui: a tela de escolha de música mostra o aviso
      // de "nenhuma música encontrada" e o professor pode tentar de novo.
      this.allSongs = [];
    }
  }

  unmount(): void {
    this.container = null;
  }

  /* ------------------------- Navegação interna ------------------------- */

  private renderModeSelection(): void {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="game-shell">
        <div class="top-display centered">
          <h1>LETRAS DE MÚSICA</h1>
        </div>
        <div class="bottom-controls">
          <div class="mode-select-list">
            <button class="btn" data-mode="lacunado">TEXTO LACUNADO</button>
            <button class="btn" data-mode="fatiado">TEXTO FATIADO</button>
            <button class="btn" data-mode="fatiado-lacunado">FATIADO E LACUNADO</button>
          </div>
          <div class="action-bar">
            <button class="btn" id="btn-voltar">VOLTAR AO MENU</button>
          </div>
        </div>
      </div>`;

    this.container.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.mode = btn.dataset["mode"] as LyricsMode;
        this.renderChooseSong();
      });
    });
    this.container.querySelector("#btn-voltar")?.addEventListener("click", () => this.onExit());
  }

  private renderChooseSong(): void {
    if (!this.container) return;

    const listHtml =
      this.allSongs.length > 0
        ? this.allSongs
            .map((s, i) => `<button class="btn song-btn" data-song-index="${i}">${s.title}</button>`)
            .join("")
        : `<p class="empty-msg">NENHUMA MÚSICA CADASTRADA AINDA.</p>`;

    this.container.innerHTML = `
      <div class="game-shell">
        <div class="top-display centered">
          <h1>ESCOLHA A MÚSICA</h1>
        </div>
        <div class="bottom-controls">
          <div class="song-list">${listHtml}</div>
          <div class="action-bar">
            <button class="btn" id="btn-sortear" ${this.allSongs.length === 0 ? "disabled" : ""}>SORTEAR</button>
            <button class="btn" id="btn-voltar-modo">VOLTAR</button>
          </div>
        </div>
      </div>`;

    this.container.querySelectorAll<HTMLButtonElement>("[data-song-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset["songIndex"]);
        this.startGame(this.allSongs[index] as LyricsSong);
      });
    });
    this.container.querySelector("#btn-sortear")?.addEventListener("click", () => {
      const song = this.allSongs[Math.floor(Math.random() * this.allSongs.length)];
      if (song) this.startGame(song);
    });
    this.container
      .querySelector("#btn-voltar-modo")
      ?.addEventListener("click", () => this.renderModeSelection());
  }

  /* ------------------------- Partida ------------------------- */

  private startGame(song: LyricsSong): void {
    this.currentSong = song;
    this.phase = 1;
    this.filled = [];

    if (this.mode === "lacunado") {
      this.lacunaGame = buildLacunaGame(song);
      this.pool = shuffle(this.lacunaGame.words);
    } else if (this.mode === "fatiado") {
      this.slicedLines = [...song.lines];
      this.pool = shuffle(this.slicedLines);
    } else {
      this.lacunaGame = buildLacunaGame(song);
      const masked = this.lacunaGame.lines.map((l) => l.inicio + (l.lacuna ? "_______" : "") + l.fim);
      this.pool = shuffle(masked);
    }

    this.renderPlay();
  }

  private totalSlots(): number {
    if (this.mode === "fatiado") return this.slicedLines.length;
    return this.lacunaGame?.lines.length ?? 0;
  }

  private renderPlay(): void {
    if (!this.container || !this.currentSong) return;

    const total = this.totalSlots();
    const isComplete = this.filled.length === total;
    const showsGaps = this.mode === "lacunado" || (this.mode === "fatiado-lacunado" && this.phase === 2);

    let displayHtml = `<div class="song-title">${this.currentSong.title}</div><div class="lyrics-area">`;

    if (showsGaps && this.lacunaGame) {
      this.lacunaGame.lines.forEach((line, i) => {
        displayHtml += `<div class="linha-container">${line.inicio}`;
        displayHtml += this.filled[i]
          ? `<span class="lacuna-preenchida">${this.filled[i]}</span>`
          : `<span class="lacuna-vazia"></span>`;
        displayHtml += `${line.fim}</div>`;
      });
    } else {
      for (let i = 0; i < total; i++) {
        displayHtml += this.filled[i]
          ? `<div class="linha-slot preenchida">${this.filled[i]}</div>`
          : `<div class="linha-slot"></div>`;
      }
    }
    displayHtml += `</div>`;

    const isLineMode = this.mode === "fatiado" || (this.mode === "fatiado-lacunado" && this.phase === 1);

    this.container.innerHTML = `
      <div class="game-shell">
        <div class="top-display">${displayHtml}</div>
        <div class="bottom-controls">
          <div id="feedback-msg">${isComplete ? "MUITO BEM! TOQUE EM VERIFICAR." : "TOQUE NA OPÇÃO ABAIXO PARA PREENCHER:"}</div>
          <div class="pool-area">
            ${this.pool
              .map(
                (item, i) =>
                  `<button class="item-interativo ${isLineMode ? "linha" : ""}" data-pool-index="${i}">${item}</button>`
              )
              .join("")}
          </div>
          <div class="action-bar">
            <button class="btn" id="btn-menu">MENU</button>
            <button class="btn" id="btn-desfazer" ${this.filled.length === 0 ? "disabled" : ""}>DESFAZER</button>
            <button class="btn" id="btn-verificar" ${!isComplete ? "disabled" : ""}>VERIFICAR</button>
          </div>
        </div>
      </div>`;

    this.container.querySelectorAll<HTMLButtonElement>("[data-pool-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset["poolIndex"]);
        this.selectItem(this.pool[i] as string, i);
      });
    });
    this.container.querySelector("#btn-menu")?.addEventListener("click", () => this.onExit());
    this.container.querySelector("#btn-desfazer")?.addEventListener("click", () => this.undo());
    this.container.querySelector("#btn-verificar")?.addEventListener("click", () => this.verify());
  }

  private selectItem(item: string, poolIndex: number): void {
    if (this.filled.length >= this.totalSlots()) return;
    this.filled.push(item);
    this.pool.splice(poolIndex, 1);
    this.renderPlay();
  }

  private undo(): void {
    const removed = this.filled.pop();
    if (removed !== undefined) this.pool.push(removed);
    this.renderPlay();
  }

  private verify(): void {
    const total = this.totalSlots();
    let correct = 0;

    if (this.mode === "lacunado" || (this.mode === "fatiado-lacunado" && this.phase === 2)) {
      this.lacunaGame?.lines.forEach((line, i) => {
        if (this.filled[i]?.trim().toUpperCase() === line.lacuna.trim().toUpperCase()) correct++;
      });
    } else if (this.mode === "fatiado") {
      this.slicedLines.forEach((line, i) => {
        if (this.filled[i]?.trim().toUpperCase() === line.trim().toUpperCase()) correct++;
      });
    } else if (this.mode === "fatiado-lacunado" && this.phase === 1 && this.lacunaGame) {
      const expected = this.lacunaGame.lines.map((l) => l.inicio + (l.lacuna ? "_______" : "") + l.fim);
      expected.forEach((exp, i) => {
        if (this.filled[i]?.trim().toUpperCase() === exp.trim().toUpperCase()) correct++;
      });
    }

    if (correct === total && this.mode === "fatiado-lacunado" && this.phase === 1) {
      this.showPhaseTransitionModal();
    } else {
      this.showResultModal(correct, total);
    }
  }

  private showPhaseTransitionModal(): void {
    if (!this.container) return;
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content" style="align-items:center;text-align:center;">
        <h2>MUITO BEM! 🎉</h2>
        <p>AGORA VAMOS PREENCHER AS PALAVRAS QUE FALTAM?</p>
        <div class="modal-btn-group" style="justify-content:center;">
          <button class="btn" id="btn-fase-2">VAMOS LÁ!</button>
        </div>
      </div>`;
    this.container.appendChild(modal);
    modal.querySelector("#btn-fase-2")?.addEventListener("click", () => {
      modal.remove();
      this.phase = 2;
      this.filled = [];
      this.pool = shuffle(this.lacunaGame?.words ?? []);
      this.renderPlay();
    });
  }

  private showResultModal(correct: number, total: number): void {
    if (!this.container || !this.currentSong) return;
    const perfect = correct === total;
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content" style="align-items:center;text-align:center;">
        <h2>FIM DE JOGO!</h2>
        <h3>VOCÊ ACERTOU ${correct} DE ${total}</h3>
        <h4>${perfect ? "🎉 PARABÉNS! ESTÁ PERFEITO! 🎉" : "VAMOS TENTAR NOVAMENTE? 🤔"}</h4>
        <div class="modal-btn-group" style="justify-content:center;">
          <button class="btn" id="btn-jogar-novamente">JOGAR NOVAMENTE</button>
          <button class="btn" id="btn-voltar-menu">VOLTAR AO MENU</button>
        </div>
      </div>`;
    this.container.appendChild(modal);
    modal.querySelector("#btn-jogar-novamente")?.addEventListener("click", () => {
      modal.remove();
      this.startGame(this.currentSong as LyricsSong);
    });
    modal.querySelector("#btn-voltar-menu")?.addEventListener("click", () => {
      modal.remove();
      this.onExit();
    });
  }
}

export const lyricsGameDefinition: GameDefinition = {
  metadata: {
    id: "lyrics",
    title: "Letras de Música",
    description: "Complete a letra da música no modo lacunado, fatiado ou os dois juntos.",
    icon: "🎵",
  },
  create(onExit: OnExitGame): GameInstance {
    return new LyricsGame(onExit);
  },
};
