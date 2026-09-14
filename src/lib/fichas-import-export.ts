import { Ficha, normalizeFicha } from "@/lib/workout-storage";

/** Dispara o download de um JSON com todas as fichas no navegador. */
export function downloadFichasJson(fichas: Ficha[]) {
  const blob = new Blob([JSON.stringify(fichas, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fichas-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Aceita array ou objeto único; sempre gera novo id/timestamps para evitar sobrescrever fichas existentes. */
export function parseFichasFromJson(text: string): { fichas: Ficha[]; invalidCount: number } {
  const raw: unknown = JSON.parse(text);
  const itensBrutos = Array.isArray(raw) ? raw : [raw];

  const fichas: Ficha[] = [];
  let invalidCount = 0;

  for (const item of itensBrutos) {
    if (!item || typeof item !== "object") {
      invalidCount++;
      continue;
    }

    const rest = { ...(item as Record<string, unknown>) };
    delete rest.id;
    delete rest.createdAt;
    delete rest.updatedAt;
    const normalizada = normalizeFicha(rest);

    if (!normalizada) {
      invalidCount++;
      continue;
    }

    fichas.push(normalizada);
  }

  return { fichas, invalidCount };
}
