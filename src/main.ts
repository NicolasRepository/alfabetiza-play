/**
 * src/main.ts
 * Ponto de entrada do bundle (referenciado pelo index.html via <script type="module">).
 */
import "./styles/global.css";
import { App } from "./app";
import { authStore } from "./core/auth-store";

async function bootstrap() {
  const root = document.getElementById("app");
  if (!root) throw new Error('Elemento raiz "#app" não encontrado no index.html.');

  // Resolve a sessão (via cookie httpOnly) antes de desenhar o menu, para
  // já mostrar "Olá, Professor(a)" / esconder o botão de login corretamente.
  await authStore.init();

  const app = new App(root);
  app.goToMainMenu();
}

bootstrap().catch((err) => {
  console.error("Falha ao iniciar a aplicação:", err);
});
