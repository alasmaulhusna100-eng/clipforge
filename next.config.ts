import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native binary helper packages out of the bundle so their
  // __dirname-relative binary paths resolve to node_modules at runtime.
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
};

export default nextConfig;
