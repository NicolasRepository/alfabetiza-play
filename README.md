# Jogos de Alfabetização — Plataforma Educacional

Refatoração do protótipo original (arquivo único `index.html`) para uma
plataforma escalável e multi-jogo, com backend próprio, autenticação e
banco de dados.

---

## 1. Arquitetura resumida

```
alfabetiza-play/
├── api/                      # Backend: Vercel Serverless Functions (Node.js)
│   ├── _lib/                 # auth (JWT/bcrypt), http helpers, validação (Zod)
│   ├── auth/                 # register, login, logout, me
│   ├── lyrics/                # CRUD de músicas
│   └── media/                 # CRUD de imagens+palavras (novo jogo)
├── db/
│   ├── schema.ts              # ÚNICA fonte de verdade do banco (Drizzle ORM)
│   ├── client.ts               # conexão Neon (driver HTTP serverless)
│   ├── migrate.ts / seed.ts
├── src/                        # Frontend: TypeScript + HTML + CSS puros (Vite)
│   ├── core/                   # api-client, auth-store, types
│   ├── games/
│   │   ├── game-core/          # contrato GameDefinition + registry plugável
│   │   ├── word-image-game/    # NOVO JOGO (vogais/consoantes/lacunas)
│   │   └── lyrics-game/        # jogo original, portado para a nova arquitetura
│   ├── screens/                # menu principal, login, cadastro
│   └── styles/                 # tokens.css, game-shell.css, global.css
└── index.html / vite.config.ts
```

### Por que essa stack

| Camada | Escolha | Motivo |
|---|---|---|
| Frontend | TypeScript + HTML + CSS "vanilla", empacotados com **Vite** | Atende ao requisito de HTML/CSS/TS puro sem framework pesado; Vite dá bundling, HMR e build otimizado para produção. |
| Hospedagem | **Vercel** | Frontend estático + Serverless Functions no mesmo deploy, com preview automático por PR. |
| Backend | Vercel **Serverless Functions** (`/api/**`) | Sem servidor para manter; escala a zero custo quando ocioso. |
| Banco | **Neon Postgres** via `@neondatabase/serverless` + **Drizzle ORM** | Neon é Postgres serverless com driver HTTP — evita esgotar conexões TCP em ambiente de functions efêmeras. Drizzle dá schema tipado e migrações versionadas sem a "caixa preta" de um ORM pesado. |
| Autenticação | Cadastro/login com **bcrypt** (hash de senha) + **JWT** em cookie `httpOnly` | Senha nunca trafega nem é salva em texto puro; sessão em cookie httpOnly não é acessível via JS (mitiga XSS), diferente de guardar token em `localStorage`. |

### Estrutura modular "pronta para novos jogos"

Todo jogo implementa a interface `GameDefinition` (`src/games/game-core/game.interface.ts`):

```ts
interface GameDefinition {
  metadata: { id, title, description, icon };
  create(onExit: () => void): GameInstance; // GameInstance = { mount(), unmount() }
}
```

Para adicionar um jogo novo no futuro:
1. Criar `src/games/<novo-jogo>/`.
2. Implementar `GameDefinition`.
3. Registrar em `src/games/game-core/game-registry.ts` (uma linha).

Nenhuma outra tela (menu, roteador) precisa ser alterada — elas apenas
iteram sobre o registry.

### Requisito crítico de UI/UX (ergonomia para lousa interativa)

Toda tela de jogo é montada dentro de `.game-shell` (`src/styles/game-shell.css`),
que define **apenas duas regiões**:

- `.top-display` — **somente** imagem/texto a observar. Nunca contém elemento clicável.
- `.bottom-controls` — **todos** os elementos interativos (botões de resposta,
  teclado virtual, navegação, inputs), ancorados na base da tela.

Essa classe é compartilhada pelo novo jogo e pelo jogo de músicas refatorado,
então a regra é garantida automaticamente em toda a plataforma — não depende
de lembrar a diretriz em cada tela nova. Os menus (`menu-shell` em
`global.css`) seguem o mesmo espírito: a navegação fica ancorada na metade
inferior via `justify-content: flex-end`. Os botões usam
`--touch-target-min: 64px` (tokens.css), acima do mínimo recomendado para
toque de adultos, pensado para o alcance/motricidade de crianças pequenas.

### O novo jogo: Imagem + Palavra

Lógica isolada e pura (sem DOM) em `src/games/word-image-game/word-mask.util.ts`,
o que a torna facilmente testável:

- **Modo 1 — Apenas Vogais**: revela vogais, oculta consoantes.
- **Modo 2 — Apenas Consoantes**: revela consoantes, oculta vogais.
- **Modo 3 — Espaços em Branco**: oculta todas as letras (só traços).

A classificação vogal/consoante ignora acentuação para não falhar em
palavras como "ABACAXI" ou "PÉ". As letras ocultas são preenchidas pela
criança tocando em um teclado virtual (`virtual-keyboard.ts`) montado
dentro de `.bottom-controls`, junto com os botões de Verificar/Desfazer/Menu.

---

## 2. Modelagem do banco (Neon Postgres via Drizzle)

```sql
-- users: autenticação e conta
users (
  id uuid PK default gen_random_uuid(),
  username varchar(32) UNIQUE NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  password_hash text NOT NULL,       -- bcrypt, nunca texto puro
  role user_role NOT NULL DEFAULT 'teacher', -- admin | teacher | student
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)

-- lyrics: letras de música (jogo "Texto Lacunado/Fatiado")
lyrics (
  id uuid PK default gen_random_uuid(),
  title varchar(160) NOT NULL,
  lines jsonb NOT NULL,               -- array de strings, uma por linha
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)

-- media_items: imagem + palavra associada (jogo "Imagem + Palavra")
media_items (
  id uuid PK default gen_random_uuid(),
  image_url text NOT NULL,
  word varchar(60) NOT NULL,
  category varchar(60),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
)
```

O esquema completo e tipado vive em `db/schema.ts` (única fonte de verdade;
gere migrações com `npm run db:generate` sempre que ele mudar).

---

## 3. Como rodar

### Pré-requisitos
- Node.js ≥ 18.17
- Uma conta [Neon](https://neon.tech) (banco Postgres serverless gratuito)
- Vercel CLI (`npm i -g vercel`) para rodar `api/**` localmente

### Passo a passo

```bash
npm install

# copie o exemplo e preencha DATABASE_URL (Neon) e JWT_SECRET
cp .env.example .env

# gera o SQL de migração a partir de db/schema.ts
npm run db:generate

# aplica as migrações no Neon
npm run db:migrate

# popula dados de exemplo (músicas + imagens/palavras)
npm run db:seed

# roda o backend serverless localmente (porta 3000)
vercel dev

# em outro terminal: roda o frontend com hot-reload (porta 5173, faz proxy de /api -> :3000)
npm run dev
```

### Deploy

```bash
vercel link
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel --prod
```

O `vercel.json` já configura o build do frontend (Vite → `dist/`) e o
runtime Node.js 20 para as funções em `api/**`.

### Cadastrando conteúdo

- Crie uma conta em **Entrar / Cadastrar (Professor)** no menu principal.
- Use `POST /api/lyrics` para cadastrar músicas e `POST /api/media` para
  cadastrar imagens+palavras (ambos exigem sessão de `teacher`/`admin`).
- As imagens podem ser hospedadas em `/public/media/*.png` (servidas
  estaticamente pelo próprio Vercel) ou em um serviço externo (Vercel Blob,
  S3, Cloudinary) — basta que `imageUrl` seja uma URL pública.
