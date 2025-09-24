/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is enabled by default in Next.js 15
  serverExternalPackages: ['@supabase/supabase-js'],
  // Ensure proper environment variable handling
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Handle missing environment variables gracefully
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig
