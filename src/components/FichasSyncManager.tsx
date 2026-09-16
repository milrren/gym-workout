"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { pullAndMergeFichas } from "@/lib/sync/fichas-sync";

/** Invisível: ao logar (ou em cada carregamento completo do app), puxa as fichas do servidor e mescla com o localStorage. */
export default function FichasSyncManager() {
  const { data: session, status } = useSession();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || syncingRef.current) {
      return;
    }

    syncingRef.current = true;

    pullAndMergeFichas().finally(() => {
      syncingRef.current = false;
    });
  }, [status, session?.user?.id]);

  return null;
}
