#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building XYLO-MD Deployment Platform for production...\n');

try {
  // Step 1: Build frontend
  console.log('📦 Building frontend with Vite...');
  execSync('vite build', { stdio: 'inherit' });
  console.log('✅ Frontend build complete!\n');

  // Step 2: Build server
  console.log('⚙️  Building server with esbuild...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  console.log('✅ Server build complete!\n');

  // Step 3: Copy frontend files to correct location
  console.log('📁 Copying frontend files to server directory...');
  
  // Create server/public directory if it doesn't exist
  const serverPublicDir = path.join(process.cwd(), 'server', 'public');
  if (fs.existsSync(serverPublicDir)) {
    fs.rmSync(serverPublicDir, { recursive: true, force: true });
  }
  
  // Copy dist/public to server/public
  const distPublicDir = path.join(process.cwd(), 'dist', 'public');
  if (fs.existsSync(distPublicDir)) {
    fs.cpSync(distPublicDir, serverPublicDir, { recursive: true });
    console.log('✅ Frontend files copied successfully!\n');
  } else {
    throw new Error('Frontend build files not found in dist/public');
  }

  console.log('🎉 Production build complete!');
  console.log('');
  console.log('To start the production server, run:');
  console.log('NODE_ENV=production node dist/index.js');
  console.log('');
  console.log('Or for Render deployment, use this start command:');
  console.log('node dist/index.js');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}