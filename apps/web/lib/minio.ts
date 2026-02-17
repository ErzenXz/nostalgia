import { Client } from "minio";

// MinIO client configuration - runs server-side only
export function getMinioClient() {
  // Defaults are intentionally local-dev friendly. Production should override via env.
  const accessKey = process.env.MINIO_ACCESS_KEY || "minioadmin";
  const secretKey = process.env.MINIO_SECRET_KEY || "minioadmin";
  const useSSL = process.env.MINIO_USE_SSL === "true";
  const port =
    process.env.MINIO_PORT !== undefined && process.env.MINIO_PORT !== ""
      ? parseInt(process.env.MINIO_PORT, 10)
      : useSSL
        ? 443
        : 9000;

  return new Client({
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port,
    useSSL,
    accessKey,
    secretKey,
  });
}

const BUCKET_NAME = process.env.MINIO_BUCKET || "nostalgia-photos";
const THUMBNAIL_BUCKET =
  process.env.MINIO_THUMBNAIL_BUCKET || "nostalgia-thumbnails";

export async function ensureBuckets() {
  const client = getMinioClient();

  for (const bucket of [BUCKET_NAME, THUMBNAIL_BUCKET]) {
    const exists = await client.bucketExists(bucket);
    if (!exists) {
      await client.makeBucket(bucket);
    }
  }
}

export async function uploadToMinio(
  key: string,
  data: Buffer | ReadableStream,
  contentType: string,
  bucket = BUCKET_NAME,
): Promise<string> {
  const client = getMinioClient();
  await client.putObject(bucket, key, data as any, undefined, {
    "Content-Type": contentType,
  });
  return key;
}

export async function getPresignedUploadUrl(
  key: string,
  bucket = BUCKET_NAME,
  expirySeconds = 3600,
): Promise<string> {
  const client = getMinioClient();
  return await client.presignedPutObject(bucket, key, expirySeconds);
}

export async function getPresignedDownloadUrl(
  key: string,
  bucket = BUCKET_NAME,
  expirySeconds = 3600,
): Promise<string> {
  const client = getMinioClient();
  return await client.presignedGetObject(bucket, key, expirySeconds);
}

export async function deleteFromMinio(
  key: string,
  bucket = BUCKET_NAME,
): Promise<void> {
  const client = getMinioClient();
  await client.removeObject(bucket, key);
}

export async function getObject(
  key: string,
  bucket = BUCKET_NAME,
): Promise<Buffer> {
  const client = getMinioClient();
  const stream = await client.getObject(bucket, key);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export function generateStorageKey(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  const ext = fileName.split(".").pop() || "jpg";
  return `${userId}/${timestamp}-${random}.${ext}`;
}

export function generateThumbnailKey(storageKey: string): string {
  return `thumb-${storageKey}`;
}

export { BUCKET_NAME, THUMBNAIL_BUCKET };
