# Roadmap: adapt gym-workout to new Figma design

## Source material
- Figma "Make" prototype (WebGL, couldn't be fetched directly) — user attached 8 screenshots:
  1. Home dashboard: greeting, "Treino concluído hoje", stats (Sequência/Total/Fichas), quick links (Gerenciar Fichas, Histórico), "Iniciar Treino" list of fichas with colored left bar + colored "Iniciar" button per ficha.
  2. Minhas Fichas list: colored left bar per card, name, description, edit/delete icons, "+ Nova" button.
  3. Editar Ficha: nome, descrição/foco, 6-color picker for ficha color, collapsible exercise cards each with nome, séries, repetições (range "8-12"), peso, descanso (s), grupo muscular dropdown.
  4. Histórico: monthly stats cards, calendar grid with checkmark on days with a session, "Sessões Recentes" list.
  5-7. Execução player: one exercise per screen, progress "n/total", stock photo w/ muscle-group badge, stat chips (Séries/Reps/Peso), inline "Descanso Xs + Iniciar", bottom "Pular"/"✓ Concluído"; rest timer as modal with circular countdown, Pausar/Pular Descanso.
  8. Resumo do Treino: Concluídos/Pulados/Total stats, per-exercise status list (Feito/Pulado), "Finalizar Treino" button.

## Current implementation (confirmed via Explore subagent)
- Types in `src/lib/workout-storage.ts`: `Exercicio {id, descricao, series, pesoSugerido}`, `Ficha {id, nome, exercicios, descanso, createdAt, updatedAt}` (descanso is ficha-global only), `SessaoTreino {..., exerciciosConcluidosIds, startedAt, endedAt, syncedAt}` — binary complete tracking only, no skip state.
- No fields for: cor (ficha color), grupoMuscular, per-exercise descanso, rep ranges, images, streak/sequência.
- `/` (page.tsx) is a marketing/module-links landing page, not a dashboard.
- `/fichas` is a two-column CRUD page (list + form), no color coding, no collapsible cards, no muscle group.
- `/execucao` lists fichas to start + finished sessions + manual "Sincronizar sessões" button.
- `/execucao/sessao/[sessaoId]` shows all exercises in one flat list with toggle complete buttons — no per-exercise player, no rest timer, no skip, no summary screen with pulados count.
- No `/historico` route exists at all.
- `globals.css` is light theme only (mint/peach accents, `--accent: #198754`).
- Sessions sync manually only; fichas sync automatically (recently fixed pull-on-every-load bug).

## Decisions (confirmed with user)
- Delivery: phased — theme + data model first, then feature screens one by one.
- Desktop: keep current two-column layouts (list+form side by side); mobile becomes single-column matching Figma.
- Exercise images: skip for MVP — use an icon/placeholder based on `grupoMuscular` instead of real photos.
- Rep range: store as free-text string (e.g. `"8-12"`), not min/max numbers.
- Streak: consecutive calendar days (local time) with at least one finalized (`endedAt !== null`) session, computed client-side.

## Roadmap phases

### Phase 0 — Design tokens & data model foundation (blocks all later phases)
- Rework `src/app/globals.css`: replace light palette with dark theme tokens matching Figma (near-black background, white/gray text, lime-green primary accent `#loading`, plus a fixed 6-color ficha palette e.g. lime/purple/orange/blue/pink/teal reused for muscle-group badges and ficha left-bar/buttons).
- Extend types in `src/lib/workout-storage.ts`:
  - `Ficha`: add `cor: string` (palette token id, not raw hex).
  - `Exercicio`: add `grupoMuscular: string` (enum-like set matching Figma badges: Peito, Costas, Pernas, Ombro, Bíceps, Tríceps, Abdômen, etc.), `repeticoes: string` (free text, e.g. "8-12"), `descansoSegundos?: number` (optional per-exercise override; falls back to `Ficha.descanso` when absent — keeps `Ficha.descanso` as the default/legacy value for backward compatibility with existing fichas/sessions).
  - `SessaoTreino`: add `exerciciosPuladosIds: string[]` (skipped, distinct from completed) alongside existing `exerciciosConcluidosIds`.
  - Update `normalizeFicha`/`normalizeExercicio`/session normalize logic to default new fields safely for legacy stored data (old fichas without `cor`/`grupoMuscular`/`repeticoes` should get sane defaults, not crash).
- Update MongoDB schemas + API routes to persist new fields: `src/lib/db/fichas.ts` (`FichaDoc`, `toFicha`, `upsertFicha`), `src/lib/db/sessoes.ts` equivalent for `exerciciosPuladosIds`, and the `/api/fichas`, `/api/sessoes` routes (just need to pass through already-normalized objects — verify no field allowlist drops new keys).
- Add a small streak/stats helper (new file, e.g. `src/lib/stats.ts`) with a pure function `calcularSequenciaDias(sessoes: SessaoTreino[]): number` implementing the confirmed streak definition, unit-testable in isolation.

### Phase 1 — Fichas experience (Minhas Fichas + Editar Ficha) — *depends on Phase 0*
- Redesign `src/app/fichas/page.tsx` list rendering: colored left border per card driven by `ficha.cor`, edit (pencil)/delete (trash) icon buttons, "+ Nova" primary button, dark card styling.
- Rework the edit form (same page, responsive: side-by-side on desktop per decision, full-bleed replacing the list on mobile) to add: 6-swatch color picker bound to `ficha.cor`, per-exercise collapsible cards (expand/collapse via chevron, matching Figma), fields per exercise: descrição, séries, repetições (text), peso, descanso (s, optional override), grupo muscular dropdown (fixed list).
- Keep import/export JSON buttons; make sure `normalizeFicha`/`fichas-import-export.ts` round-trip the new fields.

### Phase 2 — Home dashboard — *depends on Phase 0, can run parallel with Phase 1*
- Replace `src/app/page.tsx` marketing content with the dashboard: time-of-day greeting, "Treino concluído hoje" indicator (any session with `endedAt` today), 3 stat cards (Sequência via `calcularSequenciaDias`, Total sessions, Fichas count), quick-link cards to `/fichas` ("Gerenciar Fichas") and `/historico` ("Histórico"), and an "Iniciar Treino" list of fichas (colored bar + colored "Iniciar →" button using `ficha.cor`) that creates a session via existing `createSessao` and routes to `/execucao/sessao/[id]`.
- Keep `AuthButton` accessible (header, per current pattern).

### Phase 3 — Execução player redesign — *depends on Phase 0, ideally after Phase 1 (needs grupoMuscular/repeticoes/descansoSegundos data)*
- Redesign `src/app/execucao/sessao/[sessaoId]/page.tsx` from flat list to single-exercise-per-screen player: progress `n/total`, muscle-group badge/icon placeholder, stat chips (Séries/Reps/Peso), inline "Descanso Xs" + "Iniciar" trigger, bottom "Pular" (skip → adds to `exerciciosPuladosIds`) / "✓ Concluído" (complete → adds to `exerciciosConcluidosIds`) buttons that advance to next exercise.
- Add rest-timer modal component (new, e.g. `src/components/RestTimerModal.tsx`): circular countdown seeded from the exercise's effective descanso (`descansoSegundos ?? ficha.descanso`), Pausar/Pular Descanso controls.
- Add "Resumo do Treino" summary view (replaces current report view) shown after the last exercise or on manual finish: Concluídos/Pulados/Total stat cards, per-exercise status list (Feito/Pulado using the two id arrays), "Finalizar Treino" button that sets `endedAt`.
- Keep `/execucao` page mostly as-is (fichas launcher + manual sync button) unless Phase 2's dashboard fully replaces its "start a session" role — if so, simplify `/execucao` to focus on the "Sessões finalizadas"/sync utility only.

### Phase 4 — Histórico page (new route) — *depends on Phase 0, can run parallel with Phase 3*
- New route `src/app/historico/page.tsx`: monthly stats cards (treinos este mês, total de sessões), a month calendar grid marking days with a finalized session, "Sessões Recentes" list (ficha name, date, duration, x/y exercícios) — reuse/extend session-listing logic currently inline in `src/app/execucao/page.tsx`.
- Wire the "Histórico" quick-link card from Phase 2's dashboard to this route.

## Relevant files
- `src/lib/workout-storage.ts` — types + normalize functions (Phase 0)
- `src/app/globals.css` — theme tokens (Phase 0)
- `src/lib/db/fichas.ts`, `src/lib/db/sessoes.ts`, `src/app/api/fichas/route.ts`, `src/app/api/sessoes/route.ts` — persist new fields (Phase 0)
- `src/lib/stats.ts` (new) — streak calculation (Phase 0)
- `src/app/fichas/page.tsx` — list + edit redesign (Phase 1)
- `src/lib/fichas-import-export.ts` — round-trip new fields (Phase 1)
- `src/app/page.tsx` — dashboard (Phase 2)
- `src/app/execucao/sessao/[sessaoId]/page.tsx` — player + summary (Phase 3)
- `src/components/RestTimerModal.tsx` (new) — rest timer (Phase 3)
- `src/app/execucao/page.tsx` — simplify to launcher/sync utility (Phase 3, depends on Phase 2 decision)
- `src/app/historico/page.tsx` (new) — calendar/history (Phase 4)

## Verification
- `npm run lint` and `npm run build` after each phase.
- Manual: create a ficha with all new fields, run a full session with at least one skip, confirm summary counts match, confirm streak increments day-over-day (can fake by editing localStorage `startedAt`/`endedAt` for a manual date-based test).
- Confirm legacy fichas/sessions (created before this change) still load without crashing (normalize functions must default missing fields).

## Decisions log
- No exercise photo uploads/hosting in this roadmap — muscle-group icon/placeholder only.
- Rep ranges are free text, not structured min/max.
- Streak = consecutive calendar days with ≥1 finalized session, client-computed.
- Desktop keeps two-column layouts; only mobile breakpoints get the new single-column Figma flow.

## Further considerations (open, not yet decided)
1. The Figma player screen has a "+Reps" button in the header whose purpose is ambiguous (possibly logging actual reps performed per set, which would require a new per-set/per-exercise result field not currently in the data model). Recommend deferring this — flag as a future enhancement once its exact behavior is clarified, rather than building it now.
2. Dark theme is a one-way replacement of the current light theme (no light/dark toggle) per this plan — confirm this is acceptable, or a theme toggle could be added later as a separate task.
