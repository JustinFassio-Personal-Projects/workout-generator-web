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
  // 301 Redirects for SEO recovery from WordPress site
  async redirects() {
    return [
      // Folder wildcards (Priority - must come before individual redirects)
      {
        source: '/workout-summary/:path*',
        destination: '/generate',
        permanent: true,
      },
      {
        source: '/fitness-program/:path*',
        destination: '/generate',
        permanent: true,
      },
      {
        source: '/workouts/:path*',
        destination: '/generate',
        permanent: true,
      },
      {
        source: '/project/:path*',
        destination: '/generate',
        permanent: true,
      },
      {
        source: '/project_tag/:path*',
        destination: '/generate',
        permanent: true,
      },
      {
        source: '/project_category/:path*',
        destination: '/generate',
        permanent: true,
      },
      {
        source: '/author/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/category/:path*',
        destination: '/blog',
        permanent: true,
      },
      // Home page redirects
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/home/',
        destination: '/',
        permanent: true,
      },
      // Blog post redirects (to /blog/:slug) - individual blog posts
      {
        source: '/ai-will-revolutionize-your-approach-to-fitness',
        destination: '/blog/ai-will-revolutionize-your-approach-to-fitness',
        permanent: true,
      },
      {
        source: '/ai-will-revolutionize-your-approach-to-fitness/',
        destination: '/blog/ai-will-revolutionize-your-approach-to-fitness',
        permanent: true,
      },
      {
        source: '/the-power-of-functional-fitness',
        destination: '/blog/the-power-of-functional-fitness',
        permanent: true,
      },
      {
        source: '/the-power-of-functional-fitness/',
        destination: '/blog/the-power-of-functional-fitness',
        permanent: true,
      },
      {
        source: '/ai-fitness-trainers',
        destination: '/blog/ai-fitness-trainers',
        permanent: true,
      },
      {
        source: '/ai-fitness-trainers/',
        destination: '/blog/ai-fitness-trainers',
        permanent: true,
      },
      {
        source: '/tacp-school-house-workout-1990s',
        destination: '/blog/tacp-school-house-workout-1990s',
        permanent: true,
      },
      {
        source: '/tacp-school-house-workout-1990s/',
        destination: '/blog/tacp-school-house-workout-1990s',
        permanent: true,
      },
      {
        source: '/football-accelleration-decelleration-workout',
        destination: '/blog/football-accelleration-decelleration-workout',
        permanent: true,
      },
      {
        source: '/football-accelleration-decelleration-workout/',
        destination: '/blog/football-accelleration-decelleration-workout',
        permanent: true,
      },
      {
        source: '/can-ai-generated-workouts-boost-gym-revenue',
        destination: '/blog/can-ai-generated-workouts-boost-gym-revenue',
        permanent: true,
      },
      {
        source: '/can-ai-generated-workouts-boost-gym-revenue/',
        destination: '/blog/can-ai-generated-workouts-boost-gym-revenue',
        permanent: true,
      },
      {
        source: '/mobility-exercises-for-golfers',
        destination: '/blog/mobility-exercises-for-golfers',
        permanent: true,
      },
      {
        source: '/mobility-exercises-for-golfers/',
        destination: '/blog/mobility-exercises-for-golfers',
        permanent: true,
      },
      {
        source: '/ai-generated-dumbbell-chest-workout',
        destination: '/blog/ai-generated-dumbbell-chest-workout',
        permanent: true,
      },
      {
        source: '/ai-generated-dumbbell-chest-workout/',
        destination: '/blog/ai-generated-dumbbell-chest-workout',
        permanent: true,
      },
      {
        source: '/ai-generated-high-intensity-workout',
        destination: '/blog/ai-generated-high-intensity-workout',
        permanent: true,
      },
      {
        source: '/ai-generated-high-intensity-workout/',
        destination: '/blog/ai-generated-high-intensity-workout',
        permanent: true,
      },
      {
        source: '/ai-generated-micro-workout',
        destination: '/blog/ai-generated-micro-workout',
        permanent: true,
      },
      {
        source: '/ai-generated-micro-workout/',
        destination: '/blog/ai-generated-micro-workout',
        permanent: true,
      },
      {
        source: '/ai-workout-female-38yrs-active-runner-high-intensity',
        destination: '/blog/ai-workout-female-38yrs-active-runner-high-intensity',
        permanent: true,
      },
      {
        source: '/ai-workout-female-38yrs-active-runner-high-intensity/',
        destination: '/blog/ai-workout-female-38yrs-active-runner-high-intensity',
        permanent: true,
      },
      // External redirects to app (https://aiworkoutgen.app)
      {
        source: '/login',
        destination: 'https://aiworkoutgen.app/login',
        permanent: true,
      },
      {
        source: '/login/',
        destination: 'https://aiworkoutgen.app/login',
        permanent: true,
      },
      {
        source: '/react-login',
        destination: 'https://aiworkoutgen.app/login',
        permanent: true,
      },
      {
        source: '/react-login/',
        destination: 'https://aiworkoutgen.app/login',
        permanent: true,
      },
      {
        source: '/workout-generator-registration',
        destination: 'https://aiworkoutgen.app/signup',
        permanent: true,
      },
      {
        source: '/workout-generator-registration/',
        destination: 'https://aiworkoutgen.app/signup',
        permanent: true,
      },
      {
        source: '/build/login',
        destination: 'https://aiworkoutgen.app/login',
        permanent: true,
      },
      {
        source: '/features/login',
        destination: 'https://aiworkoutgen.app/login',
        permanent: true,
      },
      {
        source: '/features/login/',
        destination: 'https://aiworkoutgen.app/login',
        permanent: true,
      },
      {
        source: '/register',
        destination: 'https://aiworkoutgen.app/signup',
        permanent: true,
      },
      {
        source: '/register/',
        destination: 'https://aiworkoutgen.app/signup',
        permanent: true,
      },
      // Marketing page redirects
      {
        source: '/pricing',
        destination: '/#pricing',
        permanent: true,
      },
      {
        source: '/pricing/',
        destination: '/#pricing',
        permanent: true,
      },
      {
        source: '/purchase',
        destination: '/#pricing',
        permanent: true,
      },
      {
        source: '/purchase/',
        destination: '/#pricing',
        permanent: true,
      },
      {
        source: '/how-it-works',
        destination: '/#journey',
        permanent: true,
      },
      {
        source: '/how-it-works/',
        destination: '/#journey',
        permanent: true,
      },
      {
        source: '/ai-generated-workouts',
        destination: '/',
        permanent: true,
      },
      {
        source: '/ai-generated-workouts/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/explorer',
        destination: '/',
        permanent: true,
      },
      {
        source: '/explorer/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/trailblazer',
        destination: '/',
        permanent: true,
      },
      {
        source: '/trailblazer/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/workout-generator-app',
        destination: '/',
        permanent: true,
      },
      {
        source: '/workout-generator-app/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/blog',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/blog/',
        destination: '/blog',
        permanent: true,
      },
      // Other pages redirect to home
      {
        source: '/api-documentation',
        destination: '/',
        permanent: true,
      },
      {
        source: '/api-documentation/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/contact',
        destination: '/',
        permanent: true,
      },
      {
        source: '/faq',
        destination: '/',
        permanent: true,
      },
      {
        source: '/privacy-policy',
        destination: '/',
        permanent: true,
      },
      {
        source: '/privacy-policy/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/physical-information',
        destination: '/',
        permanent: true,
      },
      {
        source: '/physical-information/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/prompt',
        destination: '/',
        permanent: true,
      },
      {
        source: '/prompt/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/membership-account/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/favicon.ico',
        destination: '/favicon.ico',
        permanent: true,
      },
    ]
  },
}

module.exports = withBotId(nextConfig)
