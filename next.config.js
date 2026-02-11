/** @type {import('next').NextConfig} */
import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  // Explicitly expose Supabase environment variables to client bundle
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  async redirects() {
    return [
      {
        source: '/prompts/library',
        destination: '/sales-resources',
        permanent: true
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/sales-resources',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store'
          }
        ]
      }
    ];
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
  },
  images: { 
    domains: ["supabase.co", "vercel.app"], 
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400, // 1 day cache
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  }
};

export default bundleAnalyzer(nextConfig);
