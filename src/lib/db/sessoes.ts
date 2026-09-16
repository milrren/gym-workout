import "server-only";
import clientPromise from "@/lib/mongodb";
import { SessaoTreino, Exercicio } from "@/lib/workout-storage";

const DB_NAME = "gym-workout";
const COLLECTION_NAME = "sessoes";

type SessaoDoc = {
  _id: string;
  userId: string;
  fichaId: string;
  fichaNome: string;
  exercicios: Exercicio[];
  exerciciosConcluidosIds: string[];
  exerciciosPuladosIds: string[];
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

let indexesEnsured = false;

async function getCollection() {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection<SessaoDoc>(COLLECTION_NAME);
  if (!indexesEnsured) {
    await col.createIndex({ userId: 1 });
    indexesEnsured = true;
  }
  return col;
}

function toSessao(doc: SessaoDoc): SessaoTreino {
  return {
    id: doc._id,
    fichaId: doc.fichaId,
    fichaNome: doc.fichaNome,
    exercicios: doc.exercicios,
    exerciciosConcluidosIds: doc.exerciciosConcluidosIds ?? [],
    exerciciosPuladosIds: doc.exerciciosPuladosIds ?? [],
    startedAt: doc.startedAt.toISOString(),
    endedAt: doc.endedAt ? doc.endedAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    syncedAt: null,
  };
}

export async function getSessoes(userId: string): Promise<SessaoTreino[]> {
  const col = await getCollection();
  const docs = await col.find({ userId }).sort({ startedAt: -1 }).toArray();
  return docs.map(toSessao);
}

/** Cria ou atualiza a sessão pelo id do client (chamado sob demanda pelo botão "Sincronizar"). */
export async function upsertSessao(userId: string, sessao: SessaoTreino): Promise<SessaoTreino> {
  const col = await getCollection();
  const existing = await col.findOne({ _id: sessao.id, userId });

  const doc: SessaoDoc = {
    _id: sessao.id,
    userId,
    fichaId: sessao.fichaId,
    fichaNome: sessao.fichaNome,
    exercicios: sessao.exercicios,
    exerciciosConcluidosIds: sessao.exerciciosConcluidosIds ?? [],
    exerciciosPuladosIds: sessao.exerciciosPuladosIds ?? [],
    startedAt: new Date(sessao.startedAt),
    endedAt: sessao.endedAt ? new Date(sessao.endedAt) : null,
    createdAt: existing ? existing.createdAt : new Date(sessao.createdAt),
    updatedAt: new Date(sessao.updatedAt),
  };

  await col.replaceOne({ _id: sessao.id, userId }, doc, { upsert: true });
  return toSessao(doc);
}
