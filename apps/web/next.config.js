import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/backend"],
  // Enable React Compiler (Next.js will wire up the Babel plugin internally).
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
  turbopack: {
    root: resolve(__dirname, "../.."),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
