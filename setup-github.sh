#!/bin/bash

echo "🚀 Setting up GitHub repository for Loughborough Fantasy Hockey League"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in a git repository
if [ -d ".git" ]; then
    echo "⚠️  This directory is already a git repository."
    read -p "Do you want to continue? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Initialize git repository
echo "📁 Initializing git repository..."
git init

# Add all files
echo "📝 Adding files to git..."
git add .

# Make initial commit
echo "💾 Making initial commit..."
git commit -m "Initial commit: Loughborough Fantasy Hockey League"

echo ""
echo "✅ Git repository initialized successfully!"
echo ""
echo "Next steps:"
echo "1. Create a new repository on GitHub (don't initialize with README)"
echo "2. Run the following commands (replace YOUR_USERNAME and REPO_NAME):"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Follow the DEPLOYMENT.md guide to deploy to Vercel"
echo ""
echo "Happy coding! 🏑"
