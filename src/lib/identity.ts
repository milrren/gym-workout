import "server-only";
import { cookies } from "next/headers";
import { auth } from "@/auth";

export const GUEST_COOKIE_NAME = "gym-workout-guest-id";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export type Identity = {
  userId: string;
  isAnonymous: boolean;
};

/**
 * Resolves the current user identity server-side.
 * - Authenticated users → their Auth.js session user.id
 * - Anonymous users    → a UUID stored in an httpOnly cookie (created on first call)
 */
export async function resolveIdentity(): Promise<Identity> {
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, isAnonymous: false };
  }

  const cookieStore = await cookies();
  const existing = cookieStore.get(GUEST_COOKIE_NAME);
  if (existing?.value) {
    return { userId: existing.value, isAnonymous: true };
  }

  const guestId = crypto.randomUUID();
  cookieStore.set(GUEST_COOKIE_NAME, guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
  });

  return { userId: guestId, isAnonymous: true };
}
