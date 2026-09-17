import Link from "next/link";

export default function HistoricoPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-24 -right-16 hidden h-72 w-72 rounded-full bg-[var(--surface-spot)] blur-3xl sm:block" />
      <main className="relative mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="rounded-2xl border border-white/10 bg-[#111c1a]/90 p-5 shadow-[0_20px_35px_rgba(0,0,0,0.25)] backdrop-blur sm:rounded-3xl sm:p-8">
          <Link href="/" className="text-sm font-semibold text-[var(--accent)] hover:underline">
            Voltar para início
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-[var(--text-primary)]">Histórico</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
            O histórico completo, com calendário e métricas mensais, será disponibilizado na Phase 4.
          </p>
        </header>
      </main>
    </div>
  );
}
