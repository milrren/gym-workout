import { createId, SessaoTreino } from "@/lib/workout-storage";
import type { Ficha } from "@/lib/workout-storage";

const STORAGE_KEY = "gym-workout:sessoes";
const CHANGE_EVENT = "gym-workout:sessoes-changed";

function normalizeSessao(input: unknown): SessaoTreino | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<SessaoTreino>;
  const now = new Date().toISOString();

  if (typeof candidate.id !== "string" || typeof candidate.fichaId !== "string") {
    return null;
  }

  return {
    id: candidate.id,
    fichaId: candidate.fichaId,
    fichaNome: typeof candidate.fichaNome === "string" ? candidate.fichaNome : "",
    exercicios: Array.isArray(candidate.exercicios) ? candidate.exercicios : [],
    exerciciosConcluidosIds: Array.isArray(candidate.exerciciosConcluidosIds)
      ? candidate.exerciciosConcluidosIds
      : [],
    startedAt: typeof candidate.startedAt === "string" ? candidate.startedAt : now,
    endedAt: typeof candidate.endedAt === "string" ? candidate.endedAt : null,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    syncedAt: typeof candidate.syncedAt === "string" ? candidate.syncedAt : null,
  };
}

function readAll(): SessaoTreino[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown[]) : [];
    // Sanea entradas antigas/corrompidas (ex.: sem startedAt) para evitar crash no sort.
    return parsed
      .map((item) => normalizeSessao(item))
      .filter((item): item is SessaoTreino => item !== null);
  } catch {
    return [];
  }
}

function writeAll(sessoes: SessaoTreino[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessoes));
  } catch (error) {
    console.error("Falha ao salvar sessoes no localStorage", error);
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function listSessoes(): SessaoTreino[] {
  return readAll().sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""));
}

export function getSessao(id: string): SessaoTreino | null {
  return readAll().find((s) => s.id === id) ?? null;
}

export function createSessao(ficha: Ficha): SessaoTreino {
  const now = new Date().toISOString();
  const sessao: SessaoTreino = {
    id: createId("sessao"),
    fichaId: ficha.id,
    fichaNome: ficha.nome,
    exercicios: ficha.exercicios,
    exerciciosConcluidosIds: [],
    startedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
  };

  writeAll([sessao, ...readAll()]);
  return sessao;
}

export function updateSessao(
  id: string,
  data: Partial<Pick<SessaoTreino, "exerciciosConcluidosIds" | "endedAt">>,
): SessaoTreino | null {
  const sessoes = readAll();
  const index = sessoes.findIndex((s) => s.id === id);

  if (index === -1) {
    return null;
  }

  const atualizada: SessaoTreino = {
    ...sessoes[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  sessoes[index] = atualizada;
  writeAll(sessoes);
  return atualizada;
}

/** Marca a sessão como sincronizada sem alterar updatedAt (não é uma mudança de conteúdo). */
export function markSessaoSincronizada(id: string, syncedAt: string): SessaoTreino | null {
  const sessoes = readAll();
  const index = sessoes.findIndex((s) => s.id === id);

  if (index === -1) {
    return null;
  }

  sessoes[index] = { ...sessoes[index], syncedAt };
  writeAll(sessoes);
  return sessoes[index];
}

export const SESSOES_CHANGE_EVENT = CHANGE_EVENT;
