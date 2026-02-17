"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useSession } from "@/lib/auth-client";

/**
 * Hook to get the current user's Convex user record.
 * Bridges Better Auth session -> Convex users table.
 *
 * Returns:
 *  - user: The Convex user object (with _id) or null/undefined
 *  - isLoading: true while session or user query is loading
 *  - isAuthenticated: true once we have both session and Convex user
 */
export function useCurrentUser() {
  const { data: session, isPending: sessionPending } = useSession();

  const betterAuthUserId = session?.user?.id ?? undefined;
  const createOrUpdate = useMutation(api.users.createOrUpdate);
  const didUpsertRef = useRef<string | null>(null);

  const user = useQuery(
    api.users.getByBetterAuthId,
    betterAuthUserId ? { betterAuthUserId } : "skip",
  );

  // If a Better Auth session exists but our app-level `users` row doesn't,
  // create it automatically (idempotent on betterAuthUserId).
  useEffect(() => {
    if (sessionPending) return;
    if (!betterAuthUserId) return;
    if (user === undefined) return; // still loading
    if (user !== null) return; // already exists
    if (didUpsertRef.current === betterAuthUserId) return;

    const sUser = session?.user as
      | { email?: string; name?: string; image?: string | null }
      | undefined;
    const email = sUser?.email;
    if (!email) return;

    didUpsertRef.current = betterAuthUserId;
    void createOrUpdate({
      email,
      name: sUser?.name,
      avatarUrl: sUser?.image ?? undefined,
      betterAuthUserId,
    }).catch(() => {
      // If this fails (e.g. auth not ready), we'll retry next render.
      didUpsertRef.current = null;
    });
  }, [betterAuthUserId, createOrUpdate, session?.user, sessionPending, user]);

  const isProvisioningUser =
    !!betterAuthUserId &&
    user === null &&
    didUpsertRef.current === betterAuthUserId;

  const isLoading =
    sessionPending ||
    (betterAuthUserId !== undefined && (user === undefined || isProvisioningUser));
  const isAuthenticated = !!user;

  return {
    user: user ?? null,
    userId: user?._id ?? null,
    session,
    isLoading,
    isProvisioningUser,
    isAuthenticated,
  };
}
