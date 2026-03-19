"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { UploadPageClient } from "@/components/upload/upload-page-client";

export default function UploadPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="Upload"
        description="Encrypted uploads, fast thumbnails, and reliable AI indexing."
      >
        <Link
          href="/photos"
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[14px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Photos
        </Link>
      </PageHeader>

      <div className="px-4 py-6 md:px-8">
        <div className="mx-auto max-w-[1400px]">
          <UploadPageClient />
        </div>
      </div>
    </div>
  );
}
