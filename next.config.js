/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.extensions = ['.js', '.jsx', '.json', '.ts', '.tsx'];
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.mts']
    };
    return config;
  },
  experimental: {
    esmExternals: true
  }
};

export default nextConfig;
// Force rebuild Mon Sep 22 16:30:51 UTC 2025
// Trigger full Vercel build Mon Sep 22 16:46:03 UTC 2025
