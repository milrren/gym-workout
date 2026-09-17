"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import RestTimerModal from "@/components/RestTimerModal";
import { getSessao, SESSOES_CHANGE_EVENT, updateSessao } from "@/lib/storage/sessoes-local";
import { formatDateTime, getEffectiveRestSeconds, getPreviousSkippedExercise, SessaoTreino } from "@/lib/workout-storage";

const MUSCULO_EMOJI: Record<string, string> = {
  Peito: "◈",
  Costas: "◇",
  Pernas: "◆",
  Ombro: "○",
  Bíceps: "◉",
  Tríceps: "●",
  Abdômen: "✦",
  Glúteos: "✧",
  Panturrilha: "△",
  Cardio: "↗",
};

function getStatus(sessao: SessaoTreino, exercicioId: string) {
  if (sessao.exerciciosConcluidosIds.includes(exercicioId)) {
    return "Feito";
  }

  if (sessao.exerciciosPuladosIds.includes(exercicioId)) {
    return "Pulado";
  }

  return "Pendente";
}

export default function SessaoPage() {
  const params = useParams<{ sessaoId: string }>();
  const sessaoId = params.sessaoId;
  const [sessao, setSessao] = useState<SessaoTreino | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [mostrarResumo, setMostrarResumo] = useState(false);

  useEffect(() => {
    function carregar() {
      setSessao(getSessao(sessaoId));
      setCarregado(true);
    }

    carregar();
    window.addEventListener(SESSOES_CHANGE_EVENT, carregar);
    return () => window.removeEventListener(SESSOES_CHANGE_EVENT, carregar);
  }, [sessaoId]);

  const notFound = carregado && sessao === null;
  const exercicioAtual = useMemo(() => {
    if (!sessao) {
      return null;
    }

    return sessao.exercicios.find(
      (exercicio) => getStatus(sessao, exercicio.id) === "Pendente",
    ) ?? null;
  }, [sessao]);
  const exercicioAtualIndex = exercicioAtual
    ? sessao?.exercicios.findIndex((exercicio) => exercicio.id === exercicioAtual.id) ?? 0
    : sessao?.exercicios.length ?? 0;
  const resolvidos = sessao
    ? sessao.exerciciosConcluidosIds.length + sessao.exerciciosPuladosIds.length
    : 0;
  const total = sessao?.exercicios.length ?? 0;
  const percentual = total === 0 ? 0 : Math.round((resolvidos / total) * 100);
  const resumoVisivel = Boolean(sessao?.endedAt) || mostrarResumo || !exercicioAtual;
  const exercícioPuladoAnterior = useMemo(() => {
    if (!sessao || !exercicioAtual) {
      return null;
    }

    return getPreviousSkippedExercise(sessao, exercicioAtual.id);
  }, [sessao, exercicioAtual]);

  function salvarSessao(data: Partial<Pick<SessaoTreino, "exerciciosConcluidosIds" | "exerciciosPuladosIds" | "endedAt">>) {
    if (!sessao) {
      return null;
    }

    const atualizada = updateSessao(sessao.id, data);
    if (atualizada) {
      setSessao(atualizada);
    }
    return atualizada;
  }

  function concluirExercicio() {
    if (!sessao || !exercicioAtual || sessao.endedAt) {
      return;
    }

    const exerciciosConcluidosIds = Array.from(
      new Set([
        ...sessao.exerciciosConcluidosIds,
        exercicioAtual.id,
      ]),
    );
    const exerciciosPuladosIds = sessao.exerciciosPuladosIds.filter(
      (id) => id !== exercicioAtual.id,
    );
    salvarSessao({ exerciciosConcluidosIds, exerciciosPuladosIds });
    setMostrarResumo(resolvidos + 1 >= total);
  }

  function pularExercicio() {
    if (!sessao || !exercicioAtual || sessao.endedAt) {
      return;
    }

    const exerciciosPuladosIds = Array.from(
      new Set([...sessao.exerciciosPuladosIds, exercicioAtual.id]),
    );
    const exerciciosConcluidosIds = sessao.exerciciosConcluidosIds.filter(
      (id) => id !== exercicioAtual.id,
    );
    salvarSessao({ exerciciosConcluidosIds, exerciciosPuladosIds });
    setMostrarResumo(resolvidos + 1 >= total);
  }

  function iniciarDescanso() {
    if (!sessao || !exercicioAtual || sessao.endedAt) {
      return;
    }

    const descanso = getEffectiveRestSeconds(exercicioAtual, sessao.descansoPadrao);
    if (descanso > 0) {
      setTimerSeconds(descanso);
      return;
    }

    setTimerSeconds(0);
  }

  function voltarExercicioPulado() {
    if (!sessao || !exercícioPuladoAnterior || sessao.endedAt) {
      return;
    }

    const exerciciosPuladosIds = sessao.exerciciosPuladosIds.filter(
      (id) => id !== exercícioPuladoAnterior.id,
    );
    const exerciciosConcluidosIds = sessao.exerciciosConcluidosIds.filter(
      (id) => id !== exercícioPuladoAnterior.id,
    );

    const atualizada = updateSessao(sessao.id, {
      exerciciosPuladosIds,
      exerciciosConcluidosIds,
    });

    if (atualizada) {
      setSessao(atualizada);
    }
  }

  function reabrirExercicioPulado(exercicioId: string) {
    if (!sessao || sessao.endedAt) {
      return;
    }

    const exerciciosPuladosIds = sessao.exerciciosPuladosIds.filter(
      (id) => id !== exercicioId,
    );
    const exerciciosConcluidosIds = sessao.exerciciosConcluidosIds.filter(
      (id) => id !== exercicioId,
    );

    const atualizada = updateSessao(sessao.id, {
      exerciciosPuladosIds,
      exerciciosConcluidosIds,
    });

    if (atualizada) {
      setSessao(atualizada);
      setMostrarResumo(false);
    }
  }

  function avançarApósDescanso() {
    setTimerSeconds(null);
    setMostrarResumo(resolvidos + 1 >= total);
  }

  function finalizarTreino() {
    if (!sessao || sessao.endedAt) {
      return;
    }

    salvarSessao({ endedAt: new Date().toISOString() });
  }

  if (notFound) {
    return (
      <PageShell>
        <section className="rounded-2xl border border-white/10 bg-[#111c1a] p-5 shadow-[0_20px_35px_rgba(0,0,0,0.25)] sm:rounded-3xl sm:p-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sessão não encontrada</h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">A sessão informada não existe ou foi removida.</p>
          <BackLink />
        </section>
      </PageShell>
    );
  }

  if (!sessao) {
    return null;
  }

  return (
    <PageShell>
      <header className="rounded-2xl border border-white/10 bg-[#111c1a]/90 p-4 shadow-[0_20px_35px_rgba(0,0,0,0.25)] backdrop-blur sm:rounded-3xl sm:p-6">
        <Link href="/" className="text-sm font-semibold text-[var(--accent)] hover:underline">
          Voltar para início
        </Link>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Sessão de treino</p>
            <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{sessao.fichaNome}</h1>
          </div>
          <span className="text-sm font-semibold text-[var(--text-secondary)]">{Math.min(exercicioAtualIndex + 1, total)}/{total}</span>
        </div>
        <div className="mt-5 h-2 w-full rounded-full bg-[var(--surface-soft)]">
          <div className="h-2 rounded-full bg-[var(--accent)] transition-all" style={{ width: `${percentual}%` }} />
        </div>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">{resolvidos} de {total} exercícios resolvidos</p>
      </header>

      {resumoVisivel ? (
        <Summary sessao={sessao} onFinalize={finalizarTreino} onReopenSkipped={reabrirExercicioPulado} />
      ) : (
        <section className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.25)] sm:rounded-3xl sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-white/10 bg-[#172420] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              {exercicioAtual?.grupoMuscular || "Peito"} {MUSCULO_EMOJI[exercicioAtual?.grupoMuscular || "Peito"]}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">Exercício {exercicioAtualIndex + 1}</span>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-[#172420] px-5 py-10 text-center sm:px-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0f1715] text-4xl text-[var(--accent)]">
              {MUSCULO_EMOJI[exercicioAtual?.grupoMuscular || "Peito"] || "◈"}
            </div>
            <h2 className="mt-6 text-3xl font-bold text-[var(--text-primary)]">{exercicioAtual?.descricao}</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <StatChip label="Séries" value={String(exercicioAtual?.series ?? 0)} />
              <StatChip label="Reps" value={exercicioAtual?.repeticoes || "8-12"} />
              {exercicioAtual?.pesoSugerido !== null && exercicioAtual?.pesoSugerido !== undefined ? (
                <StatChip label="Peso" value={`${exercicioAtual.pesoSugerido} kg`} />
              ) : null}
              <StatChip label="Descanso" value={`${exercicioAtual?.descansoSegundos ?? sessao.descansoPadrao}s`} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={pularExercicio} className="rounded-xl border border-white/10 bg-[#172420] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)]">
              Pular
            </button>
            <button type="button" onClick={iniciarDescanso} className="rounded-xl border border-white/10 bg-[#172420] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)]">
              Descanso {getEffectiveRestSeconds(exercicioAtual, sessao.descansoPadrao)}s
            </button>
            <button type="button" onClick={concluirExercicio} className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[#0a120f] transition hover:brightness-95">
              ✓ Concluído
            </button>
          </div>

          {exercícioPuladoAnterior ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={voltarExercicioPulado}
                className="w-full rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:border-amber-300 hover:bg-amber-500/15"
              >
                Voltar para {exercícioPuladoAnterior.descricao}
              </button>
            </div>
          ) : null}
        </section>
      )}

      {timerSeconds !== null && timerSeconds > 0 ? (
        <RestTimerModal
          key={timerSeconds}
          initialSeconds={timerSeconds}
          onComplete={avançarApósDescanso}
          onSkip={avançarApósDescanso}
        />
      ) : null}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-16 right-10 hidden h-64 w-64 rounded-full bg-[var(--surface-spot-secondary)] blur-3xl sm:block" />
      <main className="relative mx-auto flex w-full max-w-4xl flex-col gap-5 sm:gap-6">{children}</main>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline">
      Voltar para início
    </Link>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-[#0f1715] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
      {label}: <strong className="text-[var(--text-primary)]">{value}</strong>
    </span>
  );
}

