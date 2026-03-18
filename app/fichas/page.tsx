"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Ficha = {
  id: string;
  nome: string;
  exercicios: string[];
  descanso: number;
};

type FormState = {
  nome: string;
  exercicios: string;
  descanso: string;
};

const STORAGE_KEY = "gym-workout:fichas";

const INITIAL_FORM: FormState = {
  nome: "",
  exercicios: "",
  descanso: "60",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `ficha-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export default function FichasPage() {
  const [fichas, setFichas] = useState<Ficha[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as Ficha[];
    } catch {
      return [];
    }
  });
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);

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
    const exercicios = form.exercicios
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const descanso = Number(form.descanso);

    if (!nome) {
      setError("Informe o nome da ficha.");
      return;
    }

    if (!exercicios.length) {
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
      exercicios,
      descanso,
    };

    setFichas((current) => [novaFicha, ...current]);
    setForm(INITIAL_FORM);
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
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Digite cada exercicio em uma linha.
            </p>

            <label className="mt-5 block text-sm font-semibold text-[var(--text-primary)]">
              Nome
              <input
                value={form.nome}
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
                placeholder="Ex: Treino A - Peito e Triceps"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-[var(--text-primary)]">
              Exercicios
              <textarea
                value={form.exercicios}
                onChange={(event) =>
                  setForm((current) => ({ ...current, exercicios: event.target.value }))
                }
                className="mt-2 min-h-32 w-full resize-y rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
                placeholder="Supino reto\nCrucifixo\nTriceps corda"
              />
            </label>

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
                        <li key={`${ficha.id}-${exercicio}`} className="rounded-lg bg-white px-3 py-2 text-sm">
                          {exercicio}
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
    </div>
  );
}
