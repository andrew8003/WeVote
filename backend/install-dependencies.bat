@echo off
echo Installing backend dependencies...
cd /d "%~dp0"
npm install
echo.
echo Backend dependencies installed successfully!
echo.
echo Next steps:
echo 1. Update the .env file with your actual MongoDB credentials
echo 2. Configure email settings in .env (optional for development)
echo 3. Run 'npm start' to start the backend server
pause
