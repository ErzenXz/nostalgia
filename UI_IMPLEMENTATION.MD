# UI Implementation Guide (No UI Code)

This document describes how a web designer/front-end engineer should wire the UI to the backend AI pipeline and Nostalgia Feed.

## Key Concepts

- **Original uploads remain end-to-end encrypted** and stored in MinIO (S3 compatible).
- To enable **server-side intelligence**, the client can optionally upload a **small plaintext “analysis thumbnail”** to **Convex file storage**.
  - This is opt-in and should be clearly explained in the UI.
  - Recommended: 512px max dimension, JPEG quality ~0.8.

## Required Environment Variables (Backend)

- `JINA_API_KEY` (Jina embeddings)
- `OPENAI_API_KEY` (Vercel AI SDK + OpenAI provider)

## UX: “Enable AI Intelligence” (Opt-In)

Provide a setting (per user) that explains:

- What is uploaded:
  - A low-resolution thumbnail for analysis only.
- What is not uploaded:
  - The original full-resolution encrypted photo/video.
- What users get:
  - Better search, automatic captions, tags, and the Nostalgia Feed.

If the user opts out, do not upload analysis thumbnails and do not show AI-generated captions/tags.

## Upload Flow (Photo)

This is the intended upload pipeline for each newly uploaded photo.

### Step 1: Upload encrypted original to MinIO (existing)

Keep the current flow that:

1. Encrypts the file in the browser.
2. Uploads to MinIO using `/api/storage` presigned URL.
3. Creates the Convex `photos` record via `api.photos.create`.

### Step 2: Create analysis thumbnail in the browser (new, plaintext)

Before encrypting (or by reusing the original plaintext file object in memory):

1. Generate a thumbnail (JPEG recommended):
   - Max dimension: 512px
   - Quality: ~0.8
2. Do **not** encrypt this thumbnail.

### Step 3: Request a Convex analysis upload URL

Call Convex mutation:

- `api.ai.uploads.generateAnalysisUploadUrl({ photoId })`

It returns:

- `uploadUrl`: Convex storage upload endpoint (HTTP POST)
- `analysisToken`: one-time token binding upload to `photoId`
- `expiresAt`: epoch ms

### Step 4: POST the thumbnail to Convex storage

Upload thumbnail bytes to the `uploadUrl` using an HTTP `POST` with the file bytes as the request body.

Convex’s upload endpoint responds with JSON including:

- `storageId` (string)

Store this `storageId` in memory for the next step.

### Step 5: Attach thumbnail and enqueue AI processing

Call Convex mutation:

- `api.ai.uploads.attachAnalysisThumbnail({ photoId, storageId, analysisToken, width, height, mimeType })`

This will:

- Store `analysisImageStorageId` on the photo record.
- Create or reset the `aiProcessingQueue` job for this photo.

### Step 6: Show processing status

UI should reflect one of:

- Pending
- Processing
- Completed
- Failed (with retry option that re-attaches thumbnail or re-queues)

The current backend stores jobs in `aiProcessingQueue`. You can add a query later for job status by photo id, or reuse existing indexes.

## Search Wiring

### Semantic Search (Multimodal)

Call action:

- `api.ai.search.semanticSearch({ query, limit })`

Return value includes:

- vector search result entries
- a hydrated `photo` field (best-effort)

UI should:

- show results by `photoId`
- show `captionShort` if present
- allow filtering by tag chips (`aiTagsV2`)

## Nostalgia Feed Wiring

### Fetching the feed

Call action:

- `api.feed.nostalgia.getNostalgiaFeed({ mode, limit, cursor, seed, year })`

Modes:

- `nostalgia`
- `on_this_day`
- `deep_dive_year` (pass `year`)
- `serendipity`

Response:

- `items`: list of feed items with `photoId`, `reason`, `captionShort`, `aiTagsV2`, and score breakdown
- `nextCursor`: pagination cursor

UI should:

- render items as a continuous scroll
- show the `reason` prominently (this is the emotional hook)
- optionally allow a “Deep dive into year …” control

## Designer Notes (What to Emphasize)

- Nostalgia feed should feel like:
  - “A story of my life,” not random shuffle.
- Always show:
  - Year
  - Reason label (From 2003 / On this day / Same place / Same vibe)
  - Short caption (if available)

