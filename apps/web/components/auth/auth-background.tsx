"use client";

import dynamic from "next/dynamic";

const HalftoneDotsRaw = dynamic(
  () => import('@paper-design/shaders-react').then((mod) => mod.HalftoneDots),
  { ssr: false }
);

export function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <HalftoneDotsRaw 
        width={1920} 
        height={1080} 
        colorBack="transparent" 
        colorFront="currentColor" 
        originalColors={false} 
        type="gooey" 
        grid="hex" 
        inverted={false} 
        size={0.5} 
        radius={1.25} 
        contrast={0.4} 
        grainMixer={0.2} 
        grainOverlay={0.2} 
        grainSize={0.5} 
        fit="cover" 
      />
    </div>
  );
}
