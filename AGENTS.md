# Gym Workout Agent Guide

## Project shape

- This is a Next.js 16 App Router application using React 19, TypeScript, Tailwind CSS v4, Auth.js/NextAuth, and MongoDB.
- Domain terminology and user-facing copy are Portuguese; keep existing domain names such as `ficha`, `sessao`, `exercicio`, and `descanso`.
- The current data design is localStorage-first. Treat the implementation and `src/lib/workout-storage.ts` as authoritative when documentation conflicts.

## Commands

```bash
npm install
npm run dev       # http://localhost:3000
npm run lint
npm run build
npm start
```

There is no test script configured in `package.json`. Authentication and database work requires `.env.local` with `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `AUTH_SECRET`; see [docs/AUTENTICACAO.md](docs/AUTENTICACAO.md).

## Architecture boundaries

- Types, IDs, timestamps, and input normalization live in [src/lib/workout-storage.ts](src/lib/workout-storage.ts). Normalize imported, local, and server JSON before using it.
- Browser CRUD lives in [src/lib/storage/fichas-local.ts](src/lib/storage/fichas-local.ts) and [src/lib/storage/sessoes-local.ts](src/lib/storage/sessoes-local.ts). Preserve their localStorage keys and change-event contracts.
- Sync behavior lives in [src/lib/sync/fichas-sync.ts](src/lib/sync/fichas-sync.ts) and [src/lib/sync/sessoes-sync.ts](src/lib/sync/sessoes-sync.ts). Fichas sync automatically after authenticated mutations and use last-write-wins by ISO `updatedAt`; sessions sync only through the explicit workflow in `/execucao`.
- API routes under [src/app/api](src/app/api) require an authenticated user resolved through [src/lib/identity.ts](src/lib/identity.ts), return `401` when unauthenticated, and upsert client-generated IDs.
- MongoDB access belongs in [src/lib/db](src/lib/db), with the shared client from [src/lib/mongodb.ts](src/lib/mongodb.ts). Do not move client-only storage or sync decisions into database helpers.
- [src/components/FichasSyncManager.tsx](src/components/FichasSyncManager.tsx) pulls and merges fichas from the server on every authenticated app load (not just once per login); a ref guard only prevents duplicate concurrent calls within the same mount.

## Data and mutation rules

- Use ISO timestamp strings from `new Date().toISOString()`; keep `createdAt` immutable and update `updatedAt` on every mutation.
- Create new objects when changing fichas or sessions; do not mutate stored objects in place.
- `syncedAt` is local-only for sessions and must not be sent to the server.
- Keep user isolation in every API/database query. Use `resolveUserId()` rather than inventing another identity or guest-data path.
- Preserve the `gym-workout:<entity>` localStorage keys and `gym-workout:<entity>-changed` events unless a migration is intentional and documented.

## React and styling conventions

- ESLint rejects direct `setState(...)` calls in an effect body. Put the state-changing work in a named function declared inside `useEffect`, then call that function and register it for relevant events.
- Follow the existing CSS variables and visual language in [src/app/globals.css](src/app/globals.css); avoid introducing a parallel styling system.
- Keep browser-only storage access in client components or client-side modules and guard it from server execution.

## Documentation note

[docs/AUTENTICACAO.md](docs/AUTENTICACAO.md) documents the Auth.js and MongoDB setup. [docs/DADOS.md](docs/DADOS.md) contains older pre-refactor assumptions about MongoDB being the sole source of truth and anonymous users; verify those sections against the current code before relying on them.

Before finishing changes, run `npm run lint` and, for build-affecting changes, `npm run build`.