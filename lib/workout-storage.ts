export type Exercicio = {
  id: string;
  descricao: string;
  series: number;
  pesoSugerido: number | null;
};

export type Ficha = {
  id: string;
  nome: string;
  exercicios: Exercicio[];
  descanso: number;
};

export type SessaoTreino = {
  id: string;
  fichaId: string;
  fichaNome: string;
  exercicios: Exercicio[];
  exerciciosConcluidosIds: string[];
  startedAt: string;
  endedAt: string | null;
};

export const FICHAS_STORAGE_KEY = "gym-workout:fichas";
export const SESSOES_STORAGE_KEY = "gym-workout:sessoes";

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function normalizeExercicio(input: unknown): Exercicio | null {
  if (typeof input === "string") {
    const descricao = input.trim();

    if (!descricao) {
      return null;
    }

    return {
      id: createId("exercicio"),
      descricao,
      series: 0,
      pesoSugerido: null,
    };
  }

  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<Exercicio> & {
    descricao?: unknown;
    series?: unknown;
    repeticoes?: unknown;
  };

  const descricao = typeof candidate.descricao === "string" ? candidate.descricao.trim() : "";

  if (!descricao) {
    return null;
  }

  const seriesRaw = candidate.series ?? candidate.repeticoes;
  const series =
    typeof seriesRaw === "number" && Number.isFinite(seriesRaw)
      ? seriesRaw
      : Number(seriesRaw);

  const pesoNumero =
    typeof candidate.pesoSugerido === "number" && Number.isFinite(candidate.pesoSugerido)
      ? candidate.pesoSugerido
      : Number(candidate.pesoSugerido);

  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : createId("exercicio"),
    descricao,
    series: Number.isFinite(series) ? series : 0,
    pesoSugerido: Number.isFinite(pesoNumero) ? pesoNumero : null,
  };
}

function normalizeFicha(input: unknown): Ficha | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<Ficha> & {
    nome?: unknown;
    descanso?: unknown;
    exercicios?: unknown;
  };

  const nome = typeof candidate.nome === "string" ? candidate.nome.trim() : "";
  const descanso = Number(candidate.descanso);

  if (!nome || !Number.isFinite(descanso) || descanso <= 0) {
    return null;
  }

  const exerciciosArray = Array.isArray(candidate.exercicios) ? candidate.exercicios : [];
  const exercicios = exerciciosArray
    .map((item) => normalizeExercicio(item))
    .filter((item): item is Exercicio => item !== null);

  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : createId("ficha"),
    nome,
    descanso,
    exercicios,
  };
}

function normalizeSessao(input: unknown): SessaoTreino | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<SessaoTreino> & {
    fichaNome?: unknown;
    exerciciosConcluidosIds?: unknown;
    startedAt?: unknown;
    endedAt?: unknown;
  };

  const fichaNome = typeof candidate.fichaNome === "string" ? candidate.fichaNome.trim() : "";
  const startedAt = typeof candidate.startedAt === "string" ? candidate.startedAt : "";
  const endedAt = typeof candidate.endedAt === "string" ? candidate.endedAt : null;
  const exercicios = Array.isArray(candidate.exercicios)
    ? candidate.exercicios
        .map((item) => normalizeExercicio(item))
        .filter((item): item is Exercicio => item !== null)
    : [];
  const exerciciosConcluidosIds = Array.isArray(candidate.exerciciosConcluidosIds)
    ? candidate.exerciciosConcluidosIds.filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      )
    : [];

  if (!fichaNome || !startedAt) {
    return null;
  }

  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : createId("sessao"),
    fichaId: typeof candidate.fichaId === "string" ? candidate.fichaId : "",
    fichaNome,
    exercicios,
    exerciciosConcluidosIds,
    startedAt,
    endedAt,
  };
}

export function loadFichasFromStorage(): Ficha[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(FICHAS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeFicha(item))
      .filter((item): item is Ficha => item !== null);
  } catch {
    return [];
  }
}

export function loadSessoesFromStorage(): SessaoTreino[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(SESSOES_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeSessao(item))
      .filter((item): item is SessaoTreino => item !== null);
  } catch {
    return [];
  }
}

export function saveSessoesToStorage(sessoes: SessaoTreino[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSOES_STORAGE_KEY, JSON.stringify(sessoes));
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR");
}