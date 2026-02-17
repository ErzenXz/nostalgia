"use client";

import { useState, useCallback, useMemo } from "react";
import Map, { Marker } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { cn } from "@/lib/utils";
import { MapPin, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapPhoto {
  _id: string;
  latitude: number;
  longitude: number;
  fileName: string;
  locationName?: string;
  takenAt?: number;
  uploadedAt: number;
  thumbnailStorageKey?: string;
  storageKey: string;
  mimeType: string;
  isEncrypted?: boolean;
}

interface PhotoMapProps {
  photos: MapPhoto[];
  onPhotoClick?: (photoId: string) => void;
  className?: string;
}

// Cluster photos for better visualization
function clusterPhotos(
  photos: MapPhoto[],
  zoom: number,
): { latitude: number; longitude: number; photos: MapPhoto[]; count: number }[] {
  const gridSize = 360 / Math.pow(2, zoom) / 4;
  const clusterMap: Record<string, { latitude: number; longitude: number; photos: MapPhoto[] }> = {};

  for (const photo of photos) {
    const gridLat = Math.floor(photo.latitude / gridSize);
    const gridLng = Math.floor(photo.longitude / gridSize);
    const key = `${gridLat}:${gridLng}`;

    if (clusterMap[key]) {
      const cluster = clusterMap[key];
      cluster.photos.push(photo);
      cluster.latitude =
        (cluster.latitude * (cluster.photos.length - 1) + photo.latitude) /
        cluster.photos.length;
      cluster.longitude =
        (cluster.longitude * (cluster.photos.length - 1) + photo.longitude) /
        cluster.photos.length;
    } else {
      clusterMap[key] = {
        latitude: photo.latitude,
        longitude: photo.longitude,
        photos: [photo],
      };
    }
  }

  return Object.entries(clusterMap).map(([_, c]) => ({
    ...c,
    count: c.photos.length,
  }));
}

// Custom marker component
function PhotoMarker({
  photo,
  onClick,
}: {
  photo: MapPhoto;
  onClick?: () => void;
}) {
  return (
    <div
      className="cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-110">
          <MapPin className="w-4 h-4 text-white" />
        </div>
        {photo.locationName && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {photo.locationName}
          </div>
        )}
      </div>
    </div>
  );
}

// Cluster marker component
function ClusterMarker({
  count,
  onClick,
}: {
  count: number;
  longitude: number;
  latitude: number;
  onClick?: () => void;
}) {
  const size = count < 10 ? 36 : count < 50 ? 44 : 52;
  
  return (
    <div
      className="cursor-pointer group"
      style={{ marginLeft: -size / 2, marginTop: -size / 2 }}
      onClick={onClick}
    >
      <div
        className="rounded-full bg-blue-500/90 border-2 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ width: size, height: size }}
      >
        <span className="text-sm font-medium text-white">{count}</span>
      </div>
    </div>
  );
}

export function PhotoMap({ photos, onPhotoClick, className }: PhotoMapProps) {
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 2,
    pitch: 0,
    bearing: 0,
  });
  const [mapRef, setMapRef] = useState<MapRef | null>(null);

  const clusters = useMemo(
    () => clusterPhotos(photos, viewState.zoom),
    [photos, viewState.zoom]
  );

  const handleZoomIn = useCallback(() => {
    setViewState((prev) => ({ ...prev, zoom: Math.min(prev.zoom + 1, 18) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewState((prev) => ({ ...prev, zoom: Math.max(prev.zoom - 1, 1) }));
  }, []);

  const handleFitBounds = useCallback(() => {
    if (photos.length === 0) return;
    
    const lats = photos.map((p) => p.latitude);
    const lngs = photos.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // Calculate appropriate zoom
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    const zoom = Math.floor(Math.log2(360 / maxDiff)) + 1;
    
    setViewState((prev) => ({
      ...prev,
      latitude: centerLat,
      longitude: centerLng,
      zoom: Math.max(Math.min(zoom, 12), 2),
    }));
  }, [photos]);

  if (photos.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-zinc-900 rounded-lg border border-zinc-800",
          className,
        )}
      >
        <MapPin className="h-12 w-12 text-zinc-600 mb-3" />
        <p className="text-sm text-zinc-400">No geotagged photos</p>
        <p className="text-xs text-zinc-600 mt-1">
          Photos with location data will appear on the map
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden border border-zinc-800", className)}>
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://demotiles.maplibre.org/style.json"
        attributionControl={false}
        ref={setMapRef}
      >
        {clusters.map((cluster, i) => {
          if (cluster.count === 1) {
            const photo = cluster.photos[0]!;
            return (
              <Marker
                key={photo._id}
                longitude={cluster.longitude}
                latitude={cluster.latitude}
                anchor="bottom"
              >
                <PhotoMarker
                  photo={photo}
                  onClick={() => onPhotoClick?.(photo._id)}
                />
              </Marker>
            );
          }
          
          return (
            <Marker
              key={`cluster-${i}`}
              longitude={cluster.longitude}
              latitude={cluster.latitude}
              anchor="center"
            >
              <ClusterMarker
                count={cluster.count}
                longitude={cluster.longitude}
                latitude={cluster.latitude}
                onClick={() => {
                  // Zoom into cluster
                  setViewState((prev) => ({
                    ...prev,
                    longitude: cluster.longitude,
                    latitude: cluster.latitude,
                    zoom: Math.min(prev.zoom + 2, 14),
                  }));
                }}
              />
            </Marker>
          );
        })}
      </Map>

      {/* Map controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={handleZoomIn}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={handleZoomOut}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={handleFitBounds}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Photo count */}
      <div className="absolute left-3 bottom-3 rounded-lg bg-zinc-900/90 px-3 py-1.5 backdrop-blur-sm border border-zinc-700">
        <p className="text-xs text-zinc-200">
          <span className="font-medium">{photos.length}</span>{" "}
          <span className="text-zinc-400">photos</span>
        </p>
      </div>
    </div>
  );
}
