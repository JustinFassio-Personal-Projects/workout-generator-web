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
  // Improve CSS compilation stability during Fast Refresh
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Reduce CSS rebuild frequency during development
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
      }
    }
    return config
  },
}

module.exports = withBotId(nextConfig)
