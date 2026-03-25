import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/identity";
import { updateFicha, deleteFicha } from "@/lib/db/fichas";
import { normalizeFicha } from "@/lib/workout-storage";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId } = await resolveIdentity();
    const body = await request.json() as unknown;
    const data = normalizeFicha(body);

    if (!data) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const ficha = await updateFicha(userId, id, {
      nome: data.nome,
      exercicios: data.exercicios,
      descanso: data.descanso,
    });

    if (!ficha) {
      return NextResponse.json({ error: "Ficha não encontrada" }, { status: 404 });
    }

    return NextResponse.json(ficha);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId } = await resolveIdentity();
    const deleted = await deleteFicha(userId, id);

    if (!deleted) {
      return NextResponse.json({ error: "Ficha não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
