"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MapPin, Layers, ZoomIn, ZoomOut, Locate } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapPhoto {
  _id: string;
  latitude: number;
  longitude: number;
  fileName: string;
  locationName?: string;
  takenAt?: number;
  uploadedAt: number;
}

interface PhotoMapProps {
  photos: MapPhoto[];
  onPhotoClick?: (photoId: string) => void;
  className?: string;
}

// Simple cluster calculation
function clusterPhotos(
  photos: MapPhoto[],
  zoom: number,
): { lat: number; lng: number; photos: MapPhoto[]; count: number }[] {
  const gridSize = 360 / Math.pow(2, zoom) / 4;
  const clusters: Map<
    string,
    { lat: number; lng: number; photos: MapPhoto[] }
  > = new Map();

  for (const photo of photos) {
    const gridLat = Math.floor(photo.latitude / gridSize);
    const gridLng = Math.floor(photo.longitude / gridSize);
    const key = `${gridLat}:${gridLng}`;

    if (clusters.has(key)) {
      const cluster = clusters.get(key)!;
      cluster.photos.push(photo);
      cluster.lat =
        (cluster.lat * (cluster.photos.length - 1) + photo.latitude) /
        cluster.photos.length;
      cluster.lng =
        (cluster.lng * (cluster.photos.length - 1) + photo.longitude) /
        cluster.photos.length;
    } else {
      clusters.set(key, {
        lat: photo.latitude,
        lng: photo.longitude,
        photos: [photo],
      });
    }
  }

  return Array.from(clusters.values()).map((c) => ({
    ...c,
    count: c.photos.length,
  }));
}

export function PhotoMap({ photos, onPhotoClick, className }: PhotoMapProps) {
  const [zoom, setZoom] = useState(3);
  const [center, setCenter] = useState({ lat: 20, lng: 0 });

  const clusters = clusterPhotos(photos, zoom);

  if (photos.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-secondary/50 rounded-xl",
          className,
        )}
      >
        <MapPin className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No geotagged photos</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Photos with location data will appear on the map
        </p>
      </div>
    );
  }

  // Simplified map view - in production would use maplibre-gl
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-[#1a1a2e]",
        className,
      )}
    >
      {/* Map background with grid */}
      <div className="absolute inset-0">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="grid"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Cluster markers */}
      <div className="absolute inset-0">
        {clusters.map((cluster, i) => {
          const x = ((cluster.lng + 180) / 360) * 100;
          const y = ((90 - cluster.lat) / 180) * 100;

          return (
            <button
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110"
              style={{
                left: `${Math.min(Math.max(x, 5), 95)}%`,
                top: `${Math.min(Math.max(y, 5), 95)}%`,
              }}
              onClick={() => {
                if (cluster.count === 1) {
                  onPhotoClick?.(cluster.photos[0]!._id);
                }
              }}
            >
              <div
                className={cn(
                  "map-cluster-marker shadow-lg shadow-black/20",
                  cluster.count === 1
                    ? "h-8 w-8"
                    : cluster.count < 10
                      ? "h-10 w-10"
                      : cluster.count < 100
                        ? "h-12 w-12"
                        : "h-14 w-14",
                )}
              >
                {cluster.count === 1 ? (
                  <MapPin className="h-4 w-4" />
                ) : (
                  cluster.count
                )}
              </div>
              {cluster.photos[0]?.locationName && cluster.count <= 3 && (
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                  {cluster.photos[0].locationName}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Map controls */}
      <div className="absolute right-4 top-4 flex flex-col gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          className="bg-card/80 backdrop-blur-sm border-border/50"
          onClick={() => setZoom((z) => Math.min(z + 1, 18))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="bg-card/80 backdrop-blur-sm border-border/50"
          onClick={() => setZoom((z) => Math.max(z - 1, 1))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Photo count */}
      <div className="absolute left-4 bottom-4 rounded-lg bg-card/80 px-3 py-1.5 backdrop-blur-sm border border-border/50">
        <p className="text-xs text-foreground">
          <span className="font-medium">{photos.length}</span>{" "}
          <span className="text-muted-foreground">geotagged photos</span>
        </p>
      </div>

      {/* Zoom level */}
      <div className="absolute right-4 bottom-4 rounded-lg bg-card/80 px-3 py-1.5 backdrop-blur-sm border border-border/50">
        <p className="text-xs text-muted-foreground">Zoom: {zoom}</p>
      </div>
    </div>
  );
}
