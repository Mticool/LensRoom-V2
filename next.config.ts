import path from "path";
import type { NextConfig } from "next";

// Fix Next/Turbopack choosing wrong workspace root when multiple lockfiles exist
// (e.g. a stray ~/package-lock.json).
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
