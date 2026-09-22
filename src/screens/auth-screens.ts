/**
 * src/screens/auth-screens.ts
 * Telas de login e cadastro (fluxo do "professor", que cadastra músicas
 * e imagens). Alunos podem jogar sem conta; a conta só é exigida nas
 * rotas de escrita da API (ver requireSession/requireRole no backend).
 */
import { authStore } from "../core/auth-store";
import { ApiError } from "../core/api-client";
import type { AppRouter } from "../app";

export function renderLogin(container: HTMLElement, router: AppRouter): void {
  container.innerHTML = `
    <div class="menu-shell">
      <div class="menu-header">
        <h1>ENTRAR</h1>
      </div>
      <form class="menu-nav" id="login-form" novalidate>
        <div class="form-field">
          <label for="identifier">E-MAIL OU USUÁRIO</label>
          <input id="identifier" name="identifier" autocomplete="username" required />
        </div>
        <div class="form-field">
          <label for="password">SENHA</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required />
        </div>
        <div class="form-error" id="form-error"></div>
        <button class="btn" type="submit">ENTRAR</button>
        <button class="btn" type="button" id="btn-ir-cadastro">CRIAR CONTA</button>
        <button class="btn" type="button" id="btn-voltar">VOLTAR</button>
      </form>
    </div>
  `;

  const form = container.querySelector<HTMLFormElement>("#login-form")!;
  const errorEl = container.querySelector<HTMLElement>("#form-error")!;

  form.addEventListener("submit", async (evt) => {
    evt.preventDefault();
    errorEl.textContent = "";
    const identifier = (form.elements.namedItem("identifier") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      await authStore.login(identifier, password);
      router.goToMainMenu();
    } catch (err) {
      errorEl.textContent = err instanceof ApiError ? err.message : "Erro ao entrar.";
    }
  });

  container.querySelector("#btn-ir-cadastro")?.addEventListener("click", () => router.goToRegister());
  container.querySelector("#btn-voltar")?.addEventListener("click", () => router.goToMainMenu());
}

export function renderRegister(container: HTMLElement, router: AppRouter): void {
  container.innerHTML = `
    <div class="menu-shell">
      <div class="menu-header">
        <h1>CRIAR CONTA</h1>
      </div>
      <form class="menu-nav" id="register-form" novalidate>
        <div class="form-field">
          <label for="username">NOME DE USUÁRIO</label>
          <input id="username" name="username" autocomplete="username" required minlength="3" />
        </div>
        <div class="form-field">
          <label for="email">E-MAIL</label>
          <input id="email" name="email" type="email" autocomplete="email" required />
        </div>
        <div class="form-field">
          <label for="password">SENHA (MÍN. 8 CARACTERES)</label>
          <input id="password" name="password" type="password" autocomplete="new-password" required minlength="8" />
        </div>
        <div class="form-error" id="form-error"></div>
        <button class="btn" type="submit">CRIAR CONTA</button>
        <button class="btn" type="button" id="btn-voltar">VOLTAR</button>
      </form>
    </div>
  `;

  const form = container.querySelector<HTMLFormElement>("#register-form")!;
  const errorEl = container.querySelector<HTMLElement>("#form-error")!;

  form.addEventListener("submit", async (evt) => {
    evt.preventDefault();
    errorEl.textContent = "";
    const username = (form.elements.namedItem("username") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      await authStore.register(username, email, password);
      router.goToMainMenu();
    } catch (err) {
      errorEl.textContent = err instanceof ApiError ? err.message : "Erro ao criar conta.";
    }
  });

  container.querySelector("#btn-voltar")?.addEventListener("click", () => router.goToMainMenu());
}
