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
  },
  // Explicitly enable API routes
  api: {
    bodyParser: true,
    externalResolver: false
  }
};

module.exports = nextConfig;
