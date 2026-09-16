"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { deleteFicha as deleteFichaLocal, FICHAS_CHANGE_EVENT, listFichas } from "@/lib/storage/fichas-local";
import { pushDeleteFicha } from "@/lib/sync/fichas-sync";
import { Ficha } from "@/lib/workout-storage";

const FICHA_COLOR_MAP: Record<string, string> = {
  lime: "#a3e635",
  purple: "#a78bfa",
  orange: "#fbbf24",
  blue: "#60a5fa",
  pink: "#f472b6",
  teal: "#2dd4bf",
};

export default function FichasPage() {
  const { status } = useSession();
  const autenticado = status === "authenticated";
  const [fichas, setFichas] = useState<Ficha[]>([]);

  useEffect(() => {
    function carregar() {
      setFichas(listFichas());
    }

    carregar();
    window.addEventListener(FICHAS_CHANGE_EVENT, carregar);
    return () => window.removeEventListener(FICHAS_CHANGE_EVENT, carregar);
  }, []);

  const totalExercicios = useMemo(
    () => fichas.reduce((acc, ficha) => acc + ficha.exercicios.length, 0),
    [fichas],
  );

  function removerFicha(id: string) {
    const removida = deleteFichaLocal(id);

    if (removida && autenticado) {
      pushDeleteFicha(id);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-24 -right-16 hidden h-72 w-72 rounded-full bg-[var(--surface-spot)] blur-3xl sm:block" />
      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6 md:gap-8">
        <header className="rounded-2xl border border-white/10 bg-[#111c1a]/90 p-4 shadow-[0_20px_35px_rgba(0,0,0,0.25)] backdrop-blur sm:rounded-3xl sm:p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--accent)] transition hover:underline"
            >
              Voltar para inicio
            </Link>
            <Link
              href="/fichas/novo"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#0a120f] transition hover:brightness-95"
            >
              + Nova
            </Link>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl md:text-4xl">
            Módulo de Fichas
          </h1>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-[#172420] p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Fichas
              </p>
              <p className="mt-2 text-xl font-bold text-[var(--text-primary)] sm:text-2xl md:text-3xl">
                {fichas.length}
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-[#172420] p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Exercícios
              </p>
              <p className="mt-2 text-xl font-bold text-[var(--text-primary)] sm:text-2xl md:text-3xl">
                {totalExercicios}
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-[#172420] p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Persistência
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                {autenticado ? "Local + sincronizado" : "Local (faça login para sincronizar)"}
              </p>
            </article>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.25)] sm:rounded-3xl sm:p-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Fichas cadastradas</h2>

          {fichas.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-white/15 bg-[#172420] p-4 text-sm text-[var(--text-secondary)]">
              Nenhuma ficha cadastrada ainda.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {fichas.map((ficha) => (
                <li
                  key={ficha.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#172420]"
                  style={{ borderLeft: `4px solid ${FICHA_COLOR_MAP[ficha.cor] ?? FICHA_COLOR_MAP.lime}` }}
                >
                  <div className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                          ID: {ficha.id}
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-[var(--text-primary)]">{ficha.nome}</h3>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/fichas/novo?id=${encodeURIComponent(ficha.id)}`}
                          aria-label={`Editar ${ficha.nome}`}
                          className="rounded-lg border border-white/10 bg-[#0f1715] px-2.5 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        >
                          ✎
                        </Link>
                        <button
                          type="button"
                          onClick={() => removerFicha(ficha.id)}
                          aria-label={`Remover ${ficha.nome}`}
                          className="rounded-lg border border-white/10 bg-[#0f1715] px-2.5 py-2 text-sm text-[var(--text-primary)] transition hover:border-red-400 hover:text-red-300"
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                      <span className="rounded-full border border-white/10 bg-[#0f1715] px-2 py-1">
                        Descanso: {ficha.descanso}s
                      </span>
                      <span className="rounded-full border border-white/10 bg-[#0f1715] px-2 py-1">
                        Exercícios: {ficha.exercicios.length}
                      </span>
                      <span className="rounded-full border border-white/10 bg-[#0f1715] px-2 py-1">
                        Cor: {ficha.cor || "lime"}
                      </span>
                    </div>

                    <ul className="mt-4 space-y-2">
                      {ficha.exercicios.map((exercicio) => (
                        <li key={exercicio.id} className="rounded-xl border border-white/10 bg-[#0f1715] px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-[var(--text-primary)]">{exercicio.descricao}</p>
                            <span className="rounded-full border border-white/10 bg-[#172420] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                              {exercicio.grupoMuscular || "Peito"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {exercicio.series} séries • {exercicio.repeticoes || "8-12"} reps
                            {exercicio.pesoSugerido !== null ? ` • ${exercicio.pesoSugerido} kg` : ""}
                            {exercicio.descansoSegundos ? ` • descanso ${exercicio.descansoSegundos}s` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
