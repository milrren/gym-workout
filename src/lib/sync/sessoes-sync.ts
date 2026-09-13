import { listSessoes, markSessaoSincronizada } from "@/lib/storage/sessoes-local";

export type SyncResult = { sucesso: number; falhas: number };

/** Envia todas as sessões locais ainda não sincronizadas para o servidor. */
export async function syncAllSessoes(): Promise<SyncResult> {
  const pendentes = listSessoes().filter((s) => !s.syncedAt || s.syncedAt < s.updatedAt);

  let sucesso = 0;
  let falhas = 0;

  for (const sessao of pendentes) {
    try {
      const response = await fetch("/api/sessoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessao),
      });

      if (!response.ok) {
        falhas += 1;
        continue;
      }

      markSessaoSincronizada(sessao.id, new Date().toISOString());
      sucesso += 1;
    } catch {
      falhas += 1;
    }
  }

  return { sucesso, falhas };
}

