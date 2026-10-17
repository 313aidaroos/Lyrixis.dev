import type { NextConfig } from "next";

// ffmpeg-static ships a ~80 MB Linux binary next to its index.js. It stays external (so its
// __dirname-based path is right at runtime) and the binary is traced explicitly into the routes
// that run the lyrics pipeline (Option B, 2026-10-05).
const FFMPEG_BINARY = ["./node_modules/ffmpeg-static/ffmpeg"];

const nextConfig: NextConfig = {
  serverExternalPackages: ["music-metadata", "ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/tracks": FFMPEG_BINARY,
    "/api/tracks/[id]/retry": FFMPEG_BINARY,
    "/api/voice-songs/songs/[id]/advance": FFMPEG_BINARY,
  },
  async rewrites() {
    return [{ source: "/enterprise", destination: "/index.html" }];
  },
};

export default nextConfig;
