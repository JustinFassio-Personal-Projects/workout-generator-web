/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qbklyimfazrkutwqictw.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'workoutgenerator.com',
      },
      {
        protocol: 'https',
        hostname: 'aiworkoutgenerator.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 85],
  },
  sassOptions: {
    includePaths: [],
    silenceDeprecations: ['legacy-js-api'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // Avoid "[patch-graph] File content mismatch after reload" with dynamic routes (e.g. [slug])
    turbopackFileSystemCacheForDev: false,
  },
}

module.exports = nextConfig
