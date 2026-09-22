/**
 * src/screens/main-menu.ts
 * Ponto de entrada visual da plataforma: lista os jogos cadastrados no
 * game-registry e dá acesso à área de login/cadastro. Novos jogos
 * aparecem aqui automaticamente assim que registrados — esta tela nunca
 * precisa ser editada para isso.
 */
import { GAME_REGISTRY } from "../games/game-core/game-registry";
import { authStore } from "../core/auth-store";
import type { AppRouter } from "../app";

export function renderMainMenu(container: HTMLElement, router: AppRouter): void {
  const user = authStore.getUser();

  container.innerHTML = `
    <div class="menu-shell">
      <div class="menu-header">
        <h1>JOGOS DE ALFABETIZAÇÃO</h1>
        <p>${user ? `OLÁ, ${user.username.toUpperCase()}!` : "EXPLORE OS JOGOS OU ENTRE COMO PROFESSOR(A)"}</p>
      </div>
      <div class="menu-nav">
        ${GAME_REGISTRY.map(
          (g) => `
          <button class="btn game-card" data-game-id="${g.metadata.id}">
            <span class="icon">${g.metadata.icon}</span>
            <span class="texts">
              <strong>${g.metadata.title}</strong>
              <span>${g.metadata.description}</span>
            </span>
          </button>`
        ).join("")}
        <button class="btn" id="btn-auth-area">
          ${user ? "SAIR DA CONTA" : "ENTRAR / CADASTRAR (PROFESSOR)"}
        </button>
      </div>
    </div>
  `;

  container.querySelectorAll<HTMLButtonElement>("[data-game-id]").forEach((btn) => {
    btn.addEventListener("click", () => router.openGame(btn.dataset["gameId"] as string));
  });

  container.querySelector("#btn-auth-area")?.addEventListener("click", async () => {
    if (user) {
      await authStore.logout();
      router.goToMainMenu();
    } else {
      router.goToLogin();
    }
  });
}
