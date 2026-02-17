"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, useSession } from "@/lib/auth-client";

export default function DeviceClient() {
  const params = useSearchParams();
  const { data: session, isPending } = useSession();

  const initialUserCode = useMemo(() => {
    return (
      params.get("user_code") ??
      params.get("userCode") ??
      params.get("code") ??
      ""
    );
  }, [params]);

  const [userCode, setUserCode] = useState(initialUserCode);
  const [status, setStatus] = useState<
    "idle" | "approving" | "denying" | "approved" | "denied" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const authenticated = Boolean(session?.user?.id);

  const loginHref = useMemo(() => {
    const target = userCode
      ? `/device?user_code=${encodeURIComponent(userCode)}`
      : "/device";
    return `/login?redirect=${encodeURIComponent(target)}`;
  }, [userCode]);

  const approve = async () => {
    setError(null);
    setStatus("approving");
    try {
      const res = await authClient.device.approve({ userCode });
      if (res.error) {
        setError(res.error.error_description ?? "Failed to approve device.");
        setStatus("error");
        return;
      }
      setStatus("approved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve device.");
      setStatus("error");
    }
  };

  const deny = async () => {
    setError(null);
    setStatus("denying");
    try {
      const res = await authClient.device.deny({ userCode });
      if (res.error) {
        setError(res.error.error_description ?? "Failed to deny device.");
        setStatus("error");
        return;
      }
      setStatus("denied");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to deny device.");
      setStatus("error");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6 py-10">
      <div className="w-full space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">
            Authorize a device
          </h1>
          <p className="text-xs text-muted-foreground">
            Enter the code shown on your device to complete sign-in.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="userCode" className="text-sm font-medium">
            Code
          </label>
          <Input
            id="userCode"
            value={userCode}
            onChange={(e) => setUserCode(e.target.value)}
            placeholder="ABCD-EFGH"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-400 text-center">{error}</p>
          </div>
        ) : null}

        {status === "approved" ? (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
            <p className="text-sm text-green-400 text-center">
              Device approved. You can return to your device.
            </p>
          </div>
        ) : null}

        {status === "denied" ? (
          <div className="rounded-lg border border-border bg-secondary/20 p-3">
            <p className="text-sm text-foreground/80 text-center">
              Device denied.
            </p>
          </div>
        ) : null}

        {!authenticated ? (
          <div className="space-y-3">
            <Link
              href={loginHref}
              className={buttonVariants({ className: "w-full" })}
              aria-disabled={isPending}
            >
              Sign in to approve
            </Link>
            <p className="text-[10px] text-muted-foreground text-center">
              You must be signed in to authorize a device.
            </p>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              className={buttonVariants({ className: "flex-1" })}
              onClick={approve}
              disabled={
                !userCode || status === "approving" || status === "denying"
              }
            >
              {status === "approving" ? "Approving..." : "Approve"}
            </button>
            <button
              type="button"
              className={buttonVariants({ variant: "secondary", className: "flex-1" })}
              onClick={deny}
              disabled={
                !userCode || status === "approving" || status === "denying"
              }
            >
              {status === "denying" ? "Denying..." : "Deny"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

