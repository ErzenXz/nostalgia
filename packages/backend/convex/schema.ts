import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Users ──────────────────────────────────────────────
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    betterAuthUserId: v.string(),
    encryptionKeyHash: v.optional(v.string()),
    aiOptIn: v.optional(v.boolean()),
    storageQuotaBytes: v.number(),
    usedStorageBytes: v.number(),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_better_auth_id", ["betterAuthUserId"]),

  // ─── Photos ─────────────────────────────────────────────
  photos: defineTable({
    userId: v.id("users"),
    // Storage
    storageKey: v.string(), // MinIO object key
    thumbnailStorageKey: v.optional(v.string()),
    // Optional plaintext analysis thumbnail stored in Convex file storage (opt-in).
    // This enables server-side multimodal AI without ever decrypting originals.
    analysisImageStorageId: v.optional(v.string()),
    encryptedKey: v.optional(v.string()), // encrypted AES key for this photo
    // Metadata
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    // EXIF data
    takenAt: v.optional(v.number()),
    cameraMake: v.optional(v.string()),
    cameraModel: v.optional(v.string()),
    focalLength: v.optional(v.string()),
    aperture: v.optional(v.string()),
    iso: v.optional(v.number()),
    exposureTime: v.optional(v.string()),
    // Location
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
    altitude: v.optional(v.float64()),
    locationName: v.optional(v.string()),
    // AI Analysis
    description: v.optional(v.string()),
    aiTags: v.optional(v.array(v.string())),
    embedding: v.optional(v.array(v.float64())),
    // Jina CLIP v2 multimodal embeddings (text+image in same space).
    embeddingClipV2: v.optional(v.array(v.float64())),
    embeddingClipV2Dim: v.optional(v.number()),
    embeddingClipV2Model: v.optional(v.string()),
    // OpenAI vision caption + v2 tags.
    captionShort: v.optional(v.string()),
    captionShortV: v.optional(v.number()),
    aiTagsV2: v.optional(v.array(v.string())),
    aiQuality: v.optional(
      v.object({
        score: v.number(),
        reason: v.optional(v.string()),
      }),
    ),
    aiSafety: v.optional(
      v.object({
        flags: v.array(v.string()),
      }),
    ),
    aiProcessedAt: v.optional(v.number()),
    aiProcessingVersion: v.optional(v.number()),
    dominantColors: v.optional(v.array(v.string())),
    detectedObjects: v.optional(
      v.array(
        v.object({
          label: v.string(),
          confidence: v.float64(),
          boundingBox: v.optional(
            v.object({
              x: v.float64(),
              y: v.float64(),
              width: v.float64(),
              height: v.float64(),
            }),
          ),
        }),
      ),
    ),
    detectedFaces: v.optional(v.number()),
    // Status
    isEncrypted: v.boolean(),
    isFavorite: v.boolean(),
    isArchived: v.boolean(),
    isTrashed: v.boolean(),
    trashedAt: v.optional(v.number()),
    uploadedAt: v.number(),
    // Source
    source: v.union(
      v.literal("upload"),
      v.literal("google_photos"),
      v.literal("sync"),
    ),
    externalId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "takenAt"])
    .index("by_user_favorite", ["userId", "isFavorite"])
    .index("by_user_archived", ["userId", "isArchived"])
    .index("by_user_trashed", ["userId", "isTrashed"])
    .index("by_user_source", ["userId", "source"])
    .index("by_storage_key", ["storageKey"])
    .searchIndex("search_description", {
      searchField: "description",
      filterFields: ["userId"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId"],
    })
    .vectorIndex("by_embedding_clip_v2", {
      vectorField: "embeddingClipV2",
      dimensions: 1024,
      filterFields: ["userId"],
    }),

  // ─── Albums ─────────────────────────────────────────────
  albums: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    coverPhotoId: v.optional(v.id("photos")),
    isShared: v.boolean(),
    shareToken: v.optional(v.string()),
    photoCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_share_token", ["shareToken"]),

  // ─── Album Photos (junction table) ─────────────────────
  albumPhotos: defineTable({
    albumId: v.id("albums"),
    photoId: v.id("photos"),
    addedAt: v.number(),
    order: v.number(),
  })
    .index("by_album", ["albumId", "order"])
    .index("by_photo", ["photoId"]),

  // ─── Shared Albums Access ──────────────────────────────
  sharedAlbumAccess: defineTable({
    albumId: v.id("albums"),
    userId: v.id("users"),
    permission: v.union(v.literal("view"), v.literal("edit")),
    grantedAt: v.number(),
  })
    .index("by_album", ["albumId"])
    .index("by_user", ["userId"]),

  // ─── People (Face Recognition Groups) ──────────────────
  people: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    faceEmbedding: v.optional(v.array(v.float64())),
    photoCount: v.number(),
    coverPhotoId: v.optional(v.id("photos")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ─── Photo People (junction) ──────────────────────────
  photoPeople: defineTable({
    photoId: v.id("photos"),
    personId: v.id("people"),
    confidence: v.float64(),
  })
    .index("by_photo", ["photoId"])
    .index("by_person", ["personId"]),

  // ─── Places ─────────────────────────────────────────────
  places: defineTable({
    userId: v.id("users"),
    name: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    radius: v.float64(), // meters
    photoCount: v.number(),
    lastVisited: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // ─── Upload Sessions ───────────────────────────────────
  uploadSessions: defineTable({
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    totalFiles: v.number(),
    completedFiles: v.number(),
    failedFiles: v.number(),
    totalBytes: v.number(),
    uploadedBytes: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // ─── AI Processing Queue ───────────────────────────────
  aiProcessingQueue: defineTable({
    photoId: v.id("photos"),
    userId: v.id("users"),
    kind: v.optional(v.union(v.literal("photo_analysis"), v.literal("video_analysis"))),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    step: v.optional(v.union(
      v.literal("pending"),
      v.literal("embedding"),
      v.literal("caption"),
      v.literal("tags"),
      v.literal("done"),
    )),
    lockedUntil: v.optional(v.number()),
    retryCount: v.number(),
    error: v.optional(v.string()),
    providerMeta: v.optional(v.any()),
    createdAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_photo", ["photoId"]),

  // ─── Feed Sessions (Nostalgia Feed state) ──────────────
  feedSessions: defineTable({
    userId: v.id("users"),
    mode: v.union(
      v.literal("nostalgia"),
      v.literal("on_this_day"),
      v.literal("deep_dive_year"),
      v.literal("serendipity"),
    ),
    seed: v.string(),
    lastSeenAt: v.number(),
    recentPhotoIds: v.array(v.id("photos")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_mode", ["userId", "mode"]),

  // ─── Analysis Upload Tokens (bind upload -> photo) ──────
  analysisUploads: defineTable({
    userId: v.id("users"),
    photoId: v.id("photos"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_photo", ["photoId"]),

  // ─── Memories (auto-generated) ─────────────────────────
  memories: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("on_this_day"),
      v.literal("trip"),
      v.literal("people"),
      v.literal("theme"),
      v.literal("year_review"),
    ),
    photoIds: v.array(v.id("photos")),
    date: v.number(),
    isSeen: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // ─── Channels (YouTube-like spaces) ─────────────────────
  channels: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    visibility: v.union(
      v.literal("private"),
      v.literal("family"),
      v.literal("public"),
    ),
    inviteCode: v.optional(v.string()),
    memberCount: v.number(),
    mediaCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_invite_code", ["inviteCode"]),

  // ─── Channel Members ────────────────────────────────────
  channelMembers: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("editor"),
      v.literal("viewer"),
    ),
    joinedAt: v.number(),
  })
    .index("by_channel", ["channelId"])
    .index("by_user", ["userId"])
    .index("by_channel_user", ["channelId", "userId"]),

  // ─── Channel Media (shared items) ──────────────────────
  channelMedia: defineTable({
    channelId: v.id("channels"),
    photoId: v.id("photos"),
    sharedBy: v.id("users"),
    caption: v.optional(v.string()),
    sharedAt: v.number(),
  })
    .index("by_channel", ["channelId", "sharedAt"])
    .index("by_photo", ["photoId"]),

  // ─── Reactions ──────────────────────────────────────────
  reactions: defineTable({
    mediaId: v.id("photos"),
    userId: v.id("users"),
    type: v.union(
      v.literal("heart"),
      v.literal("fire"),
      v.literal("laugh"),
      v.literal("cry"),
      v.literal("wow"),
    ),
    createdAt: v.number(),
  })
    .index("by_media", ["mediaId"])
    .index("by_media_user", ["mediaId", "userId"])
    .index("by_user", ["userId"]),

  // ─── Comments ───────────────────────────────────────────
  comments: defineTable({
    mediaId: v.id("photos"),
    userId: v.id("users"),
    text: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_media", ["mediaId", "createdAt"])
    .index("by_user", ["userId"]),
});
