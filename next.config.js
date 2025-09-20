/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Handle JS files properly
    config.resolve.extensions = ['.js', '.json', '.ts', '.tsx']
    
    return config
  },
}

module.exports = nextConfig