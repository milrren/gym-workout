"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const MIGRATION_KEY = "gym-workout:migrated";

/**
 * Invisible component that runs once after the user logs in.
 * It calls POST /api/auth/migrate to reassign any anonymous data
 * (identified by the guest cookie) to the authenticated user.
 */
export default function MigrationTrigger() {
  const { data: session, status } = useSession();
  const migratingRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || migratingRef.current) {
      return;
    }

    const alreadyMigrated = localStorage.getItem(MIGRATION_KEY) === session.user.id;
    if (alreadyMigrated) {
      return;
    }

    migratingRef.current = true;

    fetch("/api/auth/migrate", { method: "POST" })
      .then((res) => res.json())
      .then(() => {
        localStorage.setItem(MIGRATION_KEY, session.user.id);
      })
      .catch(() => {
        migratingRef.current = false;
      });
  }, [status, session?.user?.id]);

  return null;
}
