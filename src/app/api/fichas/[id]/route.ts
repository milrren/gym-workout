import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/identity";
import { upsertFicha, deleteFicha } from "@/lib/db/fichas";
import { normalizeFicha } from "@/lib/workout-storage";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json() as unknown;
    const data = normalizeFicha({ ...(body as object), id });

    if (!data) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const ficha = await upsertFicha(userId, data);

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
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const deleted = await deleteFicha(userId, id);

    if (!deleted) {
      return NextResponse.json({ error: "Ficha não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
