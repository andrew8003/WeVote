@echo off
echo 🚀 Building WeVote for Production...

REM Install dependencies
echo 📦 Installing dependencies...
cd backend
call npm install
cd ..\frontend
call npm install

REM Build Angular for production
echo 🏗️ Building Angular app...
call npm run build

echo ✅ Build complete! Ready for deployment.
echo 🎉 WeVote is ready for Evennode deployment!

pause
