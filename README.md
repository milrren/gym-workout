
# Gym Workout

Aplicacao web para montar fichas de treino, acompanhar a execucao dos exercicios e consultar o relatorio de cada sessao.

## Funcionalidades

- **Fichas** (`/fichas`): crie, edite e remova fichas com exercicios, series, peso sugerido e descanso entre series.
- **Importacao e exportacao**: mova fichas entre dispositivos usando arquivos JSON. Um [modelo de ficha](public/ficha-modelo.json) esta disponivel na pagina inicial.
- **Execucao** (`/execucao`): inicie uma sessao a partir de uma ficha, marque exercicios concluidos e acompanhe o progresso.
- **Relatorios**: finalize sessoes e consulte horarios de inicio e fim, exercicios executados e total concluido.
- **Persistencia local**: fichas e sessoes ficam salvas no navegador para uso imediato, mesmo sem login.
- **Sincronizacao**: fichas sao sincronizadas automaticamente quando o usuario esta autenticado; sessoes podem ser sincronizadas manualmente.
- **Timers**: modulo planejado para controle de descanso com alertas.

## Stack

- Next.js 16 com App Router
- React 19 e TypeScript
- Tailwind CSS v4
- Auth.js/NextAuth com Google OAuth
- MongoDB Atlas para autenticacao e sincronizacao

## Como executar

### Requisitos

- Node.js e npm instalados
- MongoDB Atlas e credenciais do Google OAuth apenas para habilitar login e sincronizacao

### Instalacao

```bash
npm install
```

Para usar somente o armazenamento local, inicie a aplicacao. Para habilitar autenticacao, crie `.env.local` na raiz:

```env
DATABASE_URL=mongodb+srv://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AUTH_SECRET=...
```

Consulte [docs/AUTENTICACAO.md](docs/AUTENTICACAO.md) para configurar o Google OAuth, o MongoDB e as URLs de callback.

### Desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Funcao |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run lint` | Executa o ESLint |
| `npm run build` | Gera o build de producao |
| `npm start` | Inicia o servidor de producao |

O projeto ainda nao possui um script de testes automatizados.

## Arquitetura de dados

O fluxo principal e **localStorage-first**:

1. O navegador cria e atualiza fichas e sessoes localmente.
2. Fichas autenticadas sao enviadas automaticamente para a API e mescladas usando `updatedAt`.
3. Sessoes autenticadas sao enviadas quando o usuario aciona **Sincronizar sessoes**.
4. As rotas da API validam a sessao do usuario antes de acessar dados no MongoDB.

Tipos, normalizacao e regras de armazenamento ficam em [src/lib/workout-storage.ts](src/lib/workout-storage.ts). Os detalhes do fluxo de autenticacao estao em [docs/AUTENTICACAO.md](docs/AUTENTICACAO.md).

> **Nota:** [docs/DADOS.md](docs/DADOS.md) contem partes da documentacao anterior ao refactor localStorage-first. Confirme o comportamento no codigo atual antes de usar esse documento como referencia.

## Estrutura principal

```text
src/
	app/
		fichas/                    # CRUD de fichas
		execucao/                  # Sessoes e relatorios
		api/                       # Rotas de autenticacao e sincronizacao
	components/                  # Componentes compartilhados
	lib/
		storage/                   # Persistencia local
		sync/                      # Sincronizacao com a API
		db/                        # Operacoes MongoDB
		workout-storage.ts         # Tipos e normalizacao
```

Para convencoes de desenvolvimento e limites entre as camadas, consulte [AGENTS.md](AGENTS.md).

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
