/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Generate unique build ID to force cache invalidation
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
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
// NUCLEAR CACHE BUST - Sun Oct 5 23:06 UTC 2025
