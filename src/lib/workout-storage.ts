export const FICHA_CORES = ["lime", "purple", "orange", "blue", "pink", "teal"] as const;
export const GRUPOS_MUSCULARES = [
  "Peito",
  "Costas",
  "Pernas",
  "Ombro",
  "Bíceps",
  "Tríceps",
  "Abdômen",
  "Glúteos",
  "Panturrilha",
  "Cardio",
] as const;

export type Exercicio = {
  id: string;
  descricao: string;
  series: number;
  pesoSugerido: number | null;
  grupoMuscular: string;
  repeticoes: string;
  descansoSegundos?: number;
};

export type Ficha = {
  id: string;
  nome: string;
  exercicios: Exercicio[];
  descanso: number;
  cor: string;
  createdAt: string;
  updatedAt: string;
};

export type SessaoTreino = {
  id: string;
  fichaId: string;
  fichaNome: string;
  descansoPadrao: number;
  exercicios: Exercicio[];
  exerciciosConcluidosIds: string[];
  exerciciosPuladosIds: string[];
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Local-only: quando a sessão foi enviada ao servidor pela última vez (nunca enviado ao backend). */
  syncedAt: string | null;
};

export function getEffectiveRestSeconds(exercicio: Pick<Exercicio, "descansoSegundos"> | null | undefined, fallbackSeconds: number) {
  if (!exercicio) {
    return Math.max(0, fallbackSeconds);
  }

  const override = typeof exercicio.descansoSegundos === "number" ? exercicio.descansoSegundos : Number.NaN;
  if (Number.isFinite(override) && override > 0) {
    return Math.round(override);
  }

  return Math.max(0, fallbackSeconds);
}

export function getPreviousSkippedExercise(sessao: Pick<SessaoTreino, "exercicios" | "exerciciosPuladosIds">, currentExerciseId: string) {
  const currentIndex = sessao.exercicios.findIndex((exercicio) => exercicio.id === currentExerciseId);
  if (currentIndex <= 0) {
    return null;
  }

  const previousExercise = sessao.exercicios[currentIndex - 1];
  if (!previousExercise) {
    return null;
  }

  return sessao.exerciciosPuladosIds.includes(previousExercise.id) ? previousExercise : null;
}

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function normalizePlanoNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeGrupoMuscular(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    const texto = value.trim();
    return GRUPOS_MUSCULARES.includes(texto as (typeof GRUPOS_MUSCULARES)[number]) ? texto : texto;
  }

  return "Peito";
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
      grupoMuscular: "Peito",
      repeticoes: "8-12",
    };
  }

  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<Exercicio> & {
    descricao?: unknown;
    series?: unknown;
    repeticoes?: unknown;
    descansoSegundos?: unknown;
    grupoMuscular?: unknown;
  };

  const descricao = typeof candidate.descricao === "string" ? candidate.descricao.trim() : "";

  if (!descricao) {
    return null;
  }

  const seriesRaw = candidate.series ?? candidate.repeticoes;
  const seriesValue = normalizePlanoNumber(seriesRaw);
  const series = seriesValue !== null ? seriesValue : 0;
  const pesoNumero = normalizePlanoNumber(candidate.pesoSugerido);
  const repeticoesValue =
    typeof candidate.repeticoes === "string"
      ? candidate.repeticoes.trim()
      : typeof seriesRaw === "string"
        ? seriesRaw.trim()
        : Number.isFinite(seriesValue)
          ? String(seriesValue)
          : "8-12";
  const repeticoes = repeticoesValue || "8-12";
  const descansoSegundos = normalizePlanoNumber(candidate.descansoSegundos);

  const exercicio: Exercicio = {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : createId("exercicio"),
    descricao,
    series: Number.isFinite(series) ? series : 0,
    pesoSugerido: pesoNumero,
    grupoMuscular: normalizeGrupoMuscular(candidate.grupoMuscular),
    repeticoes,
  };

  if (descansoSegundos !== null && descansoSegundos > 0) {
    exercicio.descansoSegundos = Math.round(descansoSegundos);
  }

  return exercicio;
}

export function normalizeFicha(input: unknown): Ficha | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<Ficha> & {
    nome?: unknown;
    descanso?: unknown;
    cor?: unknown;
    exercicios?: unknown;
  };

  const nome = typeof candidate.nome === "string" ? candidate.nome.trim() : "";
  const descanso = normalizePlanoNumber(candidate.descanso);

  if (!nome || descanso === null || descanso <= 0) {
    return null;
  }

  const exerciciosArray = Array.isArray(candidate.exercicios) ? candidate.exercicios : [];
  const exercicios = exerciciosArray
    .map((item) => normalizeExercicio(item))
    .filter((item): item is Exercicio => item !== null);

  const now = new Date().toISOString();

  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : createId("ficha"),
    nome,
    descanso,
    cor: typeof candidate.cor === "string" && candidate.cor.trim() ? candidate.cor.trim() : "lime",
    exercicios,
    createdAt: typeof candidate.createdAt === "string" && candidate.createdAt ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === "string" && candidate.updatedAt ? candidate.updatedAt : now,
  };
}

export function normalizeSessaoTreino(input: unknown): SessaoTreino | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<SessaoTreino> & {
    exercicios?: unknown;
    exerciciosConcluidosIds?: unknown;
    exerciciosPuladosIds?: unknown;
  };

  if (typeof candidate.id !== "string" || typeof candidate.fichaId !== "string") {
    return null;
  }

  const exerciciosArray = Array.isArray(candidate.exercicios) ? candidate.exercicios : [];
  const exercicios = exerciciosArray
    .map((item) => normalizeExercicio(item))
    .filter((item): item is Exercicio => item !== null);
  const now = new Date().toISOString();

  return {
    id: candidate.id,
    fichaId: candidate.fichaId,
    fichaNome: typeof candidate.fichaNome === "string" ? candidate.fichaNome : "",
    descansoPadrao:
      typeof candidate.descansoPadrao === "number" && Number.isFinite(candidate.descansoPadrao) && candidate.descansoPadrao > 0
        ? candidate.descansoPadrao
        : 60,
    exercicios,
    exerciciosConcluidosIds: Array.isArray(candidate.exerciciosConcluidosIds)
      ? candidate.exerciciosConcluidosIds.filter((item): item is string => typeof item === "string")
      : [],
    exerciciosPuladosIds: Array.isArray(candidate.exerciciosPuladosIds)
      ? candidate.exerciciosPuladosIds.filter((item): item is string => typeof item === "string")
      : [],
    startedAt: typeof candidate.startedAt === "string" ? candidate.startedAt : now,
    endedAt: typeof candidate.endedAt === "string" ? candidate.endedAt : null,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    syncedAt: typeof candidate.syncedAt === "string" ? candidate.syncedAt : null,
  };
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR");
}