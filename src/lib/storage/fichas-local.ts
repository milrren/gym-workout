import { createId, Ficha, normalizeFicha } from "@/lib/workout-storage";

const STORAGE_KEY = "gym-workout:fichas";
const CHANGE_EVENT = "gym-workout:fichas-changed";

function readAll(): Ficha[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown[]) : [];
    // Sanea entradas antigas/corrompidas (ex.: sem createdAt/updatedAt) para evitar crash no sort.
    return parsed
      .map((item) => normalizeFicha(item))
      .filter((item): item is Ficha => item !== null);
  } catch {
    return [];
  }
}

function writeAll(fichas: Ficha[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas));
  } catch (error) {
    console.error("Falha ao salvar fichas no localStorage", error);
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function listFichas(): Ficha[] {
  return readAll().sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export function createFicha(data: Pick<Ficha, "nome" | "exercicios" | "descanso" | "cor">): Ficha {
  const now = new Date().toISOString();
  const ficha: Ficha = {
    id: createId("ficha"),
    nome: data.nome,
    exercicios: data.exercicios,
    descanso: data.descanso,
    cor: data.cor || "lime",
    createdAt: now,
    updatedAt: now,
  };

  writeAll([ficha, ...readAll()]);
  return ficha;
}

export function updateFicha(
  id: string,
  data: Pick<Ficha, "nome" | "exercicios" | "descanso" | "cor">,
): Ficha | null {
  const fichas = readAll();
  const index = fichas.findIndex((f) => f.id === id);

  if (index === -1) {
    return null;
  }

  const atualizada: Ficha = {
    ...fichas[index],
    nome: data.nome,
    exercicios: data.exercicios,
    descanso: data.descanso,
    cor: data.cor || fichas[index].cor || "lime",
    updatedAt: new Date().toISOString(),
  };

  fichas[index] = atualizada;
  writeAll(fichas);
  return atualizada;
}

export function deleteFicha(id: string): boolean {
  const fichas = readAll();
  const remaining = fichas.filter((f) => f.id !== id);

  if (remaining.length === fichas.length) {
    return false;
  }

  writeAll(remaining);
  return true;
}

/** Grava uma ficha vinda do servidor sem disparar novo push (usado no merge do pull). */
export function upsertFichaSemEvento(ficha: Ficha) {
  const fichas = readAll();
  const index = fichas.findIndex((f) => f.id === ficha.id);

  if (index === -1) {
    fichas.push(ficha);
  } else {
    fichas[index] = ficha;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas));
  } catch (error) {
    console.error("Falha ao salvar fichas no localStorage", error);
  }
}

export const FICHAS_CHANGE_EVENT = CHANGE_EVENT;
