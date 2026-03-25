import "server-only";
import clientPromise from "@/lib/mongodb";
import { createId, SessaoTreino, Exercicio } from "@/lib/workout-storage";

const DB_NAME = "gym-workout";
const COLLECTION_NAME = "sessoes";
const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

type SessaoDoc = {
  _id: string;
  userId: string;
  isAnonymous: boolean;
  fichaId: string;
  fichaNome: string;
  exercicios: Exercicio[];
  exerciciosConcluidosIds: string[];
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
};

let indexesEnsured = false;

async function getCollection() {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection<SessaoDoc>(COLLECTION_NAME);
  if (!indexesEnsured) {
    await Promise.all([
      col.createIndex({ userId: 1 }),
      col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true }),
    ]);
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
    exerciciosConcluidosIds: doc.exerciciosConcluidosIds,
    startedAt: doc.startedAt.toISOString(),
    endedAt: doc.endedAt ? doc.endedAt.toISOString() : null,
  };
}

export async function getSessoes(userId: string): Promise<SessaoTreino[]> {
  const col = await getCollection();
  const docs = await col.find({ userId }).sort({ startedAt: -1 }).toArray();
  return docs.map(toSessao);
}

export async function getSessao(userId: string, id: string): Promise<SessaoTreino | null> {
  const col = await getCollection();
  const doc = await col.findOne({ _id: id, userId });
  return doc ? toSessao(doc) : null;
}

export async function createSessao(
  userId: string,
  isAnonymous: boolean,
  data: Pick<SessaoTreino, "fichaId" | "fichaNome" | "exercicios">,
): Promise<SessaoTreino> {
  const col = await getCollection();
  const now = new Date();
  const doc: SessaoDoc = {
    _id: createId("sessao"),
    userId,
    isAnonymous,
    fichaId: data.fichaId,
    fichaNome: data.fichaNome,
    exercicios: data.exercicios,
    exerciciosConcluidosIds: [],
    startedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
    ...(isAnonymous ? { expiresAt: new Date(Date.now() + THIRTY_DAYS_MS) } : {}),
  };
  await col.insertOne(doc);
  return toSessao(doc);
}

export async function updateSessao(
  userId: string,
  id: string,
  data: Pick<SessaoTreino, "exerciciosConcluidosIds" | "endedAt">,
): Promise<SessaoTreino | null> {
  const col = await getCollection();
  const result = await col.findOneAndUpdate(
    { _id: id, userId },
    {
      $set: {
        exerciciosConcluidosIds: data.exerciciosConcluidosIds,
        endedAt: data.endedAt ? new Date(data.endedAt) : null,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
  return result ? toSessao(result) : null;
}

export async function migrateSessoes(guestId: string, userId: string): Promise<void> {
  const col = await getCollection();
  await col.updateMany(
    { userId: guestId },
    { $set: { userId, isAnonymous: false }, $unset: { expiresAt: "" } },
  );
}
