"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn, formatBytes } from "@/lib/utils";
import { encryptBlob, encryptFile } from "@/lib/encryption";
import { createImageThumbnailBlob } from "@/lib/thumbnails";
import { useEncryption } from "@/components/providers/encryption-provider";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAiOptIn } from "@/hooks/use-ai-opt-in";
import { toast } from "sonner";
import {
  Upload,
  X,
  FileImage,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Brain,
  KeyRound,
  Download,
} from "lucide-react";

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
}

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UploadDialog({ open, onClose }: UploadDialogProps) {
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
  const { aiOptIn } = useAiOptIn();
  const createPhoto = useMutation(api.photos.create);
  const generateAnalysisUploadUrl = useMutation(
    api.ai.uploads.generateAnalysisUploadUrl,
  );
  const attachAnalysisThumbnail = useMutation(
    api.ai.uploads.attachAnalysisThumbnail,
  );

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const uploadFiles: UploadFile[] = Array.from(newFiles)
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "pending" as const,
        progress: 0,
      }));
    setFiles((prev) => [...prev, ...uploadFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const updateFile = useCallback((id: string, updates: Partial<UploadFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  }, []);

  const uploadSingleFile = useCallback(
    async (uploadFile: UploadFile) => {
      if (!encryptionKey || !userId) {
        throw new Error("Encryption not ready or user not authenticated");
      }

      // Step 1: Encrypt
      updateFile(uploadFile.id, { status: "encrypting", progress: 10 });
      const { encryptedBlob, iv } = await encryptFile(
        uploadFile.file,
        encryptionKey,
      );

      // Create a small encrypted thumbnail for fast, scalable browsing.
      // We store thumbnails as encrypted JPEGs.
      let encryptedThumbnailBlob: Blob | null = null;
      const THUMB_MIME = "image/jpeg";
      if (uploadFile.file.type.startsWith("image/")) {
        try {
          const thumb = await createImageThumbnailBlob(uploadFile.file, {
            maxSize: 512,
            mimeType: THUMB_MIME,
            quality: 0.82,
          });
          encryptedThumbnailBlob = (await encryptBlob(thumb, encryptionKey))
            .encryptedBlob;
        } catch {
          // Thumbnail is best-effort; original upload should still succeed.
          encryptedThumbnailBlob = null;
        }
      }
      updateFile(uploadFile.id, { progress: 30 });

      // Step 2: Get presigned upload URL from our API
      updateFile(uploadFile.id, { status: "uploading", progress: 40 });
      const storageRes = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fileName: uploadFile.file.name,
          contentType: "application/octet-stream", // encrypted blob
        }),
      });

      if (!storageRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { storageKey, thumbnailKey, uploadUrl, thumbnailUploadUrl } =
        await storageRes.json();

      // Step 3: Upload encrypted blob to MinIO via presigned URL
      updateFile(uploadFile.id, { progress: 50 });
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: encryptedBlob,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload to storage");
      }

      // Upload encrypted thumbnail (best-effort)
      if (encryptedThumbnailBlob && thumbnailUploadUrl) {
        await fetch(thumbnailUploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: encryptedThumbnailBlob,
        });
      }

      updateFile(uploadFile.id, { progress: 80 });

      // Step 4: Create Convex photo record
      updateFile(uploadFile.id, { status: "saving", progress: 90 });
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

      // Step 5: Upload plaintext analysis thumbnail to Convex (opt-in AI)
      if (aiOptIn && uploadFile.file.type.startsWith("image/")) {
        try {
          const analysisThumbnail = await createImageThumbnailBlob(
            uploadFile.file,
            {
              maxSize: 512,
              mimeType: "image/jpeg",
              quality: 0.8,
            },
          );

          // Get a Convex upload URL + token bound to this photo
          const { uploadUrl: analysisUploadUrl, analysisToken } =
            await generateAnalysisUploadUrl({ photoId });

          // POST the plaintext thumbnail to Convex file storage
          const analysisRes = await fetch(analysisUploadUrl, {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: analysisThumbnail,
          });
          if (analysisRes.ok) {
            const { storageId } = await analysisRes.json();
            // Attach thumbnail and enqueue AI processing
            await attachAnalysisThumbnail({
              photoId,
              storageId,
              analysisToken,
              width: undefined,
              height: undefined,
              mimeType: "image/jpeg",
            });
          }
        } catch {
          // Analysis thumbnail is best-effort; don't fail the upload.
        }
      }

      updateFile(uploadFile.id, { status: "completed", progress: 100 });
    },
    [
      encryptionKey,
      userId,
      aiOptIn,
      createPhoto,
      generateAnalysisUploadUrl,
      attachAnalysisThumbnail,
      updateFile,
    ],
  );

  const handleUpload = async () => {
    if (files.length === 0 || !encryptionKey || !userId) return;
    setIsUploading(true);

    for (const file of files) {
      if (file.status === "completed") continue;
      try {
        await uploadSingleFile(file);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Upload failed";
        updateFile(file.id, { status: "failed", error: errorMessage });
      }
    }

    setIsUploading(false);
  };

  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);
  const completedCount = files.filter((f) => f.status === "completed").length;
  const canUpload = files.length > 0 && encryptionReady && !!userId;

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
      const bundle = await createRecoveryBundle(newKeyRecoveryPassphrase.trim());
      setFreshKey(key);
      setFreshRecoveryBundle(bundle);
      toast.success("Encryption key created. Save both files offline now.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create encryption key";
      toast.error(message);
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
      const message =
        error instanceof Error ? error.message : "Failed to import encryption key";
      toast.error(message);
    } finally {
      setIsSettingKey(false);
    }
  }, [importEncryptionKey, manualKeyInput]);

  const handleRecoverKey = useCallback(async () => {
    if (!recoveryPackageInput.trim() || !recoveryPassphrase.trim()) {
      toast.error("Provide both recovery package and passphrase.");
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
      const message =
        error instanceof Error ? error.message : "Failed to recover encryption key";
      toast.error(message);
    } finally {
      setIsSettingKey(false);
    }
  }, [recoverEncryptionKey, recoveryPackageInput, recoveryPassphrase]);

  const statusLabel = (status: UploadFile["status"]) => {
    switch (status) {
      case "encrypting":
        return "Encrypting...";
      case "uploading":
        return "Uploading...";
      case "saving":
        return "Saving...";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-400" />
            Upload Photos
          </DialogTitle>
          <DialogDescription>
            Your photos are encrypted before upload. Only you can see them.
          </DialogDescription>
        </DialogHeader>

        {!hasEncryptionKey && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-4 w-4 text-amber-300" />
              <div className="space-y-3 text-xs text-amber-100/90">
                <p className="text-sm font-medium text-amber-100">
                  Set your encryption key before uploading
                </p>
                <p>
                  We never store your plaintext key on the server. Save your key and
                  recovery bundle to USB/offline storage.
                </p>

                <div className="space-y-2">
                  <label className="text-[11px] text-amber-100/80">
                    Recovery passphrase (for new key bundle)
                  </label>
                  <Input
                    type="password"
                    value={newKeyRecoveryPassphrase}
                    onChange={(e) => setNewKeyRecoveryPassphrase(e.target.value)}
                    placeholder="Use a long unique passphrase"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateKey}
                    disabled={isSettingKey || encryptionLoading}
                  >
                    {isSettingKey ? "Creating..." : "Create New Encryption Key"}
                  </Button>
                </div>

                {freshKey && (
                  <div className="space-y-2 rounded-lg border border-amber-300/30 bg-black/20 p-3">
                    <p className="text-[11px] text-amber-100/90">
                      Save these files now. If lost, your encrypted photos cannot be
                      decrypted.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          downloadTextFile(
                            "nostalgia-encryption-key.txt",
                            freshKey,
                          )
                        }
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Raw Key
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
                          Download Recovery Bundle
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[11px] text-amber-100/80">
                      Import existing encryption key
                    </label>
                    <Input
                      value={manualKeyInput}
                      onChange={(e) => setManualKeyInput(e.target.value)}
                      placeholder="Paste raw base64 key"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleImportKey}
                      disabled={isSettingKey || encryptionLoading}
                    >
                      Import Key
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] text-amber-100/80">
                      Recover from bundle + passphrase (forgot key)
                    </label>
                    <textarea
                      value={recoveryPackageInput}
                      onChange={(e) => setRecoveryPackageInput(e.target.value)}
                      placeholder="Paste recovery package JSON"
                      className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Input
                      type="password"
                      value={recoveryPassphrase}
                      onChange={(e) => setRecoveryPassphrase(e.target.value)}
                      placeholder="Recovery passphrase"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRecoverKey}
                      disabled={isSettingKey || encryptionLoading}
                    >
                      Recover Key
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasEncryptionKey && (
          <>
            {/* Drop zone */}
            <div
              className={cn(
                "mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload
                className={cn(
                  "mb-3 h-8 w-8",
                  isDragging ? "text-primary" : "text-muted-foreground",
                )}
              />
              <p className="text-sm font-medium text-foreground">
                Drop photos here or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG, HEIC, WebP, RAW supported
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>

            {/* AI Intelligence indicator */}
            {files.length > 0 && (
              <div
                className={cn(
                  "mt-3 flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs",
                  aiOptIn
                    ? "border-purple-500/20 bg-purple-500/[0.06] text-purple-300"
                    : "border-border bg-secondary/30 text-muted-foreground",
                )}
              >
                {aiOptIn ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    <span>
                      <span className="font-medium">AI Intelligence on</span>
                      {" — "}analysis thumbnails will be created for smart search,
                      captions &amp; tags
                    </span>
                  </>
                ) : (
                  <>
                    <Brain className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>
                      AI Intelligence off — enable in{" "}
                      <a
                        href="/settings"
                        className="underline underline-offset-2 hover:text-foreground transition-colors"
                      >
                        Settings
                      </a>{" "}
                      for smart features
                    </span>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* File list */}
        {hasEncryptionKey && files.length > 0 && (
          <div className="mt-4 max-h-60 space-y-2 overflow-y-auto">
            {files.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 px-3 py-2"
              >
                <FileImage className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {uploadFile.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      {formatBytes(uploadFile.file.size)}
                    </span>
                    {uploadFile.status !== "pending" &&
                      uploadFile.status !== "completed" &&
                      uploadFile.status !== "failed" && (
                        <>
                          <span className="text-[11px] text-muted-foreground">
                            {statusLabel(uploadFile.status)}
                          </span>
                          <Progress
                            value={uploadFile.progress}
                            className="h-1 flex-1"
                          />
                        </>
                      )}
                    {uploadFile.error && (
                      <span className="text-[11px] text-destructive">
                        {uploadFile.error}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {uploadFile.status === "completed" && (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  )}
                  {uploadFile.status === "failed" && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  {(uploadFile.status === "encrypting" ||
                    uploadFile.status === "uploading" ||
                    uploadFile.status === "saving") && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {uploadFile.status === "pending" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(uploadFile.id);
                      }}
                      className="rounded p-0.5 hover:bg-accent"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {hasEncryptionKey && files.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {files.length} file{files.length !== 1 ? "s" : ""} -{" "}
              {formatBytes(totalSize)}
              {isUploading && ` - ${completedCount}/${files.length} uploaded`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFiles([]);
                  onClose();
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={isUploading || !canUpload}
                title={
                  !encryptionReady
                    ? "Encryption initializing..."
                    : !userId
                      ? "Signing in..."
                      : undefined
                }
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : !encryptionReady ? (
                  "Preparing..."
                ) : (
                  "Upload"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
