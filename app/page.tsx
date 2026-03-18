import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-6 py-12 sm:px-10">
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[var(--surface-spot)] blur-3xl" />
      <div className="pointer-events-none absolute top-20 right-0 h-80 w-80 rounded-full bg-[var(--surface-spot-secondary)] blur-3xl" />

      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-10">
        <section className="rounded-3xl border border-black/10 bg-white/80 p-8 shadow-lg backdrop-blur sm:p-10">
          <p className="mb-4 inline-flex rounded-full border border-black/15 px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase">
            Gym Workout
          </p>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
            Organize sua rotina de treino em um unico lugar.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
            Cadastre fichas, acompanhe a execucao dos exercicios e controle o descanso entre series.
            O modulo de Fichas ja esta disponivel.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <Link
            href="/fichas"
            className="group rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Modulo 01
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">Fichas</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Crie e mantenha fichas de treino com lista de exercicios e tempo de descanso.
            </p>
            <span className="mt-6 inline-flex items-center text-sm font-semibold text-[var(--accent)] group-hover:underline">
              Acessar modulo
            </span>
          </Link>

          <article className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Modulo 02
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">Execucao</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Registro do que foi executado em cada treino para apoiar sua progressao.
            </p>
            <span className="mt-6 inline-flex rounded-full border border-black/15 px-3 py-1 text-xs font-semibold">
              Em breve
            </span>
          </article>

          <article className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Modulo 03
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">Timers</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Controle inteligente de descanso entre series e exercicios com alertas.
            </p>
            <span className="mt-6 inline-flex rounded-full border border-black/15 px-3 py-1 text-xs font-semibold">
              Em breve
            </span>
          </article>
        </section>
      </main>
    </div>
  );
}
