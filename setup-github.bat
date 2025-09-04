@echo off
echo 🚀 Setting up GitHub repository for Loughborough Fantasy Hockey League
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed. Please install Git first.
    pause
    exit /b 1
)

REM Check if we're in a git repository
if exist ".git" (
    echo ⚠️  This directory is already a git repository.
    set /p continue="Do you want to continue? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

REM Initialize git repository
echo 📁 Initializing git repository...
git init

REM Add all files
echo 📝 Adding files to git...
git add .

REM Make initial commit
echo 💾 Making initial commit...
git commit -m "Initial commit: Loughborough Fantasy Hockey League"

echo.
echo ✅ Git repository initialized successfully!
echo.
echo Next steps:
echo 1. Create a new repository on GitHub (don't initialize with README)
echo 2. Run the following commands (replace YOUR_USERNAME and REPO_NAME):
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. Follow the DEPLOYMENT.md guide to deploy to Vercel
echo.
echo Happy coding! 🏑
pause
