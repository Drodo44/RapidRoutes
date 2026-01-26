#!/usr/bin/env node
/**
 * RapidRoutes Deployment Fix
 * This script creates a new vercel.json file with proper Next.js configuration
 * and consolidates the next.config.js files
 */

import fs from 'fs';
import path from 'path';

function fixDeploymentConfiguration() {
  console.log('🛠️ RapidRoutes Deployment Configuration Fix');
  console.log('==========================================\n');
  
  // 1. Create a comprehensive vercel.json file
  const vercelConfig = {
    "version": 2,
    "framework": "nextjs",
    "buildCommand": "next build",
    "outputDirectory": ".next",
    "crons": [
      {
        "path": "/api/fetchDatBlog",
        "schedule": "0 10 * * 1"
      }
    ]
  };
  
  fs.writeFileSync('./vercel.json', JSON.stringify(vercelConfig, null, 2));
  console.log('✅ Created updated vercel.json with explicit Next.js framework setting');
  
  // 2. Consolidate next.config files to next.config.js
  let nextConfig = {};
  
  if (fs.existsSync('./next.config.cjs')) {
    console.log('📄 Backing up next.config.cjs to next.config.cjs.bak');
    fs.copyFileSync('./next.config.cjs', './next.config.cjs.bak');
  }
  
  if (fs.existsSync('./next.config.mjs')) {
    console.log('📄 Backing up next.config.mjs to next.config.mjs.bak');
    fs.copyFileSync('./next.config.mjs', './next.config.mjs.bak');
  }
  
  // Create a new unified next.config.js
  const nextConfigContent = `/** @type {import('next').NextConfig} */
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
`;

  fs.writeFileSync('./next.config.js', nextConfigContent);
  console.log('✅ Created unified next.config.js file compatible with Next.js API routes');
  
  // Create a deployment verification script
  console.log('📝 Creating deployment verification script...');
  
  const deploymentVerificationScript = `// deployment-verification.js
// Add this to your project's /pages/api directory

export default function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Next.js API routes are working correctly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown'
  });
}
`;

  if (!fs.existsSync('./pages/api/deployment-verification.js')) {
    fs.writeFileSync('./pages/api/deployment-verification.js', deploymentVerificationScript);
    console.log('✅ Created API verification endpoint at /pages/api/deployment-verification.js');
  }
  
  console.log('\n🚀 Deployment Configuration Fixed!');
  console.log('Next Steps:');
  console.log('1. Commit these changes to your repository');
  console.log('2. Deploy to Vercel');
  console.log('3. Check the API endpoints are working by visiting:');
  console.log('   - https://rapidroutes.vercel.app/api/deployment-verification');
  console.log('   - https://rapidroutes.vercel.app/api/health');
  console.log('   - https://rapidroutes.vercel.app/api/simple-test');
  console.log('\nIf you still experience issues:');
  console.log('1. Check the Vercel deployment logs');
  console.log('2. Ensure all environment variables are correctly set');
  console.log('3. Verify the Vercel project settings specify Next.js as the framework');
}

fixDeploymentConfiguration();