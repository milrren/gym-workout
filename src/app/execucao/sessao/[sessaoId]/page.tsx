"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime, SessaoTreino } from "@/lib/workout-storage";
import { getSessao, updateSessao } from "@/lib/storage/sessoes-local";

export default function SessaoPage() {
  const params = useParams<{ sessaoId: string }>();
  const sessaoId = params.sessaoId;

  const [sessao, setSessao] = useState<SessaoTreino | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    function carregar() {
      setSessao(getSessao(sessaoId));
      setCarregado(true);
    }

    carregar();
  }, [sessaoId]);

  const notFound = carregado && sessao === null;

  const exerciciosExecutados = useMemo(() => {
    if (!sessao) {
      return [];
    }

    return sessao.exercicios.filter((exercicio) =>
      sessao.exerciciosConcluidosIds.includes(exercicio.id),
    );
  }, [sessao]);

  function atualizarSessao(data: Partial<Pick<SessaoTreino, "exerciciosConcluidosIds" | "endedAt">>) {
    if (!sessao) {
      return;
    }

    const atualizada = updateSessao(sessao.id, data);
    if (atualizada) {
      setSessao(atualizada);
    }
  }

  function alternarExercicioConcluido(exercicioId: string) {
    if (!sessao || sessao.endedAt) {
      return;
    }

    const jaConcluido = sessao.exerciciosConcluidosIds.includes(exercicioId);
    const exerciciosConcluidosIds = jaConcluido
      ? sessao.exerciciosConcluidosIds.filter((id) => id !== exercicioId)
      : [...sessao.exerciciosConcluidosIds, exercicioId];

    atualizarSessao({ exerciciosConcluidosIds });
  }

  function concluirSessao() {
    if (!sessao || sessao.endedAt) {
      return;
    }

    atualizarSessao({ endedAt: new Date().toISOString() });
  }


  if (notFound) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
        <main className="mx-auto w-full max-w-3xl rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-8">
          <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">Sessao nao encontrada</h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            A sessao informada nao existe ou foi removida.
          </p>
          <Link
            href="/execucao"
            className="mt-6 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline"
          >
            Voltar para execucao
          </Link>
        </main>
      </div>
    );
  }

  if (!sessao) {
    return null;
  }

  const percentualExecutado =
    sessao.exercicios.length === 0
      ? 0
      : Math.round((sessao.exerciciosConcluidosIds.length / sessao.exercicios.length) * 100);

  if (sessao.endedAt) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
        <div className="pointer-events-none absolute -top-16 right-10 hidden h-64 w-64 rounded-full bg-[var(--surface-spot-secondary)] blur-3xl sm:block" />
        <main className="relative mx-auto w-full max-w-4xl">
          <section className="rounded-2xl border border-black/10 bg-[#fff9e5] p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl md:text-3xl">
              Relatorio da sessao
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Ficha: <span className="font-semibold text-[var(--text-primary)]">{sessao.fichaNome}</span>
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Inicio: {formatDateTime(sessao.startedAt)}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Fim: {formatDateTime(sessao.endedAt)}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-black/10 bg-white p-3 sm:p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  Executados
                </p>
                <p className="mt-2 text-xl font-bold text-[var(--text-primary)] sm:text-2xl md:text-3xl">
                  {sessao.exerciciosConcluidosIds.length}
                </p>
              </article>
              <article className="rounded-2xl border border-black/10 bg-white p-3 sm:p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  Total
                </p>
                <p className="mt-2 text-xl font-bold text-[var(--text-primary)] sm:text-2xl md:text-3xl">
                  {sessao.exercicios.length}
                </p>
              </article>
            </div>

            <h2 className="mt-5 text-base font-bold text-[var(--text-primary)]">Exercicios executados</h2>
            {exerciciosExecutados.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Nenhum exercicio foi concluido.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {exerciciosExecutados.map((exercicio) => (
                  <li key={exercicio.id} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm">
                    {exercicio.descricao}
                  </li>
                ))}
              </ul>
            )}

            <Link
              href="/execucao"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"
            >
              Voltar para pagina de sessoes
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-16 right-10 hidden h-64 w-64 rounded-full bg-[var(--surface-spot-secondary)] blur-3xl sm:block" />
      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-6">
        <header className="rounded-2xl border border-black/10 bg-white/90 p-4 shadow-lg backdrop-blur sm:rounded-3xl sm:p-6 md:p-8">
          <Link
            href="/execucao"
            className="text-sm font-semibold text-[var(--accent)] transition hover:underline"
          >
            Voltar para modulo de execucao
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl md:text-4xl">
            Sessao de treino
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Ficha: <span className="font-semibold text-[var(--text-primary)]">{sessao.fichaNome}</span>
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Inicio: {formatDateTime(sessao.startedAt)}
          </p>

          <div className="mt-4 h-2 w-full rounded-full bg-[var(--surface-soft)]">
            <div
              className="h-2 rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${percentualExecutado}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            {sessao.exerciciosConcluidosIds.length}/{sessao.exercicios.length} exercicios executados
          </p>
        </header>

        <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Exercicios da sessao</h2>
          {sessao.exercicios.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-black/20 bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-secondary)]">
              Esta ficha nao possui exercicios.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {sessao.exercicios.map((exercicio) => {
                const concluido = sessao.exerciciosConcluidosIds.includes(exercicio.id);

                return (
                  <li
                    key={exercicio.id}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      concluido ? "border-green-200 bg-green-50" : "border-black/10 bg-[var(--surface-soft)]"
                    }`}
                  >
                    <div>
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        {exercicio.descricao}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {exercicio.series} series
                        {exercicio.pesoSugerido !== null ? ` • ${exercicio.pesoSugerido} kg` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => alternarExercicioConcluido(exercicio.id)}
                      className={`w-full shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:w-auto sm:py-2 ${
                        concluido
                          ? "bg-green-600 text-white hover:brightness-95"
                          : "border border-black/15 bg-white text-[var(--text-primary)] hover:bg-black/5"
                      }`}
                    >
                      <span className="sm:hidden">{concluido ? "Concluido" : "Concluir"}</span>
                      <span className="hidden sm:inline">
                        {concluido ? "Concluido" : "Marcar como concluido"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={concluirSessao}
            className="mt-6 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"
          >
            Concluir
          </button>
        </section>
      </main>
    </div>
  );
}
