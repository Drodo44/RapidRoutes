// This file must be CommonJS format for Next.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.extensions = ['.js', '.json', '.ts', '.tsx']
    // Allow ESM imports
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.mts']
    }
    return config
  },
  experimental: {
    esmExternals: true
  }
}

module.exports = nextConfig