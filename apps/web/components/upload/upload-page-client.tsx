"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatBytes } from "@/lib/utils";
import { encryptBlob, encryptFile } from "@/lib/encryption";
import { createImageThumbnailBlob } from "@/lib/thumbnails";
import { createVideoThumbnailBlob } from "@/lib/video-thumbnails";
import { useEncryption } from "@/components/providers/encryption-provider";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAiOptInForUserId } from "@/hooks/use-ai-opt-in";
import { toast } from "sonner";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Download,
  FileImage,
  FileVideo,
  Images,
  KeyRound,
  Loader2,
  Shield,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

const MAX_CONCURRENT_UPLOADS = 3;

interface UploadFile {
  id: string;
  file: File;
  status:
    | "pending"
    | "encrypting"
    | "uploading"
    | "saving"
    | "completed"
    | "failed";
  progress: number;
  error?: string;
  warning?: string;
  photoId?: string;
}

async function parseConvexStorageId(res: Response): Promise<string | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    const json = JSON.parse(text) as { storageId?: string };
    if (json?.storageId) return json.storageId;
  } catch {
    // Response may be the raw storage ID string
  }
  return text.trim() || null;
}

function uploadBlobWithProgress(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress?: (progress: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(blob);
  });
}

export function UploadPageClient() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSettingKey, setIsSettingKey] = useState(false);
  const [manualKeyInput, setManualKeyInput] = useState("");
  const [recoveryPackageInput, setRecoveryPackageInput] = useState("");
  const [recoveryPassphrase, setRecoveryPassphrase] = useState("");
  const [newKeyRecoveryPassphrase, setNewKeyRecoveryPassphrase] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [freshRecoveryBundle, setFreshRecoveryBundle] = useState<string | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    encryptionKey,
    hasEncryptionKey,
    isLoading: encryptionLoading,
    isReady: encryptionReady,
    setupNewEncryptionKey,
    importEncryptionKey,
    recoverEncryptionKey,
    createRecoveryBundle,
  } = useEncryption();
  const { userId } = useCurrentUser();
  const { aiOptIn } = useAiOptInForUserId(userId as Id<"users"> | null);

  const createPhoto = useMutation(api.photos.create);
  const generateAnalysisUploadUrl = useMutation(
    api.ai.uploads.generateAnalysisUploadUrl,
  );
  const attachAnalysisThumbnail = useMutation(
    api.ai.uploads.attachAnalysisThumbnail,
  );

  const updateFile = useCallback((id: string, updates: Partial<UploadFile>) => {
    setFiles((prev) =>
      prev.map((file) => (file.id === id ? { ...file, ...updates } : file)),
    );
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const additions: UploadFile[] = Array.from(newFiles)
      .filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/"),
      )
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "pending" as const,
        progress: 0,
      }));

    setFiles((prev) => {
      const seen = new Set(
        prev.map(
          (file) =>
            `${file.file.name}:${file.file.size}:${file.file.lastModified}`,
        ),
      );
      const unique = additions.filter(
        (file) =>
          !seen.has(
            `${file.file.name}:${file.file.size}:${file.file.lastModified}`,
          ),
      );
      return [...prev, ...unique];
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const downloadTextFile = useCallback((filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleCreateKey = useCallback(async () => {
    if (!newKeyRecoveryPassphrase.trim()) {
      toast.error("Set a recovery passphrase first.");
      return;
    }
    if (newKeyRecoveryPassphrase.trim().length < 12) {
      toast.error("Use at least 12 characters for the recovery passphrase.");
      return;
    }

    setIsSettingKey(true);
    try {
      const { key } = await setupNewEncryptionKey();
      const bundle = await createRecoveryBundle(
        newKeyRecoveryPassphrase.trim(),
      );
      setFreshKey(key);
      setFreshRecoveryBundle(bundle);
      toast.success("Encryption key created. Save both files offline now.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create encryption key",
      );
    } finally {
      setIsSettingKey(false);
    }
  }, [createRecoveryBundle, newKeyRecoveryPassphrase, setupNewEncryptionKey]);

  const handleImportKey = useCallback(async () => {
    if (!manualKeyInput.trim()) {
      toast.error("Paste your encryption key first.");
      return;
    }

    setIsSettingKey(true);
    try {
      await importEncryptionKey(manualKeyInput.trim());
      setManualKeyInput("");
      toast.success("Encryption key imported.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to import encryption key",
      );
    } finally {
      setIsSettingKey(false);
    }
  }, [importEncryptionKey, manualKeyInput]);

  const handleRecoverKey = useCallback(async () => {
    if (!recoveryPackageInput.trim() || !recoveryPassphrase.trim()) {
      toast.error("Provide both recovery bundle and passphrase.");
      return;
    }

    setIsSettingKey(true);
    try {
      await recoverEncryptionKey(
        recoveryPackageInput.trim(),
        recoveryPassphrase.trim(),
      );
      setRecoveryPackageInput("");
      setRecoveryPassphrase("");
      toast.success("Encryption key recovered.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to recover encryption key",
      );
    } finally {
      setIsSettingKey(false);
    }
  }, [recoverEncryptionKey, recoveryPackageInput, recoveryPassphrase]);

  const uploadSingleFile = useCallback(
    async (uploadFile: UploadFile) => {
      if (!encryptionKey || !userId) {
        throw new Error("Encryption is not ready.");
      }

      updateFile(uploadFile.id, {
        status: "encrypting",
        progress: 8,
        error: undefined,
        warning: undefined,
      });

      const createPlaintextThumbnail = async () => {
        if (uploadFile.file.type.startsWith("image/")) {
          return await createImageThumbnailBlob(uploadFile.file, {
            maxSize: 512,
            mimeType: "image/jpeg",
            quality: 0.82,
          });
        }

        if (uploadFile.file.type.startsWith("video/")) {
          return await createVideoThumbnailBlob(uploadFile.file, {
            maxSize: 512,
            quality: 0.82,
          });
        }

        return null;
      };

      const [{ encryptedBlob, iv }, plaintextThumbnail] = await Promise.all([
        encryptFile(uploadFile.file, encryptionKey),
        createPlaintextThumbnail().catch(() => null),
      ]);

      const encryptedThumbnailBlob = plaintextThumbnail
        ? (await encryptBlob(plaintextThumbnail, encryptionKey)).encryptedBlob
        : null;

      updateFile(uploadFile.id, { progress: 22, status: "uploading" });

      const storageRes = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: uploadFile.file.name }),
      });

      if (!storageRes.ok) {
        throw new Error("Failed to prepare secure upload.");
      }

      const { storageKey, thumbnailKey, uploadUrl, thumbnailUploadUrl } =
        await storageRes.json();

      await Promise.all([
        uploadBlobWithProgress(
          uploadUrl,
          encryptedBlob,
          "application/octet-stream",
          (progress) => {
            const scaled = 22 + progress * 50;
            updateFile(uploadFile.id, { progress: Math.round(scaled) });
          },
        ),
        encryptedThumbnailBlob && thumbnailUploadUrl
          ? uploadBlobWithProgress(
              thumbnailUploadUrl,
              encryptedThumbnailBlob,
              "application/octet-stream",
            ).catch(() => undefined)
          : Promise.resolve(),
      ]);

      updateFile(uploadFile.id, { progress: 78, status: "saving" });

      const photoId = await createPhoto({
        userId,
        storageKey,
        thumbnailStorageKey: encryptedThumbnailBlob ? thumbnailKey : undefined,
        encryptedKey: iv,
        fileName: uploadFile.file.name,
        mimeType: uploadFile.file.type,
        sizeBytes: uploadFile.file.size,
        isEncrypted: true,
        source: "upload",
        takenAt: uploadFile.file.lastModified || Date.now(),
      });

      let warning: string | undefined;
      if (aiOptIn === true && plaintextThumbnail) {
        try {
          const { uploadUrl: analysisUploadUrl, analysisToken } =
            await generateAnalysisUploadUrl({ photoId });

          const analysisRes = await fetch(analysisUploadUrl, {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: plaintextThumbnail,
          });

          if (!analysisRes.ok) {
            throw new Error("AI thumbnail upload failed");
          }

          const storageId = await parseConvexStorageId(analysisRes);
          if (!storageId) {
            throw new Error("AI thumbnail storage id missing");
          }

          await attachAnalysisThumbnail({
            photoId,
            storageId,
            analysisToken,
            mimeType: "image/jpeg",
          });
        } catch {
          warning =
            "Uploaded, but AI indexing could not be queued for this file.";
        }
      }

      updateFile(uploadFile.id, {
        status: "completed",
        progress: 100,
        warning,
        photoId,
      });
    },
    [
      aiOptIn,
      attachAnalysisThumbnail,
      createPhoto,
      encryptionKey,
      generateAnalysisUploadUrl,
      updateFile,
      userId,
    ],
  );

  const handleUpload = useCallback(async () => {
    if (!encryptionKey || !userId) return;

    const pendingFiles = files.filter((file) => file.status !== "completed");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < pendingFiles.length) {
        const file = pendingFiles[nextIndex];
        nextIndex += 1;
        if (!file) break;

        try {
          await uploadSingleFile(file);
        } catch (error) {
          updateFile(file.id, {
            status: "failed",
            progress: 0,
            error: error instanceof Error ? error.message : "Upload failed",
          });
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENT_UPLOADS, pendingFiles.length) },
      () => worker(),
    );
    await Promise.all(workers);

    setIsUploading(false);

    const failedCount = files.filter((file) => file.status === "failed").length;
    if (failedCount > 0) {
      toast.error(
        `${failedCount} upload${failedCount === 1 ? "" : "s"} failed.`,
      );
    } else {
      toast.success("Upload complete.");
    }
  }, [encryptionKey, files, updateFile, uploadSingleFile, userId]);

  const totalBytes = useMemo(
    () => files.reduce((sum, file) => sum + file.file.size, 0),
    [files],
  );
  const completedCount = files.filter(
    (file) => file.status === "completed",
  ).length;
  const failedCount = files.filter((file) => file.status === "failed").length;
  const overallProgress =
    files.length > 0
      ? Math.round(
          files.reduce((sum, file) => sum + file.progress, 0) / files.length,
        )
      : 0;

  const canUpload =
    files.length > 0 && encryptionReady && !!userId && !isUploading;

  return (
    <div className="space-y-6">
      {!hasEncryptionKey && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-[18px] font-semibold text-foreground">
                  Set your encryption key first
                </h2>
                <p className="mt-2 max-w-xl text-[14px] leading-6 text-muted-foreground">
                  Uploads are encrypted in your browser before they leave the
                  device. Save the raw key and recovery bundle offline, because
                  the server never stores your plaintext key.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-[15px] font-semibold text-foreground">
              Why this matters
            </h3>
            <ul className="mt-3 space-y-2 text-[13px] leading-5 text-muted-foreground">
              <li>Every photo is encrypted before upload.</li>
              <li>
                Only encrypted originals and encrypted thumbnails go to storage.
              </li>
              <li>
                AI indexing uses a separate low-res analysis thumbnail only if
                you opt in.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-[15px] font-semibold text-foreground">
                Create a new key
              </h3>
            </div>
            <div className="space-y-3">
              <Input
                type="password"
                value={newKeyRecoveryPassphrase}
                onChange={(event) =>
                  setNewKeyRecoveryPassphrase(event.target.value)
                }
                placeholder="Use a long unique recovery passphrase"
              />
              <Button
                onClick={handleCreateKey}
                disabled={isSettingKey || encryptionLoading}
                className="w-full"
              >
                {isSettingKey ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create encryption key"
                )}
              </Button>
            </div>

            {freshKey && (
              <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-center gap-2 text-[13px] font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Key created successfully
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      downloadTextFile("nostalgia-encryption-key.txt", freshKey)
                    }
                  >
                    <Download className="h-3.5 w-3.5" />
                    Raw key
                  </Button>
                  {freshRecoveryBundle && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadTextFile(
                          "nostalgia-recovery-bundle.json",
                          freshRecoveryBundle,
                        )
                      }
                    >
                      <Download className="h-3.5 w-3.5" />
                      Recovery bundle
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-[15px] font-semibold text-foreground">
                Import an existing key
              </h3>
              <div className="mt-3 space-y-3">
                <Input
                  value={manualKeyInput}
                  onChange={(event) => setManualKeyInput(event.target.value)}
                  placeholder="Paste raw base64 key"
                />
                <Button
                  variant="secondary"
                  onClick={handleImportKey}
                  disabled={isSettingKey || encryptionLoading}
                  className="w-full"
                >
                  Import key
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-[15px] font-semibold text-foreground">
                Recover from bundle
              </h3>
              <div className="mt-3 space-y-3">
                <textarea
                  value={recoveryPackageInput}
                  onChange={(event) =>
                    setRecoveryPackageInput(event.target.value)
                  }
                  placeholder="Paste recovery bundle JSON"
                  className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <Input
                  type="password"
                  value={recoveryPassphrase}
                  onChange={(event) =>
                    setRecoveryPassphrase(event.target.value)
                  }
                  placeholder="Recovery passphrase"
                />
                <Button
                  variant="secondary"
                  onClick={handleRecoverKey}
                  disabled={isSettingKey || encryptionLoading}
                  className="w-full"
                >
                  Recover key
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasEncryptionKey && (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div
              className={cn(
                "group cursor-pointer rounded-3xl border-2 border-dashed p-10 transition-colors",
                isDragging
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-card hover:border-primary/30 hover:bg-muted/20",
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                if (event.dataTransfer.files.length > 0) {
                  addFiles(event.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="mx-auto flex max-w-xl flex-col items-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-[20px] font-semibold tracking-tight text-foreground">
                  Drop photos or videos here
                </h2>
                <p className="mt-3 text-[14px] leading-6 text-muted-foreground">
                  Uploads are encrypted before transfer. A smaller encrypted
                  thumbnail is generated for fast browsing, and if AI is enabled
                  we reuse that same preview pipeline to queue indexing
                  immediately.
                </p>
                <div className="mt-6">
                  <Button size="lg" className="rounded-full px-6">
                    Choose files
                  </Button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(event) =>
                  event.target.files && addFiles(event.target.files)
                }
              />
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                {aiOptIn === true ? (
                  <Sparkles className="h-4 w-4 text-primary" />
                ) : (
                  <Brain className="h-4 w-4 text-muted-foreground" />
                )}
                <h3 className="text-[15px] font-semibold text-foreground">
                  Intelligence status
                </h3>
              </div>
              <p className="mt-3 text-[14px] leading-6 text-muted-foreground">
                {aiOptIn === true
                  ? "AI analysis is enabled. Uploaded files will queue captions, tags, and multimodal embeddings as soon as the analysis thumbnail is attached."
                  : "AI analysis is off. Uploads still work normally, and search falls back to filename, date, location, and other metadata until you enable AI."}
              </p>
              {aiOptIn !== true && (
                <Link
                  href="/settings"
                  className="mt-4 inline-flex items-center rounded-full border border-border px-4 py-2 text-[14px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Enable AI in Settings
                </Link>
              )}

              <div className="mt-6 rounded-2xl border border-border bg-muted/20 p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Upload session
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <p className="mt-3 text-[13px] text-muted-foreground">
                  {files.length} file{files.length === 1 ? "" : "s"} ·{" "}
                  {formatBytes(totalBytes)}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {completedCount} completed · {failedCount} failed
                </p>
              </div>
            </div>
          </div>

          {files.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
              <Images className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-4 text-[16px] font-semibold text-foreground">
                No files selected yet
              </p>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Add a few photos or videos to start the encrypted upload
                pipeline.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-[17px] font-semibold text-foreground">
                    Queued files
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Up to {MAX_CONCURRENT_UPLOADS} files upload in parallel with
                    per-file status.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setFiles([])}
                    disabled={isUploading}
                  >
                    Clear list
                  </Button>
                  <Button onClick={handleUpload} disabled={!canUpload}>
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Start upload"
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {files.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="rounded-2xl border border-border bg-background px-4 py-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        {uploadFile.file.type.startsWith("video/") ? (
                          <FileVideo className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <FileImage className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-medium text-foreground">
                              {uploadFile.file.name}
                            </p>
                            <p className="mt-1 text-[12px] text-muted-foreground">
                              {formatBytes(uploadFile.file.size)}
                            </p>
                          </div>

                          {uploadFile.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => removeFile(uploadFile.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          {uploadFile.status === "completed" && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                          {uploadFile.status === "failed" && (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                          {(uploadFile.status === "encrypting" ||
                            uploadFile.status === "uploading" ||
                            uploadFile.status === "saving") && (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          )}
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              uploadFile.status === "failed"
                                ? "bg-red-500"
                                : "bg-primary",
                            )}
                            style={{ width: `${uploadFile.progress}%` }}
                          />
                        </div>

                        <p className="mt-2 text-[12px] text-muted-foreground">
                          {uploadFile.status === "encrypting" &&
                            "Encrypting in the browser"}
                          {uploadFile.status === "uploading" &&
                            "Uploading encrypted media"}
                          {uploadFile.status === "saving" &&
                            "Saving the library record and queueing indexing"}
                          {uploadFile.status === "pending" && "Ready to upload"}
                          {uploadFile.status === "completed" &&
                            "Upload complete"}
                          {uploadFile.status === "failed" &&
                            (uploadFile.error ?? "Upload failed")}
                        </p>

                        {uploadFile.warning && (
                          <p className="mt-1 text-[12px] text-amber-600 dark:text-amber-400">
                            {uploadFile.warning}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
