"use client";

import { useCallback, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SecuritySettings } from "@/components/auth/security-settings";
import { useAiOptIn } from "@/hooks/use-ai-opt-in";
import { useEncryption } from "@/components/providers/encryption-provider";
import { useCurrentUser } from "@/hooks/use-current-user";
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
  CreditCard,
  Crown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useCurrentUser();
  const { aiOptIn, isLoading, isUpdating, setAiOptIn } = useAiOptIn();
  const aiEnabled = aiOptIn === true;
  const aiKnown = aiOptIn !== null;
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
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Manage your account and app preferences.</p>
        </div>

        {/* User Profile / Account Section */}
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-6 flex items-center gap-4 border-b border-border">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name || "User"} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-semibold uppercase text-foreground">
                  {(user?.name ?? user?.email ?? "U").charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[18px] font-semibold text-foreground truncate">
                {user?.name || "Nostalgia User"}
              </h2>
              <p className="text-[14px] text-muted-foreground truncate">
                {user?.email || "No email provided"}
              </p>
            </div>
            <Button variant="outline" size="sm" className="hidden sm:flex">
              Edit Profile
            </Button>
          </div>
          
          {/* Subscription / Plan (Placeholder) */}
          <div className="p-6 bg-muted/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <h3 className="text-[15px] font-semibold text-foreground">Current Plan</h3>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
              <div>
                <p className="font-medium text-foreground">Free Tier</p>
                <p className="text-[13px] text-muted-foreground mt-0.5">Basic storage and standard features</p>
              </div>
              <Button variant="default" size="sm" className="bg-foreground text-background hover:bg-foreground/90">
                Upgrade
              </Button>
            </div>
            <button className="w-full mt-3 flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-[14px] font-medium text-foreground">Billing & Subscriptions</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </section>

        {/* AI Intelligence — Hero Card */}
        <section
          className={cn(
            "rounded-xl border overflow-hidden transition-all duration-300",
            aiEnabled
              ? "border-primary/20 bg-primary/5"
              : "border-border bg-card",
          )}
        >
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300",
                  aiEnabled
                    ? "bg-primary/10"
                    : "bg-secondary",
                )}
              >
                <Sparkles
                  className={cn(
                    "h-5 w-5 transition-colors duration-300",
                    aiEnabled ? "text-primary" : "text-muted-foreground",
                  )}
                />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[16px] font-semibold text-foreground">
                    AI Intelligence
                  </h2>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-all duration-300",
                      aiEnabled
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {isLoading ? "Loading" : aiEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  Smart search, captions, tags & Nostalgia Feed
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!aiKnown) return;
                void setAiOptIn(!aiEnabled);
              }}
              disabled={!aiKnown || isLoading || isUpdating}
              aria-label="Toggle AI Intelligence"
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40",
                aiEnabled ? "bg-primary" : "bg-secondary",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-[24px] w-[24px] rounded-full bg-background shadow-sm transition-transform duration-300 ease-in-out",
                  aiEnabled ? "translate-x-[20px]" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* Feature cards grid */}
          <div className="border-t border-border px-6 py-5 bg-background">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FeatureCard
                icon={Search}
                iconColor="text-primary"
                title="Semantic Search"
                description="Find photos by describing what you remember"
                active={aiEnabled}
              />
              <FeatureCard
                icon={Brain}
                iconColor="text-primary"
                title="Auto Captions"
                description="AI writes descriptions for every photo"
                active={aiEnabled}
              />
              <FeatureCard
                icon={Tag}
                iconColor="text-primary"
                title="Smart Tags"
                description="Auto-generated labels for people, places & things"
                active={aiEnabled}
              />
              <FeatureCard
                icon={Clapperboard}
                iconColor="text-primary"
                title="Nostalgia Feed"
                description="Resurface your most meaningful memories"
                active={aiEnabled}
              />
            </div>
          </div>

          {/* Privacy details */}
          <div className="border-t border-border bg-muted/30 px-6 py-4">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Privacy Details
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <ImageIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-medium text-foreground">
                    Uploaded for analysis
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                    Low-res thumbnail only (512px max, JPEG)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-medium text-foreground">
                    Always encrypted
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                    Originals stay end-to-end encrypted
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                {aiOptIn ? (
                  <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="text-[13px] font-medium text-foreground">
                    {aiOptIn ? "AI can see thumbnails" : "AI sees nothing"}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                    {aiOptIn
                      ? "Only new uploads are analyzed"
                      : "No data sent for analysis"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-[16px] font-medium text-foreground">Encryption Key</h2>
              <p className="text-[13px] text-muted-foreground">
                End-to-end encryption key controls and recovery.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-secondary/50 p-4">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    Key status: {hasEncryptionKey ? "Present on this device" : "Not present"}
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                    We store your raw key only in browser IndexedDB on this device.
                    Server stores only a SHA-256 key fingerprint for verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={handleExportRawKey}
                disabled={!hasEncryptionKey || encryptionLoading || isManagingKey}
                className="h-10 text-[14px]"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Raw Key
              </Button>
              <Button
                variant="outline"
                onClick={handleForgetLocalKey}
                disabled={!hasEncryptionKey || encryptionLoading || isManagingKey}
                className="h-10 text-[14px] text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              >
                Forget Key On This Device
              </Button>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <label className="text-[14px] font-medium text-foreground block">
                Create recovery bundle (forgot-key flow)
              </label>
              <div className="flex gap-3">
                <Input
                  type="password"
                  value={recoveryPassphrase}
                  onChange={(e) => setRecoveryPassphrase(e.target.value)}
                  placeholder="Recovery passphrase (12+ chars)"
                  className="h-10 flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={handleCreateRecoveryBundle}
                  disabled={!hasEncryptionKey || encryptionLoading || isManagingKey}
                  className="h-10 px-6 shrink-0"
                >
                  Generate
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Sign-In Security */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-[16px] font-medium text-foreground">
                Sign-in Security
              </h2>
              <p className="text-[13px] text-muted-foreground">
                Passkeys, 2FA, and device authorization.
              </p>
            </div>
          </div>
          <SecuritySettings />
        </section>
      </div>
    </div>
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
        "flex items-start gap-3 rounded-xl border px-4 py-4 transition-all duration-300",
        active
          ? "border-border bg-card shadow-sm"
          : "border-border bg-card/50 opacity-50",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 mt-0.5 shrink-0",
          active ? iconColor : "text-muted-foreground",
        )}
      />
      <div>
        <p className="text-[14px] font-medium text-foreground">{title}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
