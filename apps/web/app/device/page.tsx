import { Suspense } from "react";
import DeviceClient from "./device-client";

export default function DeviceVerificationPage() {
  return (
    <Suspense
      fallback={<div className="text-sm text-muted-foreground">Loading...</div>}
    >
      <DeviceClient />
    </Suspense>
  );
}

