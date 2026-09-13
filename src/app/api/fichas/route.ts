import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/identity";
import { getFichas, upsertFicha } from "@/lib/db/fichas";
import { normalizeFicha } from "@/lib/workout-storage";

export async function GET() {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const fichas = await getFichas(userId);
    return NextResponse.json(fichas);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json() as unknown;
    const data = normalizeFicha(body);

    if (!data) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const ficha = await upsertFicha(userId, data);

    return NextResponse.json(ficha, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
