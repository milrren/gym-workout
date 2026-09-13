import "server-only";
import clientPromise from "@/lib/mongodb";
import { Ficha, Exercicio } from "@/lib/workout-storage";

const DB_NAME = "gym-workout";
const COLLECTION_NAME = "fichas";

type FichaDoc = {
  _id: string;
  userId: string;
  nome: string;
  exercicios: Exercicio[];
  descanso: number;
  createdAt: Date;
  updatedAt: Date;
};

let indexesEnsured = false;

async function getCollection() {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection<FichaDoc>(COLLECTION_NAME);
  if (!indexesEnsured) {
    await col.createIndex({ userId: 1 });
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
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function getFichas(userId: string): Promise<Ficha[]> {
  const col = await getCollection();
  const docs = await col.find({ userId }).sort({ createdAt: -1 }).toArray();
  return docs.map(toFicha);
}

/** Cria ou atualiza a ficha pelo id do client; só sobrescreve se a versão recebida for mais recente. */
export async function upsertFicha(userId: string, ficha: Ficha): Promise<Ficha> {
  const col = await getCollection();
  const existing = await col.findOne({ _id: ficha.id, userId });

  if (existing && existing.updatedAt.toISOString() >= ficha.updatedAt) {
    return toFicha(existing);
  }

  const doc: FichaDoc = {
    _id: ficha.id,
    userId,
    nome: ficha.nome,
    exercicios: ficha.exercicios,
    descanso: ficha.descanso,
    createdAt: existing ? existing.createdAt : new Date(ficha.createdAt),
    updatedAt: new Date(ficha.updatedAt),
  };

  await col.replaceOne({ _id: ficha.id, userId }, doc, { upsert: true });
  return toFicha(doc);
}

export async function deleteFicha(userId: string, id: string): Promise<boolean> {
  const col = await getCollection();
  const result = await col.deleteOne({ _id: id, userId });
  return result.deletedCount > 0;
}
