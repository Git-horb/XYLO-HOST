# XYLO-MD Deployment Platform - Production Deployment Guide

## Issue with Current Build Configuration

The current build setup has a mismatch between where files are built and where the server expects them:

- **Vite builds to**: `dist/public/`
- **Server expects files in**: `server/public/`

## Fix for Render Deployment

### Option 1: Manual Fix After Build

After running `npm run build`, you need to copy the built files to the correct location:

```bash
# Run the build
npm run build

# Copy the built frontend files to where the server expects them
cp -r dist/public server/

# Now the server can find the files
npm start
```

### Option 2: Create a Custom Build Script

Create a file called `build.sh` in the root directory:

```bash
#!/bin/bash
echo "Building frontend..."
vite build

echo "Building server..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Copying frontend files to server directory..."
cp -r dist/public server/

echo "Build complete! Files are ready for production."
```

Make it executable: `chmod +x build.sh`

Then run: `./build.sh`

### Option 3: For Render Deployment

In your Render service settings, use this build command instead of `npm run build`:

```bash
npm ci && vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist && cp -r dist/public server/
```

## Environment Variables for Production

Make sure these environment variables are set in your Render service:

```
NODE_ENV=production
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
PORT=5000
SESSION_SECRET=your_session_secret
```

## Start Command

Use this start command in Render:
```bash
node dist/index.js
```

## Troubleshooting

### White Screen Issue
If you see a white screen, it's likely because:
1. The static files aren't being served correctly (use the build fix above)
2. Environment variables are missing
3. The start command is incorrect

### Module Not Found: dist/index.js
This means the server build didn't complete. Make sure the build command includes the esbuild step for the server.

### Static Assets Not Loading
This is the main issue - the frontend files need to be in `server/public/` not `dist/public/`. Use the copy command above to fix this.

## Complete Deployment Steps for Render

1. Connect your GitHub repository to Render
2. Set the build command to:
   ```bash
   npm ci && vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist && cp -r dist/public server/
   ```
3. Set the start command to:
   ```bash
   node dist/index.js
   ```
4. Add all required environment variables
5. Deploy!

The app should now work correctly with all features functional.