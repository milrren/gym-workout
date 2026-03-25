import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/identity";
import { getFichas, createFicha } from "@/lib/db/fichas";
import { normalizeFicha } from "@/lib/workout-storage";

export async function GET() {
  try {
    const { userId } = await resolveIdentity();
    const fichas = await getFichas(userId);
    return NextResponse.json(fichas);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, isAnonymous } = await resolveIdentity();
    const body = await request.json() as unknown;
    const data = normalizeFicha(body);

    if (!data) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const ficha = await createFicha(userId, isAnonymous, {
      nome: data.nome,
      exercicios: data.exercicios,
      descanso: data.descanso,
    });

    return NextResponse.json(ficha, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
