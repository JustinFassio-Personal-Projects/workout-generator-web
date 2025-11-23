const { withBotId } = require('botid/next/config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.dicebear.com'],
    formats: ['image/avif', 'image/webp'],
  },
  sassOptions: {
    includePaths: [],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = withBotId(nextConfig)
