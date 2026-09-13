import { Ficha } from "@/lib/workout-storage";
import { listFichas, upsertFichaSemEvento, FICHAS_CHANGE_EVENT } from "@/lib/storage/fichas-local";

/** Envia a ficha para o servidor; falha silenciosamente (best-effort, sem bloquear a UI). */
export function pushFicha(ficha: Ficha) {
  fetch("/api/fichas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ficha),
  }).catch((error) => {
    console.error("Falha ao sincronizar ficha", error);
  });
}

export function pushDeleteFicha(id: string) {
  fetch(`/api/fichas/${id}`, { method: "DELETE" }).catch((error) => {
    console.error("Falha ao sincronizar exclusão da ficha", error);
  });
}

/** Puxa fichas do servidor, mescla com o local por last-write-wins e envia de volta as que só existem localmente. */
export async function pullAndMergeFichas() {
  const response = await fetch("/api/fichas");
  if (!response.ok) {
    return;
  }

  const remotas = (await response.json()) as Ficha[];
  const locais = listFichas();
  const locaisPorId = new Map(locais.map((f) => [f.id, f]));

  for (const remota of remotas) {
    const local = locaisPorId.get(remota.id);
    if (!local || remota.updatedAt > local.updatedAt) {
      upsertFichaSemEvento(remota);
    }
    locaisPorId.delete(remota.id);
  }

  // Fichas que só existem localmente ainda precisam subir para o servidor.
  for (const somenteLocal of locaisPorId.values()) {
    pushFicha(somenteLocal);
  }

  window.dispatchEvent(new CustomEvent(FICHAS_CHANGE_EVENT));
}
