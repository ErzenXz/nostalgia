"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/layout/page-header";
import { PhotoMap } from "@/components/map/photo-map";
import { Button } from "@/components/ui/button";
import { Layers, Loader2 } from "lucide-react";

export default function MapPage() {
  const { userId, isLoading: userLoading } = useCurrentUser();

  const geoPhotos = useQuery(
    api.photos.getGeotagged,
    userId ? { userId } : "skip",
  );

  const isLoading = userLoading || (userId && geoPhotos === undefined);
  // getGeotagged already filters to photos with lat/lng defined, safe to cast
  const photos = (geoPhotos ?? []) as any[];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Map" description={`${photos.length} geotagged photos`}>
        <Button variant="outline" size="sm">
          <Layers className="h-4 w-4" />
          Layers
        </Button>
      </PageHeader>

      <div className="p-8">
        <PhotoMap photos={photos} className="h-[calc(100vh-10rem)]" />
      </div>
    </>
  );
}
