"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime, SessaoTreino } from "@/lib/workout-storage";
import { listSessoes, SESSOES_CHANGE_EVENT } from "@/lib/storage/sessoes-local";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

export default function HistoricoPage() {
  const [sessoes, setSessoes] = useState<SessaoTreino[]>([]);
  const [mesAtual, setMesAtual] = useState(() => new Date());

  useEffect(() => {
    function carregar() {
      setSessoes(listSessoes());
    }

    carregar();
    window.addEventListener(SESSOES_CHANGE_EVENT, carregar);
    return () => window.removeEventListener(SESSOES_CHANGE_EVENT, carregar);
  }, []);

  const sessoesFinalizadas = useMemo(
    () => sessoes.filter((sessao) => sessao.endedAt !== null),
    [sessoes],
  );

  const mesSessoes = useMemo(
    () =>
      sessoesFinalizadas.filter((sessao) => {
        const data = new Date(sessao.endedAt as string);
        return (
          data.getMonth() === mesAtual.getMonth() && data.getFullYear() === mesAtual.getFullYear()
        );
      }),
    [mesAtual, sessoesFinalizadas],
  );

  const totalExercicios = useMemo(
    () => mesSessoes.reduce((acc, sessao) => acc + sessao.exerciciosConcluidosIds.length, 0),
    [mesSessoes],
  );

  const totalSessoes = mesSessoes.length;

  const diasComTreino = useMemo(() => {
    const set = new Set(
      mesSessoes
        .map((sessao) => new Date(sessao.endedAt as string))
        .filter((date) => !Number.isNaN(date.getTime()))
        .map((date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`),
    );

    return set;
  }, [mesSessoes]);

  const diasDoMes = useMemo(() => {
    const totalDias = getDaysInMonth(mesAtual);
    const primeiroDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
    const diaInicial = primeiroDia.getDay();
    const cells: Array<{ key: string; dia: number; isCurrentMonth: boolean }> = [];

    for (let index = 0; index < diaInicial; index += 1) {
      cells.push({ key: `empty-before-${index}`, dia: 0, isCurrentMonth: false });
    }

    for (let dia = 1; dia <= totalDias; dia += 1) {
      cells.push({ key: `dia-${dia}`, dia, isCurrentMonth: true });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ key: `empty-after-${cells.length}`, dia: 0, isCurrentMonth: false });
    }

    return cells;
  }, [mesAtual]);

  function mudarMes(delta: number) {
    setMesAtual((mes) => new Date(mes.getFullYear(), mes.getMonth() + delta, 1));
  }

  const sessoesRecentes = useMemo(
    () => [...sessoesFinalizadas].sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? "")).slice(0, 6),
    [sessoesFinalizadas],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-24 -right-16 hidden h-72 w-72 rounded-full bg-[var(--surface-spot)] blur-3xl sm:block" />
      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-2xl border border-white/10 bg-[#111c1a]/90 p-5 shadow-[0_20px_35px_rgba(0,0,0,0.25)] backdrop-blur sm:rounded-3xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="text-sm font-semibold text-[var(--accent)] hover:underline">
              Voltar para início
            </Link>
            <Link
              href="/fichas"
              className="rounded-full border border-white/10 bg-[#172420] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Ver fichas
            </Link>
          </div>

          <h1 className="mt-4 text-3xl font-bold text-[var(--text-primary)]">Histórico</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
            Revise seu progresso, marque os dias com treino e acompanhe as sessões mais recentes.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.2)] sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Treinos este mês
            </p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{totalSessoes}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">sessões concluídas</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.2)] sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Total de exercícios
            </p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{totalExercicios}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">concluídos no mês</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.2)] sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Dias ativos
            </p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{diasComTreino.size}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">dias com treino</p>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.25)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => mudarMes(-1)}
                className="rounded-full border border-white/10 bg-[#172420] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                ←
              </button>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{getMonthLabel(mesAtual)}</h2>
              <button
                type="button"
                onClick={() => mudarMes(1)}
                className="rounded-full border border-white/10 bg-[#172420] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                →
              </button>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              {DIAS_SEMANA.map((dia) => (
                <span key={dia}>{dia}</span>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2">
              {diasDoMes.map((item) => {
                if (!item.isCurrentMonth || item.dia === 0) {
                  return (
                    <div
                      key={item.key}
                      className="flex h-14 items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#172420]/50 text-xs text-transparent"
                    >
                      0
                    </div>
                  );
                }

                const dataChave = `${mesAtual.getFullYear()}-${mesAtual.getMonth()}-${item.dia}`;
                const temTreino = diasComTreino.has(dataChave);
                const isToday = isSameDay(new Date(), new Date(mesAtual.getFullYear(), mesAtual.getMonth(), item.dia));

                return (
                  <div
                    key={item.key}
                    className={`flex h-14 flex-col items-center justify-center rounded-xl border text-xs font-semibold ${
                      temTreino
                        ? "border-[var(--accent)] bg-[var(--accent)]/12 text-[var(--text-primary)]"
                        : "border-white/10 bg-[#172420] text-[var(--text-secondary)]"
                    } ${isToday ? "ring-1 ring-[var(--accent)]" : ""}`}
                  >
                    <span>{item.dia}</span>
                    {temTreino ? <span className="mt-1 text-[10px] text-[var(--accent)]">✓</span> : null}
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.25)] sm:p-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Sessões recentes</h2>

            {sessoesRecentes.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-white/15 bg-[#172420] p-4 text-sm text-[var(--text-secondary)]">
                Nenhuma sessão finalizada ainda.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {sessoesRecentes.map((sessao) => {
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
                          <h3 className="text-base font-bold text-[var(--text-primary)]">
                            {sessao.fichaNome}
                          </h3>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {formatDateTime(sessao.endedAt)}
                          </p>
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
          </article>
        </section>
      </main>
    </div>
  );
}
