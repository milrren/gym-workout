"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Exercicio = {
  id: string;
  descricao: string;
  series: number;
  pesoSugerido: number | null;
};

type Ficha = {
  id: string;
  nome: string;
  exercicios: Exercicio[];
  descanso: number;
};

type FormState = {
  nome: string;
  descanso: string;
};

type ExercicioDraft = {
  descricao: string;
  series: string;
  pesoSugerido: string;
};

const STORAGE_KEY = "gym-workout:fichas";

const INITIAL_FORM: FormState = {
  nome: "",
  descanso: "60",
};

const INITIAL_EXERCICIO_DRAFT: ExercicioDraft = {
  descricao: "",
  series: "4",
  pesoSugerido: "",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `ficha-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function normalizeExercicio(input: unknown): Exercicio | null {
  if (typeof input === "string") {
    const descricao = input.trim();

    if (!descricao) {
      return null;
    }

    return {
      id: createId(),
      descricao,
      series: 0,
      pesoSugerido: null,
    };
  }

  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<Exercicio> & {
    descricao?: unknown;
    series?: unknown;
    repeticoes?: unknown;
  };
  const descricao = typeof candidate.descricao === "string" ? candidate.descricao.trim() : "";

  if (!descricao) {
    return null;
  }

  // Accept `repeticoes` for legacy data saved before renaming to `series`.
  const seriesRaw = candidate.series ?? candidate.repeticoes;
  const series =
    typeof seriesRaw === "number" && Number.isFinite(seriesRaw)
      ? seriesRaw
      : Number(seriesRaw);
  const pesoNumero =
    typeof candidate.pesoSugerido === "number" && Number.isFinite(candidate.pesoSugerido)
      ? candidate.pesoSugerido
      : Number(candidate.pesoSugerido);

  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : createId(),
    descricao,
    series: Number.isFinite(series) ? series : 0,
    pesoSugerido: Number.isFinite(pesoNumero) ? pesoNumero : null,
  };
}

function normalizeFicha(input: unknown): Ficha | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<Ficha> & {
    nome?: unknown;
    descanso?: unknown;
    exercicios?: unknown;
  };

  const nome = typeof candidate.nome === "string" ? candidate.nome.trim() : "";
  const descanso = Number(candidate.descanso);

  if (!nome || !Number.isFinite(descanso) || descanso <= 0) {
    return null;
  }

  const exerciciosArray = Array.isArray(candidate.exercicios) ? candidate.exercicios : [];
  const exercicios = exerciciosArray
    .map((item) => normalizeExercicio(item))
    .filter((item): item is Exercicio => item !== null);

  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : createId(),
    nome,
    descanso,
    exercicios,
  };
}

function loadFichasFromStorage(): Ficha[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeFicha(item))
      .filter((item): item is Ficha => item !== null);
  } catch {
    return [];
  }
}

export default function FichasPage() {
  const [fichas, setFichas] = useState<Ficha[]>(loadFichasFromStorage);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [exerciciosCadastro, setExerciciosCadastro] = useState<Exercicio[]>([]);
  const [modalAberta, setModalAberta] = useState(false);
  const [exercicioDraft, setExercicioDraft] = useState<ExercicioDraft>(INITIAL_EXERCICIO_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas));
  }, [fichas]);

  const totalExercicios = useMemo(
    () => fichas.reduce((acc, ficha) => acc + ficha.exercicios.length, 0),
    [fichas],
  );

  function cadastrarFicha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nome = form.nome.trim();
    const descanso = Number(form.descanso);

    if (!nome) {
      setError("Informe o nome da ficha.");
      return;
    }

    if (!exerciciosCadastro.length) {
      setError("Adicione pelo menos um exercicio.");
      return;
    }

    if (!Number.isFinite(descanso) || descanso <= 0) {
      setError("O descanso deve ser um numero maior que zero.");
      return;
    }

    const novaFicha: Ficha = {
      id: createId(),
      nome,
      exercicios: exerciciosCadastro,
      descanso,
    };

    setFichas((current) => [novaFicha, ...current]);
    setForm(INITIAL_FORM);
    setExerciciosCadastro([]);
  }

  function abrirModalExercicio() {
    setModalError(null);
    setExercicioDraft(INITIAL_EXERCICIO_DRAFT);
    setModalAberta(true);
  }

  function fecharModalExercicio() {
    setModalAberta(false);
    setModalError(null);
  }

  function adicionarExercicio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setModalError(null);

    const descricao = exercicioDraft.descricao.trim();
    const series = Number(exercicioDraft.series);
    const pesoSugerido = exercicioDraft.pesoSugerido.trim()
      ? Number(exercicioDraft.pesoSugerido)
      : null;

    if (!descricao) {
      setModalError("Informe a descricao do exercicio.");
      return;
    }

    if (!Number.isFinite(series) || series <= 0) {
      setModalError("As series devem ser maiores que zero.");
      return;
    }

    if (pesoSugerido !== null && (!Number.isFinite(pesoSugerido) || pesoSugerido < 0)) {
      setModalError("O peso sugerido deve ser vazio ou maior/igual a zero.");
      return;
    }

    const novoExercicio: Exercicio = {
      id: createId(),
      descricao,
      series,
      pesoSugerido,
    };

    setExerciciosCadastro((current) => [...current, novoExercicio]);
    setModalAberta(false);
  }

  function removerExercicioCadastro(id: string) {
    setExerciciosCadastro((current) => current.filter((exercicio) => exercicio.id !== id));
  }

  function removerFicha(id: string) {
    setFichas((current) => current.filter((ficha) => ficha.id !== id));
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-6 py-10 sm:px-10">
      <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-[var(--surface-spot)] blur-3xl" />
      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-black/10 bg-white/85 p-7 shadow-lg backdrop-blur sm:p-8">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--accent)] transition hover:underline"
          >
            Voltar para inicio
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Modulo de Fichas
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Cadastre fichas com ID, nome, exercicios e descanso entre series. Os dados ficam
            salvos no cache do navegador por enquanto, prontos para futura migracao para MongoDB
            via funcoes serverless.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Fichas
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{fichas.length}</p>
            </article>
            <article className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Exercicios
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{totalExercicios}</p>
            </article>
            <article className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Persistencia
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">localStorage (client side)</p>
            </article>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={cadastrarFicha}
            className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Nova ficha</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Monte sua lista de exercicios.</p>

            <label className="mt-5 block text-sm font-semibold text-[var(--text-primary)]">
              Nome
              <input
                value={form.nome}
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
                placeholder="Ex: Treino A - Peito e Triceps"
              />
            </label>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Exercicios</p>
                <button
                  type="button"
                  onClick={abrirModalExercicio}
                  className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-black/5"
                >
                  Adicionar exercicio
                </button>
              </div>

              {exerciciosCadastro.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-black/20 bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                  Nenhum exercicio adicionado.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {exerciciosCadastro.map((exercicio, index) => (
                    <li
                      key={exercicio.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-[var(--surface-soft)] p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {index + 1}. {exercicio.descricao}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {exercicio.series} series
                          {exercicio.pesoSugerido !== null ? ` • ${exercicio.pesoSugerido} kg` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerExercicioCadastro(exercicio.id)}
                        className="rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs font-semibold transition hover:bg-black/5"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="mt-4 block text-sm font-semibold text-[var(--text-primary)]">
              Descanso (segundos)
              <input
                type="number"
                min={1}
                value={form.descanso}
                onChange={(event) =>
                  setForm((current) => ({ ...current, descanso: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
              />
            </label>

            {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}

            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"
            >
              Cadastrar ficha
            </button>
          </form>

          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Fichas cadastradas</h2>

            {fichas.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-black/20 bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-secondary)]">
                Nenhuma ficha cadastrada ainda.
              </p>
            ) : (
              <ul className="mt-5 space-y-4">
                {fichas.map((ficha) => (
                  <li key={ficha.id} className="rounded-2xl border border-black/10 bg-[var(--surface-soft)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                          ID: {ficha.id}
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-[var(--text-primary)]">{ficha.nome}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerFicha(ficha.id)}
                        className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-black/5"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-[var(--text-secondary)]">
                      <span className="rounded-full border border-black/15 bg-white px-2 py-1">
                        Descanso: {ficha.descanso}s
                      </span>
                      <span className="rounded-full border border-black/15 bg-white px-2 py-1">
                        Exercicios: {ficha.exercicios.length}
                      </span>
                    </div>

                    <ul className="mt-4 space-y-2">
                      {ficha.exercicios.map((exercicio) => (
                        <li key={exercicio.id} className="rounded-lg bg-white px-3 py-2 text-sm">
                          <p className="font-semibold text-[var(--text-primary)]">{exercicio.descricao}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {exercicio.series} series
                            {exercicio.pesoSugerido !== null ? ` • ${exercicio.pesoSugerido} kg` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      {modalAberta ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Adicionar exercicio</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Informe descricao, series e peso sugerido (opcional).
                </p>
              </div>
              <button
                type="button"
                onClick={fecharModalExercicio}
                className="rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs font-semibold transition hover:bg-black/5"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={adicionarExercicio} className="mt-5">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Descricao
                <input
                  value={exercicioDraft.descricao}
                  onChange={(event) =>
                    setExercicioDraft((current) => ({ ...current, descricao: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
                  placeholder="Ex: Supino reto com barra"
                />
              </label>

              <label className="mt-4 block text-sm font-semibold text-[var(--text-primary)]">
                Series
                <input
                  type="number"
                  min={1}
                  value={exercicioDraft.series}
                  onChange={(event) =>
                    setExercicioDraft((current) => ({ ...current, series: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <label className="mt-4 block text-sm font-semibold text-[var(--text-primary)]">
                Peso sugerido (kg)
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={exercicioDraft.pesoSugerido}
                  onChange={(event) =>
                    setExercicioDraft((current) => ({ ...current, pesoSugerido: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
                  placeholder="Opcional"
                />
              </label>

              {modalError ? <p className="mt-4 text-sm font-medium text-red-600">{modalError}</p> : null}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={fecharModalExercicio}
                  className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-black/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
                >
                  Concluir
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
