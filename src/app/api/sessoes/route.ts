import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/identity";
import { getSessoes, createSessao } from "@/lib/db/sessoes";
import { getFichas } from "@/lib/db/fichas";

export async function GET() {
  try {
    const { userId } = await resolveIdentity();
    const sessoes = await getSessoes(userId);
    return NextResponse.json(sessoes);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, isAnonymous } = await resolveIdentity();
    const body = await request.json() as { fichaId?: unknown };

    if (!body.fichaId || typeof body.fichaId !== "string") {
      return NextResponse.json({ error: "fichaId é obrigatório" }, { status: 400 });
    }

    // Look up the ficha server-side to ensure the exercicios are authoritative
    const fichas = await getFichas(userId);
    const ficha = fichas.find((f) => f.id === body.fichaId);

    if (!ficha) {
      return NextResponse.json({ error: "Ficha não encontrada" }, { status: 404 });
    }

    const sessao = await createSessao(userId, isAnonymous, {
      fichaId: ficha.id,
      fichaNome: ficha.nome,
      exercicios: ficha.exercicios,
    });

    return NextResponse.json(sessao, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
