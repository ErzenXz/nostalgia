"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, useSession } from "@/lib/auth-client";
import type { Passkey } from "@better-auth/passkey";

export function SecuritySettings() {
  const { data: session, isPending } = useSession();

  const passkeys = authClient.useListPasskeys();
  const [lastLoginMethod, setLastLoginMethod] = useState<string | null>(null);

  const twoFactorEnabled = Boolean((session?.user as any)?.twoFactorEnabled);
  const storedLastLoginMethod = (session?.user as any)?.lastLoginMethod as
    | string
    | undefined;

  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  const [twoFactorStage, setTwoFactorStage] = useState<
    "idle" | "enabling" | "verifying" | "disabling"
  >("idle");
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const canManage = Boolean(session?.user?.id);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!totpUri) {
        setTotpQr(null);
        return;
      }
      try {
        const dataUrl = await QRCode.toDataURL(totpUri, { margin: 1, width: 240 });
        if (!cancelled) setTotpQr(dataUrl);
      } catch {
        if (!cancelled) setTotpQr(null);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [totpUri]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const method = authClient.getLastUsedLoginMethod();
        if (cancelled) return;
        setLastLoginMethod(method);
      } catch {
        if (!cancelled) setLastLoginMethod(null);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const addPasskey = async () => {
    setPasskeyError(null);
    setPasskeyBusy(true);
    try {
      const name = window.prompt("Passkey name (optional):") ?? undefined;
      const res = await authClient.passkey.addPasskey({ name: name || undefined });
      if (res.error) {
        setPasskeyError(res.error.message ?? "Failed to add passkey.");
        return;
      }
      await passkeys.refetch();
    } catch (e) {
      setPasskeyError(e instanceof Error ? e.message : "Failed to add passkey.");
    } finally {
      setPasskeyBusy(false);
    }
  };

  const enable2fa = async () => {
    setTwoFactorError(null);
    setTwoFactorStage("enabling");
    setTotpUri(null);
    setBackupCodes(null);
    try {
      const res = await authClient.twoFactor.enable({
        password: twoFactorPassword,
      });
      if (res.error) {
        setTwoFactorError(res.error.message ?? "Failed to enable 2FA.");
        setTwoFactorStage("idle");
        return;
      }
      setTotpUri((res.data as any).totpURI ?? null);
      setBackupCodes((res.data as any).backupCodes ?? null);
      setTwoFactorStage("verifying");
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : "Failed to enable 2FA.");
      setTwoFactorStage("idle");
    }
  };

  const verify2fa = async () => {
    setTwoFactorError(null);
    setTwoFactorStage("verifying");
    try {
      const res = await authClient.twoFactor.verifyTotp({ code: verifyCode });
      if (res.error) {
        setTwoFactorError(res.error.message ?? "Verification failed.");
        return;
      }
      setTwoFactorStage("idle");
      setTotpUri(null);
      setBackupCodes(null);
      setVerifyCode("");
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : "Verification failed.");
    }
  };

  const disable2fa = async () => {
    setTwoFactorError(null);
    setTwoFactorStage("disabling");
    try {
      const res = await authClient.twoFactor.disable({ password: twoFactorPassword });
      if (res.error) {
        setTwoFactorError(res.error.message ?? "Failed to disable 2FA.");
        setTwoFactorStage("idle");
        return;
      }
      setTwoFactorStage("idle");
      setTwoFactorPassword("");
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : "Failed to disable 2FA.");
      setTwoFactorStage("idle");
    }
  };

  const passkeyItems = (passkeys.data ?? []) as Passkey[];
  const lastLoginText = useMemo(() => {
    return storedLastLoginMethod ?? lastLoginMethod ?? null;
  }, [lastLoginMethod, storedLastLoginMethod]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">Login & security</h3>
        <p className="text-xs text-muted-foreground">
          Passkeys, two-factor authentication, and device authorization.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Passkeys</p>
            <p className="text-xs text-muted-foreground">
              Use Face ID, Touch ID, or a security key to sign in.
            </p>
          </div>
          <Button type="button" onClick={addPasskey} disabled={!canManage || passkeyBusy}>
            {passkeyBusy ? "Working..." : "Add passkey"}
          </Button>
        </div>

        {passkeyError ? (
          <p className="text-xs text-red-400">{passkeyError}</p>
        ) : null}

        {passkeys.isPending ? (
          <p className="text-xs text-muted-foreground">Loading passkeys...</p>
        ) : passkeyItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">No passkeys yet.</p>
        ) : (
          <div className="space-y-2">
            {passkeyItems.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/20 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {p.name || "Passkey"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.deviceType} • {new Date(p.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
            <p className="text-xs text-muted-foreground">
              Require a code from your authenticator app when signing in.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {twoFactorEnabled ? "Enabled" : "Disabled"}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Password</label>
          <Input
            type="password"
            placeholder="Required to change 2FA"
            value={twoFactorPassword}
            onChange={(e) => setTwoFactorPassword(e.target.value)}
            disabled={!canManage || isPending}
          />
        </div>

        {twoFactorError ? <p className="text-xs text-red-400">{twoFactorError}</p> : null}

        {!twoFactorEnabled ? (
          <div className="space-y-3">
            <Button
              type="button"
              onClick={enable2fa}
              disabled={!canManage || !twoFactorPassword || twoFactorStage !== "idle"}
            >
              {twoFactorStage === "enabling" ? "Enabling..." : "Enable 2FA"}
            </Button>

            {totpUri ? (
              <div className="space-y-2 rounded-lg border border-border/60 bg-secondary/20 p-3">
                <p className="text-xs font-medium text-foreground">
                  Scan this QR code in your authenticator app
                </p>
                {totpQr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={totpQr}
                    alt="TOTP QR code"
                    className="h-[240px] w-[240px] rounded-md bg-white p-2"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Could not render QR. Use the URI below.
                  </p>
                )}
                <p className="text-[10px] break-all text-muted-foreground">{totpUri}</p>
              </div>
            ) : null}

            {backupCodes && backupCodes.length ? (
              <div className="space-y-2 rounded-lg border border-border/60 bg-secondary/20 p-3">
                <p className="text-xs font-medium text-foreground">Backup codes</p>
                <p className="text-[10px] text-muted-foreground">
                  Store these somewhere safe. Each code can be used once.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((c) => (
                    <code
                      key={c}
                      className="rounded-md border border-border/60 bg-background px-2 py-1 text-[10px]"
                    >
                      {c}
                    </code>
                  ))}
                </div>
              </div>
            ) : null}

            {twoFactorStage === "verifying" ? (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Enter a code to finish enabling
                </label>
                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    disabled={!canManage}
                  />
                  <Button
                    type="button"
                    onClick={verify2fa}
                    disabled={!canManage || !verifyCode}
                  >
                    Verify
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={disable2fa}
            disabled={!canManage || !twoFactorPassword || twoFactorStage !== "idle"}
          >
            {twoFactorStage === "disabling" ? "Disabling..." : "Disable 2FA"}
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <p className="text-sm font-medium text-foreground">Last login method</p>
        <p className="text-xs text-muted-foreground">
          {lastLoginText ? (
            <>
              Last used: <span className="font-medium text-foreground">{lastLoginText}</span>
            </>
          ) : (
            "Not available yet."
          )}
        </p>
      </div>
    </div>
  );
}
