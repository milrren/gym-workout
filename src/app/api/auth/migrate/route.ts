import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { GUEST_COOKIE_NAME } from "@/lib/identity";
import { migrateFichas } from "@/lib/db/fichas";
import { migrateSessoes } from "@/lib/db/sessoes";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const guestCookie = cookieStore.get(GUEST_COOKIE_NAME);

    if (!guestCookie?.value || guestCookie.value === session.user.id) {
      // No anonymous data to migrate; clean up cookie if present
      if (guestCookie?.value) cookieStore.delete(GUEST_COOKIE_NAME);
      return NextResponse.json({ migrated: false });
    }

    const guestId = guestCookie.value;

    await Promise.all([
      migrateFichas(guestId, session.user.id),
      migrateSessoes(guestId, session.user.id),
    ]);

    cookieStore.delete(GUEST_COOKIE_NAME);

    return NextResponse.json({ migrated: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
