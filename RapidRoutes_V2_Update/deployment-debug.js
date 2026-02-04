#!/usr/bin/env node
/**
 * RapidRoutes Deployment Debug
 * This script provides a comprehensive analysis of the production environment
 * and suggests fixes for the API routing issue
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

async function checkProductionDeployment() {
  console.log('🔍 RapidRoutes Production Deployment Debug');
  console.log('===========================================\n');
  
  // Verify if the Next.js config file exists and has the correct format
  const nextConfigExists = fs.existsSync('./next.config.mjs');
  const nextConfigCjsExists = fs.existsSync('./next.config.cjs');
  
  console.log('📁 Configuration Files:');
  console.log(`- next.config.mjs: ${nextConfigExists ? '✅ Found' : '❌ Missing'}`);
  console.log(`- next.config.cjs: ${nextConfigCjsExists ? '✅ Found' : '❌ Missing'}`);
  
  if (nextConfigExists && nextConfigCjsExists) {
    console.log('⚠️ Warning: Both next.config.mjs and next.config.cjs exist, which may cause conflicts');
  }
  
  // Check if vercel.json exists and has any rewrite rules
  const vercelJsonExists = fs.existsSync('./vercel.json');
  console.log(`- vercel.json: ${vercelJsonExists ? '✅ Found' : '❌ Missing'}`);
  
  if (vercelJsonExists) {
    try {
      const vercelConfig = JSON.parse(fs.readFileSync('./vercel.json', 'utf8'));
      console.log(`  - Contains rewrites: ${vercelConfig.rewrites ? '⚠️ Yes (may affect routing)' : '✅ No'}`);
      console.log(`  - Contains redirects: ${vercelConfig.redirects ? '⚠️ Yes (may affect routing)' : '✅ No'}`);
    } catch (e) {
      console.log('  - ❌ Error parsing vercel.json');
    }
  }
  
  // Check package.json for correct build configuration
  try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    console.log('📦 Package.json Configuration:');
    console.log(`- Type: ${packageJson.type || 'Not specified'}`);
    console.log(`- Build script: ${packageJson.scripts?.build || 'Not found'}`);
    console.log(`- Vercel build: ${packageJson.scripts?.['vercel-build'] || 'Not found'}`);
    console.log(`- Node.js engine: ${packageJson.engines?.node || 'Not specified'}`);
    console.log(`- Next.js version: ${packageJson.dependencies?.next || 'Not found'}`);
  } catch (e) {
    console.log('❌ Error checking package.json:', e.message);
  }
  
  // Check for API routes
  const apiDir = './pages/api';
  if (fs.existsSync(apiDir)) {
    const apiFiles = fs.readdirSync(apiDir)
      .filter(file => file.endsWith('.js') || file.endsWith('.ts'));
    
    console.log('\n📡 API Routes:');
    console.log(`- Found ${apiFiles.length} API route files in ${apiDir}`);
    console.log(`- Sample API files: ${apiFiles.slice(0, 5).join(', ')}${apiFiles.length > 5 ? '...' : ''}`);
  } else {
    console.log('\n❌ API directory not found:', apiDir);
  }
  
  // Check production behavior
  console.log('\n🌐 Production Behavior:');
  try {
    const vercelUrl = 'https://rapidroutes.vercel.app';
    const apiCheck = await fetch(`${vercelUrl}/api/health`);
    console.log(`- API route returns: ${apiCheck.headers.get('content-type')}`);
    console.log(`- Status code: ${apiCheck.status}`);
    
    const isProbablyHtmlResponse = apiCheck.headers.get('content-type')?.includes('text/html');
    if (isProbablyHtmlResponse) {
      console.log('⚠️ API route is returning HTML instead of JSON - indicates incorrect routing');
    }
  } catch (e) {
    console.log(`- ❌ Error checking production API:`, e.message);
  }
  
  // Generate recommendations
  console.log('\n🔧 Recommended Fixes:');
  console.log('1. Ensure your Vercel project is configured as a Next.js project');
  console.log('2. Check that your API routes are included in the build');
  console.log('3. Review next.config.js/mjs/cjs for any incorrect rewrites or redirects');
  console.log('4. If using ESM modules (type: "module" in package.json), ensure Next.js is properly configured');
  console.log('5. Check for any middleware that might be intercepting API routes');
  
  console.log('\n📋 Vercel Deployment Checklist:');
  console.log('- Verify Framework Preset is set to "Next.js"');
  console.log('- Check Build Command is "next build"');
  console.log('- Ensure Output Directory is set to ".next"');
  console.log('- Confirm Node.js version is compatible (>=18)');
  console.log('- Review Environment Variables for missing API keys');
}

checkProductionDeployment();