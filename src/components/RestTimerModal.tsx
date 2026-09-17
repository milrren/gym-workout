"use client";

import { useEffect, useState } from "react";

type RestTimerModalProps = {
  initialSeconds: number;
  onComplete: () => void;
  onSkip: () => void;
};

export default function RestTimerModal({
  initialSeconds,
  onComplete,
  onSkip,
}: RestTimerModalProps) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    function completeWhenReady() {
      if (remaining === 0) {
        onComplete();
      }
    }

    completeWhenReady();
  }, [onComplete, remaining]);

  useEffect(() => {
    if (paused || remaining <= 0) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [paused, remaining]);

  const progress = initialSeconds > 0 ? (remaining / initialSeconds) * 100 : 0;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/65 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#111c1a] p-6 text-center shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Descanso
        </p>
        <h2 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">Recupere o fôlego</h2>
        <div
          className="mx-auto mt-6 flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-[var(--surface-soft)]"
          style={{ background: `conic-gradient(var(--accent) ${progress}%, #24342e ${progress}% 100%)` }}
        >
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#111c1a]">
            <span className="text-4xl font-bold text-[var(--text-primary)]">{remaining}s</span>
          </div>
        </div>
        <p className="mt-5 text-sm text-[var(--text-secondary)]">
          {paused ? "Timer pausado" : "Próximo exercício em seguida"}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaused((current) => !current)}
            className="rounded-xl border border-white/10 bg-[#172420] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)]"
          >
            {paused ? "Retomar" : "Pausar"}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[#0a120f] transition hover:brightness-95"
          >
            Pular descanso
          </button>
        </div>
      </div>
    </div>
  );
}