"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--surface-main)] px-6 text-center">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Algo deu errado</h1>
      <p className="max-w-md rounded-xl border border-black/10 bg-white p-4 text-left text-sm text-red-600">
        {error.message || "Erro desconhecido"}
        {error.digest ? `\nDigest: ${error.digest}` : ""}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
      >
        Tentar novamente
      </button>
    </div>
  );
}
