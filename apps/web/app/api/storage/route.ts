import { NextRequest, NextResponse } from "next/server";
import { api } from "@repo/backend/convex/_generated/api";
import {
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  generateStorageKey,
  generateThumbnailKey,
  ensureBuckets,
  THUMBNAIL_BUCKET,
} from "@/lib/minio";
import { fetchAuthQuery } from "@/lib/auth-server";

// Get presigned upload URL
export async function POST(request: NextRequest) {
  try {
    const authedUserId = await fetchAuthQuery(api.users.getCurrentUserId, {});
    if (!authedUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileName } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Ensure buckets exist
    await ensureBuckets();

    const storageKey = generateStorageKey(String(authedUserId), fileName);
    const thumbnailKey = generateThumbnailKey(storageKey);

    const uploadUrl = await getPresignedUploadUrl(storageKey);
    const thumbnailUploadUrl = await getPresignedUploadUrl(
      thumbnailKey,
      THUMBNAIL_BUCKET,
    );

    return NextResponse.json({
      storageKey,
      thumbnailKey,
      uploadUrl,
      thumbnailUploadUrl,
    });
  } catch (error) {
    console.error("Storage error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}

// Get presigned download URL
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get("key");
  const bucketParam = searchParams.get("bucket") || undefined;

  if (!key) {
    return NextResponse.json({ error: "Missing storage key" }, { status: 400 });
  }

  try {
    // Default thumbnails to the thumbnail bucket without requiring callers to pass `bucket=...`.
    const bucket =
      bucketParam ?? (key.startsWith("thumb-") ? THUMBNAIL_BUCKET : undefined);
    const downloadUrl = await getPresignedDownloadUrl(key, bucket);
    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error("Storage error:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 },
    );
  }
}
