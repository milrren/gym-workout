"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { pullAndMergeFichas } from "@/lib/sync/fichas-sync";

const LAST_SYNC_USER_KEY = "gym-workout:fichas-last-sync-user";

/** Invisível: ao logar, puxa as fichas do servidor e mescla com o localStorage (uma vez por login). */
export default function FichasSyncManager() {
  const { data: session, status } = useSession();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || syncingRef.current) {
      return;
    }

    if (localStorage.getItem(LAST_SYNC_USER_KEY) === session.user.id) {
      return;
    }

    syncingRef.current = true;

    pullAndMergeFichas()
      .then(() => {
        localStorage.setItem(LAST_SYNC_USER_KEY, session.user.id);
      })
      .catch(() => {
        syncingRef.current = false;
      });
  }, [status, session?.user?.id]);

  return null;
}
