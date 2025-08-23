#!/bin/bash

echo "🚀 Building WeVote for Production..."

# Install dependencies
echo "📦 Installing dependencies..."
cd backend && npm install
cd ../frontend && npm install

# Build Angular for production
echo "🏗️ Building Angular app..."
npm run build --prod

echo "✅ Build complete! Ready for deployment."

# Create dist folder structure if needed
mkdir -p ../dist
cp -r dist/frontend/* ../dist/

echo "📁 Production files are in the dist/ folder"
echo "🎉 WeVote is ready for Evennode deployment!"
