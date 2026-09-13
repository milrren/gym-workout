import { NextResponse } from "next/server";

// Sessões são geridas localmente; sincronização ocorre via POST /api/sessoes.
export async function GET() {
  return NextResponse.json({ error: "Não implementado" }, { status: 404 });
}
