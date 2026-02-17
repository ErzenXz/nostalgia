# Nostalgia

An encrypted, intelligent, open-source photo management platform. Your memories, your privacy.

## Features

- **Client-Side Encryption** — Photos are encrypted in the browser before upload. The server never sees plaintext.
- **AI-Powered Organization** — Automatic tagging, descriptions, face detection, and semantic search via embeddings.
- **Map View** — Browse photos by location with clustering and interactive maps.
- **Memories** — Auto-generated "On This Day" memories and themed collections.
- **Albums** — Create, share, and organize photos into albums with granular permissions.
- **Search** — Full-text search on descriptions, semantic/vector search on embeddings, and tag-based filtering.
- **Archive & Trash** — Soft-delete with 30-day auto-cleanup via scheduled cron jobs.
- **Dark Theme** — Beautiful, minimal dark UI by default.
- **Self-Hostable** — Bring your own MinIO (S3-compatible) storage and Convex backend.

## Tech Stack

| Layer         | Technology                            |
| ------------- | ------------------------------------- |
| Frontend      | Next.js 16, React 19, Tailwind CSS v4 |
| Backend       | Convex (real-time, serverless)        |
| Auth          | Better Auth                           |
| Storage       | MinIO (S3-compatible)                 |
| Encryption    | Web Crypto API (AES-256-GCM)          |
| Monorepo      | Turborepo + pnpm                      |
| AI (optional) | OpenAI (embeddings, analysis)         |

## Project Structure

```
nostalgia/
├── apps/
│   └── web/                    # Next.js frontend
│       ├── app/                # App Router pages
│       │   ├── (app)/          # Authenticated app pages
│       │   │   ├── photos/     # Main photo grid
│       │   │   ├── favorites/  # Favorited photos
│       │   │   ├── albums/     # Album management
│       │   │   ├── map/        # Map view
│       │   │   ├── memories/   # Auto-generated memories
│       │   │   ├── search/     # Search interface
│       │   │   ├── archive/    # Archived photos
│       │   │   └── trash/      # Trashed photos (30-day retention)
│       │   ├── (auth)/         # Login / Register
│       │   └── api/            # API routes (auth, storage)
│       ├── components/         # UI components
│       │   ├── ui/             # Base components (Button, Input, Dialog, etc.)
│       │   ├── layout/         # Sidebar, AppShell, PageHeader
│       │   ├── photos/         # PhotoGrid, Lightbox
│       │   ├── upload/         # UploadDialog
│       │   ├── map/            # PhotoMap
│       │   ├── search/         # SearchBar
│       │   ├── albums/         # AlbumCard
│       │   └── providers/      # Convex, Encryption, root Providers
│       └── lib/                # Utilities (encryption, minio, auth, utils)
├── packages/
│   ├── backend/                # Convex backend
│   │   └── convex/             # Schema, queries, mutations, cron jobs
│   ├── ui/                     # Shared UI package
│   ├── typescript-config/      # Shared TS configs
│   └── eslint-config/          # Shared ESLint configs
├── docker-compose.yml          # MinIO for local development
├── turbo.json                  # Turborepo config
└── pnpm-workspace.yaml         # Workspace definition
```

## Prerequisites

- **Node.js** >= 22
- **pnpm** >= 10.29.2
- **Docker** (for MinIO local dev)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start MinIO

```bash
docker compose up -d
```

This starts MinIO on `localhost:9000` (API) and `localhost:9001` (Console). Default credentials: `minioadmin` / `minioadmin`.

The init container automatically creates the `nostalgia-photos` and `nostalgia-thumbnails` buckets.

### 3. Set up Convex

```bash
cd packages/backend
npx convex dev
```

This will prompt you to create a Convex project and generate the deployment URL. Copy the URL into your env file.

### 4. Configure environment

Copy the example env file and fill in the values:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Required variables:

| Variable                 | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL (from step 3)           |
| `BETTER_AUTH_SECRET`     | Random secret for auth sessions                    |
| `BETTER_AUTH_URL`        | Your app URL (e.g. `http://localhost:3000`)        |
| `NEXT_PUBLIC_APP_URL`    | Same as BETTER_AUTH_URL                            |
| `MINIO_ENDPOINT`         | MinIO host (default: `localhost`)                  |
| `MINIO_PORT`             | MinIO port (default: `9000`)                       |
| `MINIO_ACCESS_KEY`       | MinIO access key (default: `minioadmin`)           |
| `MINIO_SECRET_KEY`       | MinIO secret key (default: `minioadmin`)           |
| `OPENAI_API_KEY`         | Optional — enables AI analysis and semantic search |

### 5. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Set up authentication

Better Auth is scaffolded and ready. Configure providers and plugins in `/Users/erzenkrasniqi/Projects/Nostalgia/packages/backend/convex/betterAuth/auth.ts` (Better Auth runs in the Convex backend). See the [Better Auth docs](https://www.better-auth.com/docs) for provider setup.

## Building for Production

```bash
pnpm build
```

## Convex Backend

The Convex schema includes the following tables:

- **users** — User profiles with storage quotas and encryption key hashes
- **photos** — Photo metadata, EXIF data, AI tags, embeddings, location data
- **albums** / **albumPhotos** — Album management with ordering
- **sharedAlbumAccess** — Granular album sharing permissions
- **people** / **photoPeople** — Face recognition groups
- **places** — Named locations with geo coordinates
- **uploadSessions** — Upload progress tracking
- **aiProcessingQueue** — Async AI analysis job queue
- **memories** — Auto-generated "On This Day" collections

### Cron Jobs

| Job                  | Schedule    | Description                                     |
| -------------------- | ----------- | ----------------------------------------------- |
| Trash cleanup        | Every 6 hrs | Permanently deletes photos trashed 30+ days ago |
| On This Day memories | Daily 6am   | Generates memory collections from past years    |
| AI processing retry  | Every 1 hr  | Retries failed AI analysis jobs (max 3 retries) |

## Encryption

All encryption happens client-side using the Web Crypto API:

1. A 256-bit AES-GCM key is generated per user
2. The key is stored in IndexedDB (never sent to the server)
3. Photos are encrypted in the browser before upload
4. The server only stores encrypted blobs
5. Key recovery is supported via PBKDF2 password derivation (600,000 iterations)

## License

MIT
