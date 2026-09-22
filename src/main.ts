/**
 * src/main.ts
 * Ponto de entrada do bundle (referenciado pelo index.html via <script type="module">).
 */
import "./styles/global.css";
import { App } from "./app";
import { authStore } from "./core/auth-store";

function renderFatalError(root: HTMLElement, err: unknown): void {
  console.error("Falha ao iniciar a aplicação:", err);
  root.innerHTML = `
    <div style="max-width:480px;margin:15vh auto;padding:24px;font-family:system-ui,sans-serif;text-align:center;">
      <h1 style="font-size:1.25rem;margin-bottom:8px;">Não foi possível carregar o app</h1>
      <p style="color:#555;margin-bottom:16px;">
        Ocorreu um erro ao iniciar a aplicação. Tente recarregar a página.
      </p>
      <button id="reload-btn" style="padding:8px 16px;border-radius:6px;border:1px solid #ccc;cursor:pointer;">
        Recarregar
      </button>
    </div>
  `;
  root.querySelector("#reload-btn")?.addEventListener("click", () => location.reload());
}

async function bootstrap() {
  const root = document.getElementById("app");
  if (!root) throw new Error('Elemento raiz "#app" não encontrado no index.html.');

  // Resolve a sessão (via cookie httpOnly) antes de desenhar o menu, para
  // já mostrar "Olá, Professor(a)" / esconder o botão de login corretamente.
  // Se a checagem de sessão falhar (API fora do ar, env var faltando etc.),
  // não deixamos isso travar o app inteiro: seguimos como usuário deslogado.
  try {
    await authStore.init();
  } catch (err) {
    console.error("Falha ao resolver sessão; seguindo como deslogado.", err);
  }

  const app = new App(root);
  app.goToMainMenu();
}

bootstrap().catch((err) => {
  const root = document.getElementById("app");
  if (root) renderFatalError(root, err);
  else console.error("Falha ao iniciar a aplicação:", err);
});
