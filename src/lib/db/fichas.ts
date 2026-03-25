import "server-only";
import clientPromise from "@/lib/mongodb";
import { createId, Ficha, Exercicio } from "@/lib/workout-storage";

const DB_NAME = "gym-workout";
const COLLECTION_NAME = "fichas";
const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

type FichaDoc = {
  _id: string;
  userId: string;
  isAnonymous: boolean;
  nome: string;
  exercicios: Exercicio[];
  descanso: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
};

let indexesEnsured = false;

async function getCollection() {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection<FichaDoc>(COLLECTION_NAME);
  if (!indexesEnsured) {
    await Promise.all([
      col.createIndex({ userId: 1 }),
      col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true }),
    ]);
    indexesEnsured = true;
  }
  return col;
}

function toFicha(doc: FichaDoc): Ficha {
  return {
    id: doc._id,
    nome: doc.nome,
    exercicios: doc.exercicios,
    descanso: doc.descanso,
  };
}

export async function getFichas(userId: string): Promise<Ficha[]> {
  const col = await getCollection();
  const docs = await col.find({ userId }).sort({ createdAt: -1 }).toArray();
  return docs.map(toFicha);
}

export async function createFicha(
  userId: string,
  isAnonymous: boolean,
  data: Pick<Ficha, "nome" | "exercicios" | "descanso">,
): Promise<Ficha> {
  const col = await getCollection();
  const now = new Date();
  const doc: FichaDoc = {
    _id: createId("ficha"),
    userId,
    isAnonymous,
    nome: data.nome,
    exercicios: data.exercicios,
    descanso: data.descanso,
    createdAt: now,
    updatedAt: now,
    ...(isAnonymous ? { expiresAt: new Date(Date.now() + THIRTY_DAYS_MS) } : {}),
  };
  await col.insertOne(doc);
  return toFicha(doc);
}

export async function updateFicha(
  userId: string,
  id: string,
  data: Pick<Ficha, "nome" | "exercicios" | "descanso">,
): Promise<Ficha | null> {
  const col = await getCollection();
  const result = await col.findOneAndUpdate(
    { _id: id, userId },
    {
      $set: {
        nome: data.nome,
        exercicios: data.exercicios,
        descanso: data.descanso,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
  return result ? toFicha(result) : null;
}

export async function deleteFicha(userId: string, id: string): Promise<boolean> {
  const col = await getCollection();
  const result = await col.deleteOne({ _id: id, userId });
  return result.deletedCount > 0;
}

export async function migrateFichas(guestId: string, userId: string): Promise<void> {
  const col = await getCollection();
  await col.updateMany(
    { userId: guestId },
    { $set: { userId, isAnonymous: false }, $unset: { expiresAt: "" } },
  );
}
