import path from "path";
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

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