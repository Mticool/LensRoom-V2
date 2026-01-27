import path from "path";
import fs from "fs";
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

function parseDotenv(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    // support: export KEY=VALUE
    const noExport = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trim() : trimmed;
    const eq = noExport.indexOf("=");
    if (eq <= 0) continue;
    const key = noExport.slice(0, eq).trim();
    let val = noExport.slice(eq + 1).trim();
    // strip inline comments only for unquoted values
    const isQuoted = (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
    if (!isQuoted) {
      const hash = val.indexOf(" #");
      if (hash !== -1) val = val.slice(0, hash).trim();
    }
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    // minimal unescape for common sequences
    val = val.replace(/\\n/g, "\n");
    if (key) out[key] = val;
  }
  return out;
}

function loadEnvFromCandidateFiles() {
  // Next.js already loads .env.local/.env.* in the project root.
  // This helper is specifically for local setups where env lives *outside* `lensroom-v2/`
  // (e.g. a shared `~/.env`), which previously made auth/generation "randomly break" in dev.
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) return;

  const candidates = [
    // local project root (should already work, but harmless)
    path.resolve(__dirname, ".env.local"),
    path.resolve(__dirname, ".env.production.local"),
    path.resolve(__dirname, ".env.production"),
    path.resolve(__dirname, ".env"),
    // parent(s)
    path.resolve(__dirname, "..", ".env.local"),
    path.resolve(__dirname, "..", ".env.production.local"),
    path.resolve(__dirname, "..", ".env.production"),
    path.resolve(__dirname, "..", ".env"),
    path.resolve(__dirname, "..", "..", ".env.local"),
    path.resolve(__dirname, "..", "..", ".env.production.local"),
    path.resolve(__dirname, "..", "..", ".env.production"),
    path.resolve(__dirname, "..", "..", ".env"),
    path.resolve(__dirname, "..", "..", "..", ".env.local"),
    path.resolve(__dirname, "..", "..", "..", ".env.production.local"),
    path.resolve(__dirname, "..", "..", "..", ".env.production"),
    path.resolve(__dirname, "..", "..", "..", ".env"),
  ];

  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const raw = fs.readFileSync(p, "utf8");
      const parsed = parseDotenv(raw);
      // Only set missing vars; do not override explicit env.
      for (const [k, v] of Object.entries(parsed)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }
    } catch {
      // ignore
    }
  }

  // Common aliases (projects sometimes keep server vars without NEXT_PUBLIC_ prefix).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const alt =
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE ||
      process.env.SUPABASE_SERVICE_ROLE_TOKEN;
    if (alt) process.env.SUPABASE_SERVICE_ROLE_KEY = alt;
  }
}

// Load env before Next config is evaluated (dev only).
loadEnvFromCandidateFiles();

// Fix Next/Turbopack choosing wrong workspace root when multiple lockfiles exist
// (e.g. a stray ~/package-lock.json).
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  compress: true,
  poweredByHeader: false,
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  
  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lensroom.ru",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      // KIE AI generated images
      {
        protocol: "https",
        hostname: "tempfile.aiquickdraw.com",
      },
      {
        protocol: "https",
        hostname: "**.kie.ai",
      },
      {
        protocol: "https",
        hostname: "**.aiquickdraw.com",
      },
      // Unsplash for landing page examples
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // HTTP headers for caching and security
  async headers() {
    return [
      {
        // Static assets - long cache
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Video files - long cache
        source: "/:all*(mp4|webm|mov)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // JS/CSS bundles - long cache (hashed filenames)
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Service worker
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        // API responses - short cache for read-only APIs
        source: "/api/content/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        // HTML pages - short cache with revalidation
        source: "/:path((?!api|_next).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        // Security headers for all pages
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },

  experimental: {
    // Reduce client bundle size for large icon libraries
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "framer-motion",
      "date-fns",
      "@tanstack/react-query",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
    ],
    // Increase body size limit for large image uploads (8MB+ images)
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // CRITICAL: Fix "Unterminated string in JSON" - increase API route body limit
    // Without this, Next.js truncates request body at 10MB, breaking base64 images
    middlewareClientMaxBodySize: '50mb',
  },

  // Aggressive code splitting for better performance
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for rarely-changing libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Separate chunk for Radix UI (large library)
            radix: {
              name: 'radix',
              test: /[\\/]node_modules[\\/]@radix-ui/,
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Separate chunk for framer-motion (large library)
            framer: {
              name: 'framer',
              test: /[\\/]node_modules[\\/]framer-motion/,
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Separate chunk for React Query
            reactQuery: {
              name: 'react-query',
              test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query/,
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Common chunk for reused code (minimum 2 modules)
            common: {
              name: 'common',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    return config;
  },

  // Redirects for old routes (keeping SEO landing pages: /video, /image)
  async redirects() {
    return [
      {
        source: '/studio',
        destination: '/create/studio',
        permanent: false,
      },
      {
        source: '/generator',
        destination: '/create/studio',
        permanent: false,
      },
      {
        source: '/create',
        destination: '/create/studio',
        permanent: false,
      },
      {
        source: '/login',
        destination: '/m',
        permanent: false,
      },
      {
        source: '/create/video',
        destination: '/video', // SEO page
        permanent: false,
      },
      {
        source: '/design',
        destination: '/create/studio',
        permanent: false,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);