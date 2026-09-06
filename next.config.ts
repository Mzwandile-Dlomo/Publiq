import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      // UploadThing-hosted content media (legacy utfs.io + per-app ufs.sh hosts).
      { protocol: "https", hostname: "utfs.io", pathname: "/f/**" },
      { protocol: "https", hostname: "*.ufs.sh", pathname: "/f/**" },
      // Avatars on connected social accounts.
      { protocol: "https", hostname: "graph.facebook.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
