/**
 * Extract a thumbnail frame from a video file.
 * Seeks to 1 second (or 0 if shorter) and draws to canvas.
 */
export function createVideoThumbnailBlob(
  file: File,
  options: { maxSize?: number; quality?: number } = {},
): Promise<Blob> {
  const { maxSize = 512, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.addEventListener("loadedmetadata", () => {
      // Seek to 1s or 10% of duration, whichever is smaller
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    });

    video.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        // Scale down to maxSize
        const scale = Math.min(1, maxSize / Math.max(vw, vh));
        canvas.width = Math.round(vw * scale);
        canvas.height = Math.round(vh * scale);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          reject(new Error("Canvas 2D not available"));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob from canvas"));
            }
          },
          "image/jpeg",
          quality,
        );
      } catch (err) {
        cleanup();
        reject(err);
      }
    });

    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("Failed to load video for thumbnail"));
    });
  });
}

/**
 * Get duration of a video file in seconds.
 */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.src = url;

    video.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata"));
    });
  });
}

/**
 * Get duration of an audio file in seconds.
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    const url = URL.createObjectURL(file);
    audio.src = url;

    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });

    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load audio metadata"));
    });
  });
}
