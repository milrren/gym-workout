"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime, SessaoTreino } from "@/lib/workout-storage";
import { listSessoes, SESSOES_CHANGE_EVENT } from "@/lib/storage/sessoes-local";

export default function ExecucaoPage() {
  const [sessoes, setSessoes] = useState<SessaoTreino[]>([]);

  useEffect(() => {
    function carregarSessoes() {
      setSessoes(listSessoes());
    }

    carregarSessoes();
    window.addEventListener(SESSOES_CHANGE_EVENT, carregarSessoes);
    return () => window.removeEventListener(SESSOES_CHANGE_EVENT, carregarSessoes);
  }, []);

  const sessoesFinalizadas = useMemo(
    () => sessoes.filter((sessao) => sessao.endedAt !== null).slice(0, 8),
    [sessoes],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-24 -left-10 hidden h-72 w-72 rounded-full bg-[var(--surface-spot)] blur-3xl sm:block" />
      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6 md:gap-8">
        <header className="rounded-2xl border border-white/10 bg-[#111c1a]/90 p-4 shadow-[0_20px_35px_rgba(0,0,0,0.25)] backdrop-blur sm:rounded-3xl sm:p-6 md:p-8">
          <Link href="/" className="text-sm font-semibold text-[var(--accent)] hover:underline">
            Voltar para início
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl md:text-4xl">
            Execução
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Este fluxo foi aposentado. As sessões passam a ser acompanhadas no histórico, mantendo apenas as últimas ocorrências e suas métricas resumidas.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/historico"
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#0a120f] transition hover:brightness-95"
            >
              Ver histórico
            </Link>
            <Link
              href="/fichas"
              className="rounded-xl border border-white/10 bg-[#172420] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Gerenciar fichas
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.25)] sm:rounded-3xl sm:p-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Últimas sessões</h2>

          {sessoesFinalizadas.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-white/15 bg-[#172420] p-4 text-sm text-[var(--text-secondary)]">
              Ainda não há sessões finalizadas para registrar no histórico.
            </p>
          ) : (
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {sessoesFinalizadas.map((sessao) => {
                const dataFim = new Date(sessao.endedAt as string);
                const dataInicio = new Date(sessao.startedAt);
                const duracaoMinutos = Math.max(
                  1,
                  Math.round((dataFim.getTime() - dataInicio.getTime()) / 60000),
                );

                return (
                  <li key={sessao.id} className="rounded-2xl border border-white/10 bg-[#172420] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-[var(--text-primary)]">{sessao.fichaNome}</h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{formatDateTime(sessao.endedAt)}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-[#0f1715] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        {duracaoMinutos} min
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <span className="rounded-full border border-white/10 bg-[#0f1715] px-2 py-1">
                        {sessao.exerciciosConcluidosIds.length} concluídos
                      </span>
                      <span className="rounded-full border border-white/10 bg-[#0f1715] px-2 py-1">
                        {sessao.exerciciosPuladosIds.length} pulados
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
