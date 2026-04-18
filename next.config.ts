import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal server bundle under `.next/standalone/` so the Docker
  // runtime image stays small (Railway / any container host).
  output: "standalone",
};

export default nextConfig;
