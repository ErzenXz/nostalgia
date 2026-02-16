"use client";

import { useQuery } from "convex/react";
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

  const user = useQuery(
    api.users.getByBetterAuthId,
    betterAuthUserId ? { betterAuthUserId } : "skip",
  );

  const isLoading =
    sessionPending || (betterAuthUserId !== undefined && user === undefined);
  const isAuthenticated = !!user;

  return {
    user: user ?? null,
    userId: user?._id ?? null,
    session,
    isLoading,
    isAuthenticated,
  };
}
