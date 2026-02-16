"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCallback, useState } from "react";

/**
 * Hook to read and toggle the user's AI Intelligence opt-in preference.
 *
 * Returns:
 *  - aiOptIn: whether the user has opted into AI analysis
 *  - isLoading: true while the preference is loading
 *  - setAiOptIn: function to update the preference
 */
export function useAiOptIn() {
  const { userId } = useCurrentUser();

  const aiOptIn = useQuery(api.users.getAiOptIn, userId ? { userId } : "skip");

  const setAiOptInMutation = useMutation(api.users.setAiOptIn);

  const [isUpdating, setIsUpdating] = useState(false);

  const setAiOptIn = useCallback(
    async (value: boolean) => {
      if (!userId) return;
      setIsUpdating(true);
      try {
        await setAiOptInMutation({ userId, aiOptIn: value });
      } catch {
        console.error("Failed to update AI opt-in");
      } finally {
        setIsUpdating(false);
      }
    },
    [userId, setAiOptInMutation],
  );

  return {
    aiOptIn: aiOptIn ?? false,
    isLoading: userId !== null && aiOptIn === undefined,
    isUpdating,
    setAiOptIn,
  };
}
