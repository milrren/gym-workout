"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AuthButton from "@/components/AuthButton";
import { calcularSequenciaDias } from "@/lib/stats";
import { FICHAS_CHANGE_EVENT, listFichas } from "@/lib/storage/fichas-local";
import {
  createSessao,
  listSessoes,
  SESSOES_CHANGE_EVENT,
} from "@/lib/storage/sessoes-local";
import type { Ficha, SessaoTreino } from "@/lib/workout-storage";

const FICHA_COLOR_MAP: Record<string, string> = {
  lime: "#a3e635",
  purple: "#a78bfa",
  orange: "#fbbf24",
  blue: "#60a5fa",
  pink: "#f472b6",
  teal: "#2dd4bf",
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Bom dia";
  }

  if (hour < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
}

function isToday(value: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export default function Home() {
  const router = useRouter();
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [sessoes, setSessoes] = useState<SessaoTreino[]>([]);

  useEffect(() => {
    function carregarDados() {
      setFichas(listFichas());
      setSessoes(listSessoes());
    }

    carregarDados();
    window.addEventListener(FICHAS_CHANGE_EVENT, carregarDados);
    window.addEventListener(SESSOES_CHANGE_EVENT, carregarDados);

    return () => {
      window.removeEventListener(FICHAS_CHANGE_EVENT, carregarDados);
      window.removeEventListener(SESSOES_CHANGE_EVENT, carregarDados);
    };
  }, []);

  const sessoesFinalizadas = useMemo(
    () => sessoes.filter((sessao) => sessao.endedAt !== null),
    [sessoes],
  );
  const treinoConcluidoHoje = useMemo(
    () => sessoesFinalizadas.some((sessao) => isToday(sessao.endedAt)),
    [sessoesFinalizadas],
  );
  const sequencia = useMemo(() => calcularSequenciaDias(sessoes), [sessoes]);

  function iniciarTreino(ficha: Ficha) {
    const sessao = createSessao(ficha);
    void sessao;
    router.push("/historico");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-24 -left-16 hidden h-72 w-72 rounded-full bg-[var(--surface-spot)] blur-3xl sm:block" />
      <div className="pointer-events-none absolute top-48 -right-24 hidden h-80 w-80 rounded-full bg-[var(--surface-spot-secondary)] blur-3xl sm:block" />

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6 md:gap-8">
        <header className="rounded-2xl border border-white/10 bg-[#111c1a]/90 p-4 shadow-[0_20px_35px_rgba(0,0,0,0.25)] backdrop-blur sm:rounded-3xl sm:p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                Gym Workout
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl">
                {getGreeting()}, vamos treinar?
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                Acompanhe sua rotina e continue de onde parou.
              </p>
            </div>
            <AuthButton />
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#172420] p-3 sm:max-w-sm sm:p-4">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                treinoConcluidoHoje
                  ? "bg-[var(--accent)] text-[#0a120f]"
                  : "border border-white/15 text-[var(--text-secondary)]"
              }`}
              aria-hidden="true"
            >
              {treinoConcluidoHoje ? "✓" : "·"}
            </span>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Treino concluído hoje
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {treinoConcluidoHoje
                  ? "Boa! Sua sessão de hoje está registrada."
                  : "Ainda dá tempo de cuidar do seu treino hoje."}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <article className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.2)] sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Sequência
            </p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{sequencia}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">dias seguidos</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.2)] sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Total
            </p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
              {sessoesFinalizadas.length}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">treinos concluídos</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.2)] sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Fichas
            </p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{fichas.length}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">rotinas disponíveis</p>
          </article>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/fichas"
            className="group rounded-2xl border border-white/10 bg-[#111c1a] p-5 shadow-[0_18px_30px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:border-[var(--accent)] sm:p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Atalho
            </p>
            <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">Gerenciar fichas</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Crie, edite e organize suas rotinas de treino.
            </p>
            <span className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] group-hover:underline">
              Acessar fichas →
            </span>
          </Link>
          <Link
            href="/historico"
            className="group rounded-2xl border border-white/10 bg-[#111c1a] p-5 shadow-[0_18px_30px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:border-[var(--accent)] sm:p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Atalho
            </p>
            <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">Histórico</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Revise seus treinos e acompanhe sua evolução.
            </p>
            <span className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] group-hover:underline">
              Ver histórico →
            </span>
          </Link>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.25)] sm:rounded-3xl sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Próximo passo
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">Iniciar treino</h2>
            </div>
            <span className="text-sm text-[var(--text-secondary)]">{fichas.length} ficha(s)</span>
          </div>

          {fichas.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-[#172420] p-5">
              <p className="text-sm text-[var(--text-secondary)]">Nenhuma ficha cadastrada ainda.</p>
              <Link
                href="/fichas/novo"
                className="mt-3 inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#0a120f] transition hover:brightness-95"
              >
                Criar primeira ficha
              </Link>
            </div>
          ) : (
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {fichas.map((ficha) => {
                const fichaColor = FICHA_COLOR_MAP[ficha.cor] ?? FICHA_COLOR_MAP.lime;

                return (
                  <li
                    key={ficha.id}
                    className="flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#172420] p-4"
                    style={{ borderLeft: `4px solid ${fichaColor}` }}
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-bold text-[var(--text-primary)]">
                        {ficha.nome}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {ficha.exercicios.length} exercícios · descanso {ficha.descanso}s
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => iniciarTreino(ficha)}
                      className="shrink-0 rounded-full px-3 py-2 text-xs font-bold text-[#0a120f] transition hover:brightness-95"
                      style={{ backgroundColor: fichaColor }}
                    >
                      Iniciar →
                    </button>
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
