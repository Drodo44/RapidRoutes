// This file must be CommonJS format for Next.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.extensions = ['.js', '.jsx', '.json', '.ts', '.tsx']
    config.resolve.extensionAlias = {
      '.js': ['.js', '.jsx', '.ts', '.tsx'],
      '.jsx': ['.jsx']
    }
    config.module = {
      ...config.module,
      rules: [
        ...config.module.rules,
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: ['babel-loader']
        }
      ]
    }
    return config
  }
}

module.exports = nextConfig