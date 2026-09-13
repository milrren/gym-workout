import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/identity";
import { getSessoes, upsertSessao } from "@/lib/db/sessoes";
import { SessaoTreino } from "@/lib/workout-storage";

export async function GET() {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const sessoes = await getSessoes(userId);
    return NextResponse.json(sessoes);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/** Recebe uma sessão já criada/finalizada localmente e faz upsert no servidor (sync sob demanda). */
export async function POST(request: NextRequest) {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json() as Partial<SessaoTreino>;

    if (
      typeof body.id !== "string" ||
      typeof body.fichaId !== "string" ||
      typeof body.fichaNome !== "string" ||
      !Array.isArray(body.exercicios) ||
      !Array.isArray(body.exerciciosConcluidosIds) ||
      typeof body.startedAt !== "string" ||
      typeof body.createdAt !== "string" ||
      typeof body.updatedAt !== "string"
    ) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const sessao = await upsertSessao(userId, {
      id: body.id,
      fichaId: body.fichaId,
      fichaNome: body.fichaNome,
      exercicios: body.exercicios,
      exerciciosConcluidosIds: body.exerciciosConcluidosIds,
      startedAt: body.startedAt,
      endedAt: body.endedAt ?? null,
      createdAt: body.createdAt,
      updatedAt: body.updatedAt,
      syncedAt: null,
    });

    return NextResponse.json(sessao, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
