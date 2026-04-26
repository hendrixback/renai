import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl plugin: tells the framework where the request-config file
// lives so server components can resolve messages without a per-route
// import. Single-locale today; locale routing comes when we add pt-PT.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Produces a minimal server bundle under `.next/standalone/` so the Docker
  // runtime image stays small (Railway / any container host).
  output: "standalone",

  experimental: {
    // Keep recently-visited dynamic segments in the client router cache.
    // Default in Next 16 is 0s for `dynamic`, which turns every re-visit of
    // a tab into a fresh server roundtrip. Mutations still invalidate via
    // `router.refresh()` from server-action callers.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default withNextIntl(nextConfig);
