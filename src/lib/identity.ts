import "server-only";
import { auth } from "@/auth";

/** Retorna o id do usuário autenticado, ou null se não houver sessão (dados locais não têm servidor). */
export async function resolveUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
