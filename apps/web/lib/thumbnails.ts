// Client-side thumbnail helpers.
// Used to create small previews that can be encrypted+uploaded alongside originals.

export async function createImageThumbnailBlob(
  file: File,
  {
    maxSize = 512,
    mimeType = "image/jpeg",
    quality = 0.82,
  }: {
    maxSize?: number;
    mimeType?: string;
    quality?: number;
  } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  // Prefer OffscreenCanvas when available; fall back to DOM canvas.
  const canvas: OffscreenCanvas | HTMLCanvasElement =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement("canvas"), { width, height });

  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new Error("Failed to create 2d canvas context");

  // The lib.dom types model multiple OffscreenCanvas contexts; we explicitly
  // request "2d" so drawImage is available at runtime.
  (ctx as CanvasRenderingContext2D).drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  if ("convertToBlob" in canvas) {
    return await (canvas as OffscreenCanvas).convertToBlob({ type: mimeType, quality });
  }

  return await new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to create thumbnail blob"))),
      mimeType,
      quality,
    );
  });
}
