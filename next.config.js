const { withBotId } = require('botid/next/config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.dicebear.com'],
    formats: ['image/avif', 'image/webp'],
  },
  sassOptions: {
    includePaths: [],
    // Suppress deprecation warnings during development
    silenceDeprecations: ['legacy-js-api'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Fix webpack chunk resolution issues in development
  webpack: (config, { dev }) => {
    if (dev) {
      // Use deterministic IDs for both client and server to prevent missing chunk errors
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      }
    }
    return config
  },
}

module.exports = withBotId(nextConfig)
