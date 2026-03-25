"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  createId,
  formatDateTime,
  loadFichasFromStorage,
  loadSessoesFromStorage,
  saveSessoesToStorage,
  SessaoTreino,
} from "@/lib/workout-storage";

export default function ExecucaoPage() {
  const router = useRouter();
  const [fichas] = useState(loadFichasFromStorage);
  const [sessoes, setSessoes] = useState(loadSessoesFromStorage);

  const sessoesFinalizadas = useMemo(
    () => sessoes.filter((sessao) => sessao.endedAt !== null),
    [sessoes],
  );

  function iniciarSessao(fichaId: string) {
    const ficha = fichas.find((item) => item.id === fichaId);

    if (!ficha) {
      return;
    }

    const novaSessao: SessaoTreino = {
      id: createId("sessao"),
      fichaId: ficha.id,
      fichaNome: ficha.nome,
      exercicios: ficha.exercicios,
      exerciciosConcluidosIds: [],
      startedAt: new Date().toISOString(),
      endedAt: null,
    };

    const proximasSessoes = [novaSessao, ...sessoes];
    setSessoes(proximasSessoes);
    saveSessoesToStorage(proximasSessoes);

    router.push(`/execucao/sessao/${novaSessao.id}`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-6 py-10 sm:px-10">
      <div className="pointer-events-none absolute -top-24 -left-10 h-72 w-72 rounded-full bg-[var(--surface-spot)] blur-3xl" />
      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-black/10 bg-white/85 p-7 shadow-lg backdrop-blur sm:p-8">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--accent)] transition hover:underline"
          >
            Voltar para inicio
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Modulo de Execucao
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Inicie uma sessao de treino a partir de uma ficha para acompanhar os exercicios
            executados e gerar um relatorio com horario de inicio e fim.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <article className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Iniciar sessao</h2>

            {fichas.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-black/20 bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-secondary)]">
                Nenhuma ficha cadastrada. Crie uma ficha no modulo de Fichas antes de iniciar a
                execucao.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {fichas.map((ficha) => (
                  <li
                    key={ficha.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-[var(--surface-soft)] p-4"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        ID: {ficha.id}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-[var(--text-primary)]">
                        {ficha.nome}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {ficha.exercicios.length} exercicios • descanso {ficha.descanso}s
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => iniciarSessao(ficha.id)}
                      className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                    >
                      Iniciar sessao
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Sessoes finalizadas</h2>

            {sessoesFinalizadas.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-black/20 bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-secondary)]">
                Ainda nao ha sessoes finalizadas.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {sessoesFinalizadas.map((sessao) => (
                  <li key={sessao.id} className="rounded-2xl border border-black/10 bg-[var(--surface-soft)] p-4">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">{sessao.fichaNome}</h3>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      Inicio: {formatDateTime(sessao.startedAt)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Fim: {formatDateTime(sessao.endedAt)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Executados: {sessao.exerciciosConcluidosIds.length}/{sessao.exercicios.length}
                    </p>
                    <Link
                      href={`/execucao/sessao/${sessao.id}`}
                      className="mt-3 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline"
                    >
                      Ver relatorio
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
