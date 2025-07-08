/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [], // add your logo hosting domain here if needed in future
  },
};

module.exports = nextConfig;
