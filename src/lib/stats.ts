import type { SessaoTreino } from "@/lib/workout-storage";

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calcularSequenciaDias(sessoes: SessaoTreino[]): number {
  if (!Array.isArray(sessoes) || sessoes.length === 0) {
    return 0;
  }

  const finalizadas = sessoes
    .filter((sessao) => sessao && typeof sessao === "object" && sessao.endedAt)
    .map((sessao) => new Date(sessao.endedAt as string));

  if (finalizadas.length === 0) {
    return 0;
  }

  const datas = new Set(finalizadas.filter((date) => !Number.isNaN(date.getTime())).map((date) => toLocalDateKey(date)));
  const hoje = new Date();
  let streak = 0;
  const cursor = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  while (datas.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
