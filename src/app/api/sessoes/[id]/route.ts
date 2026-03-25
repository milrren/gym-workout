import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/identity";
import { getSessao, updateSessao } from "@/lib/db/sessoes";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId } = await resolveIdentity();
    const sessao = await getSessao(userId, id);

    if (!sessao) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    return NextResponse.json(sessao);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId } = await resolveIdentity();
    const body = await request.json() as {
      exerciciosConcluidosIds?: unknown;
      endedAt?: unknown;
    };

    if (!Array.isArray(body.exerciciosConcluidosIds)) {
      return NextResponse.json(
        { error: "exerciciosConcluidosIds deve ser um array" },
        { status: 400 },
      );
    }

    const exerciciosConcluidosIds = body.exerciciosConcluidosIds.filter(
      (x): x is string => typeof x === "string",
    );
    const endedAt = typeof body.endedAt === "string" ? body.endedAt : null;

    const sessao = await updateSessao(userId, id, { exerciciosConcluidosIds, endedAt });

    if (!sessao) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    return NextResponse.json(sessao);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
