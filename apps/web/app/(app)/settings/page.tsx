"use client";

import { useCallback, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SecuritySettings } from "@/components/auth/security-settings";
import { useAiOptIn } from "@/hooks/use-ai-opt-in";
import { useEncryption } from "@/components/providers/encryption-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Sparkles,
  ShieldCheck,
  ImageIcon,
  Search,
  Tag,
  Clapperboard,
  Brain,
  Eye,
  EyeOff,
  Lock,
  HardDrive,
  User,
  Download,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { aiOptIn, isLoading, isUpdating, setAiOptIn } = useAiOptIn();
  const {
    hasEncryptionKey,
    isLoading: encryptionLoading,
    exportCurrentEncryptionKey,
    createRecoveryBundle,
    forgetLocalEncryptionKey,
  } = useEncryption();
  const [recoveryPassphrase, setRecoveryPassphrase] = useState("");
  const [isManagingKey, setIsManagingKey] = useState(false);

  const downloadTextFile = useCallback((filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportRawKey = useCallback(async () => {
    setIsManagingKey(true);
    try {
      const key = await exportCurrentEncryptionKey();
      downloadTextFile("nostalgia-encryption-key.txt", key);
      toast.success("Raw encryption key downloaded.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export encryption key";
      toast.error(message);
    } finally {
      setIsManagingKey(false);
    }
  }, [downloadTextFile, exportCurrentEncryptionKey]);

  const handleCreateRecoveryBundle = useCallback(async () => {
    if (!recoveryPassphrase.trim()) {
      toast.error("Enter a recovery passphrase first.");
      return;
    }
    if (recoveryPassphrase.trim().length < 12) {
      toast.error("Use at least 12 characters for recovery passphrase.");
      return;
    }

    setIsManagingKey(true);
    try {
      const bundle = await createRecoveryBundle(recoveryPassphrase.trim());
      downloadTextFile("nostalgia-recovery-bundle.json", bundle);
      toast.success("Recovery bundle downloaded.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create recovery bundle";
      toast.error(message);
    } finally {
      setIsManagingKey(false);
    }
  }, [createRecoveryBundle, downloadTextFile, recoveryPassphrase]);

  const handleForgetLocalKey = useCallback(async () => {
    setIsManagingKey(true);
    try {
      await forgetLocalEncryptionKey();
      toast.success("Local key removed from this device.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove local key";
      toast.error(message);
    } finally {
      setIsManagingKey(false);
    }
  }, [forgetLocalEncryptionKey]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your account and app preferences."
      />

      <div className="mx-auto w-full max-w-3xl space-y-5 px-8 py-6">
        {/* AI Intelligence — Hero Card */}
        <section
          className={cn(
            "rounded-2xl border overflow-hidden transition-all duration-300",
            aiOptIn
              ? "border-purple-500/20 bg-gradient-to-br from-purple-500/[0.04] via-white/[0.02] to-blue-500/[0.02]"
              : "border-white/5 bg-white/[0.02]",
          )}
        >
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300",
                  aiOptIn
                    ? "bg-purple-500/15 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                    : "bg-white/5",
                )}
              >
                <Sparkles
                  className={cn(
                    "h-5 w-5 transition-colors duration-300",
                    aiOptIn ? "text-purple-400" : "text-white/40",
                  )}
                />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-light tracking-wide text-white/80">
                    AI Intelligence
                  </h2>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-light tracking-wide transition-all duration-300",
                      aiOptIn
                        ? "bg-purple-500/15 text-purple-400"
                        : "bg-white/5 text-white/40",
                    )}
                  >
                    {aiOptIn ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="text-xs font-light text-white/40 mt-0.5">
                  Smart search, captions, tags &amp; Nostalgia Feed
                </p>
              </div>
            </div>
            <button
              onClick={() => setAiOptIn(!aiOptIn)}
              disabled={isLoading || isUpdating}
              aria-label="Toggle AI Intelligence"
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40",
                aiOptIn ? "bg-purple-500/60" : "bg-white/10",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white/90 shadow-lg transition-transform duration-300 ease-in-out",
                  aiOptIn ? "translate-x-[22px]" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* Feature cards grid */}
          <div className="border-t border-white/5 px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FeatureCard
                icon={Search}
                iconColor="text-blue-400"
                title="Semantic Search"
                description="Find photos by describing what you remember"
                active={aiOptIn}
              />
              <FeatureCard
                icon={Brain}
                iconColor="text-purple-400"
                title="Auto Captions"
                description="AI writes descriptions for every photo"
                active={aiOptIn}
              />
              <FeatureCard
                icon={Tag}
                iconColor="text-amber-400"
                title="Smart Tags"
                description="Auto-generated labels for people, places &amp; things"
                active={aiOptIn}
              />
              <FeatureCard
                icon={Clapperboard}
                iconColor="text-pink-400"
                title="Nostalgia Feed"
                description="Resurface your most meaningful memories"
                active={aiOptIn}
              />
            </div>
          </div>

          {/* Privacy details */}
          <div className="border-t border-white/5 bg-white/[0.01] px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" />
              <span className="text-[11px] font-light uppercase tracking-widest text-emerald-400/80">
                Privacy Details
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-start gap-2.5">
                <ImageIcon className="h-3.5 w-3.5 text-white/40 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-light text-white/60">
                    Uploaded for analysis
                  </p>
                  <p className="text-[10px] font-light text-white/30 mt-0.5 leading-relaxed">
                    Low-res thumbnail only (512px max, JPEG)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Lock className="h-3.5 w-3.5 text-emerald-400/80 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-light text-white/60">
                    Always encrypted
                  </p>
                  <p className="text-[10px] font-light text-white/30 mt-0.5 leading-relaxed">
                    Originals stay end-to-end encrypted
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                {aiOptIn ? (
                  <Eye className="h-3.5 w-3.5 text-blue-400/80 mt-0.5 shrink-0" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-white/40 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="text-[11px] font-light text-white/60">
                    {aiOptIn ? "AI can see thumbnails" : "AI sees nothing"}
                  </p>
                  <p className="text-[10px] font-light text-white/30 mt-0.5 leading-relaxed">
                    {aiOptIn
                      ? "Only new uploads are analyzed"
                      : "No data sent for analysis"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              <User className="h-4 w-4 text-white/40" />
            </div>
            <div>
              <h2 className="text-sm font-light tracking-wide text-white/80">Account</h2>
              <p className="text-xs font-light text-white/40">
                Account management options will appear here.
              </p>
            </div>
          </div>
        </section>

        {/* Storage */}
        <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              <HardDrive className="h-4 w-4 text-white/40" />
            </div>
            <div>
              <h2 className="text-sm font-light tracking-wide text-white/80">Storage</h2>
              <p className="text-xs font-light text-white/40">
                Storage preferences and cleanup tools will appear here.
              </p>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              <Lock className="h-4 w-4 text-white/40" />
            </div>
            <div>
              <h2 className="text-sm font-light tracking-wide text-white/80">Security</h2>
              <p className="text-xs font-light text-white/40">
                End-to-end encryption key controls and recovery.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-start gap-2.5">
                <KeyRound className="mt-0.5 h-4 w-4 text-emerald-400/80" />
                <div>
                  <p className="text-xs font-light text-white/80">
                    Key status: {hasEncryptionKey ? "Present on this device" : "Not present"}
                  </p>
                  <p className="mt-1 text-[11px] font-light text-white/40 leading-relaxed">
                    We store your raw key only in browser IndexedDB on this device.
                    Server stores only a SHA-256 key fingerprint for verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={handleExportRawKey}
                disabled={!hasEncryptionKey || encryptionLoading || isManagingKey}
              >
                <Download className="h-4 w-4" />
                Download Raw Key
              </Button>
              <Button
                variant="outline"
                onClick={handleForgetLocalKey}
                disabled={!hasEncryptionKey || encryptionLoading || isManagingKey}
              >
                Forget Key On This Device
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-light text-white/40">
                Create recovery bundle (forgot-key flow)
              </label>
              <Input
                type="password"
                value={recoveryPassphrase}
                onChange={(e) => setRecoveryPassphrase(e.target.value)}
                placeholder="Recovery passphrase (12+ chars recommended)"
              />
              <Button
                variant="secondary"
                onClick={handleCreateRecoveryBundle}
                disabled={!hasEncryptionKey || encryptionLoading || isManagingKey}
              >
                Generate & Download Recovery Bundle
              </Button>
            </div>

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.03] p-3">
              <p className="text-[11px] font-light text-blue-300/80">Crypto profile</p>
              <ul className="mt-2 space-y-1 text-[11px] font-light text-blue-100/60">
                <li>- AES-256-GCM for file encryption (client-side only)</li>
                <li>- PBKDF2-SHA-512 (900k iterations) for recovery bundle wrapping</li>
                <li>- SHA-256 fingerprint binding key to account</li>
                <li>- Post-quantum note: symmetric AES-256 remains strong in a PQ model.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Sign-In Security */}
        <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              <ShieldCheck className="h-4 w-4 text-white/40" />
            </div>
            <div>
              <h2 className="text-sm font-light tracking-wide text-white/80">
                Sign-in Security
              </h2>
              <p className="text-xs font-light text-white/40">
                Passkeys, 2FA, and device authorization.
              </p>
            </div>
          </div>
          <SecuritySettings />
        </section>
      </div>
    </>
  );
}

function FeatureCard({
  icon: Icon,
  iconColor,
  title,
  description,
  active,
}: {
  icon: typeof Sparkles;
  iconColor: string;
  title: string;
  description: string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 transition-all duration-300",
        active
          ? "border-white/10 bg-white/[0.03]"
          : "border-white/5 bg-white/[0.01] opacity-50",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 mt-0.5 shrink-0",
          active ? iconColor : "text-white/40",
        )}
      />
      <div>
        <p className="text-xs font-light text-white/80">{title}</p>
        <p className="text-[10px] font-light text-white/40 mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