function Summary({ sessao, onFinalize, onReopenSkipped }: { sessao: SessaoTreino; onFinalize: () => void; onReopenSkipped: (exercicioId: string) => void }) {
  const finalizada = Boolean(sessao.endedAt);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.25)] sm:rounded-3xl sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Resumo do treino</p>
      <h2 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{finalizada ? "Treino finalizado" : "Tudo certo por aqui"}</h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{sessao.fichaNome}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <SummaryStat label="Concluídos" value={sessao.exerciciosConcluidosIds.length} />
        <SummaryStat label="Pulados" value={sessao.exerciciosPuladosIds.length} />
        <SummaryStat label="Total" value={sessao.exercicios.length} />
      </div>

      <ul className="mt-6 space-y-2">
        {sessao.exercicios.map((exercicio) => {
          const status = getStatus(sessao, exercicio.id);
          const isSkipped = status === "Pulado";

          return (
            <li key={exercicio.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#172420] px-4 py-3">
              <button
                type="button"
                onClick={isSkipped ? () => onReopenSkipped(exercicio.id) : undefined}
                disabled={!isSkipped}
                className={`text-left text-sm font-semibold ${isSkipped ? "cursor-pointer text-[var(--text-primary)] hover:text-[var(--accent)]" : "text-[var(--text-primary)]"}`}
              >
                {exercicio.descricao}
              </button>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status === "Feito" ? "bg-[var(--accent)] text-[#0a120f]" : status === "Pulado" ? "bg-[#2b3035] text-[var(--text-secondary)]" : "border border-white/10 text-[var(--text-secondary)]"}`}>
                {status}
              </span>
            </li>
          );
        })}
      </ul>

      {finalizada ? (
        <p className="mt-5 text-sm text-[var(--text-secondary)]">Finalizado em {formatDateTime(sessao.endedAt)}</p>
      ) : (
        <button type="button" onClick={onFinalize} className="mt-6 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[#0a120f] transition hover:brightness-95">
          Finalizar Treino
        </button>
      )}
      <Link href="/" className="mt-3 inline-flex w-full justify-center rounded-xl border border-white/10 bg-[#172420] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)]">
        Voltar para início
      </Link>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#172420] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{value}</p>
    </article>
  );
}
