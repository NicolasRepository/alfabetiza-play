/**
 * src/games/word-image-game/virtual-keyboard.ts
 * Bandeja de letras clicáveis (teclado virtual simplificado). Componente
 * "burro": só desenha os botões recebidos e dispara um callback ao
 * clicar — toda a regra de jogo fica em word-image-game.ts.
 *
 * É deliberadamente reutilizável: qualquer jogo futuro que precise de um
 * banco de letras pode importar este componente em vez de duplicar HTML.
 */

export interface VirtualKeyboardOptions {
  letters: string[];
  onLetterClick: (letter: string, buttonEl: HTMLButtonElement) => void;
  disabled?: boolean;
}

export function renderVirtualKeyboard(options: VirtualKeyboardOptions): HTMLDivElement {
  const { letters, onLetterClick, disabled = false } = options;

  const wrapper = document.createElement("div");
  wrapper.className = "letter-bank";
  wrapper.setAttribute("role", "group");
  wrapper.setAttribute("aria-label", "Banco de letras");

  letters.forEach((letter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "letter-key";
    button.textContent = letter;
    button.disabled = disabled;
    // touch-action: manipulation evita o delay de 300ms de "double tap zoom"
    // em tablets/lousas — resposta instantânea ao toque da criança.
    button.style.touchAction = "manipulation";
    button.addEventListener("click", () => onLetterClick(letter, button));
    wrapper.appendChild(button);
  });

  return wrapper;
}
