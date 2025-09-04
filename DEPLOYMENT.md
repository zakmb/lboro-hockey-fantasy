# Deployment Guide - Vercel

This guide will walk you through deploying the Loughborough Fantasy Hockey League to Vercel.

## Prerequisites

1. **GitHub Account**: You'll need a GitHub account to host your code
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Firebase Project**: Set up Firebase with Firestore and Authentication

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and click "New repository"
2. Name it `loughborough-fantasy-hockey` (or your preferred name)
3. Make it public or private (your choice)
4. Don't initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

## Step 2: Push Code to GitHub

```bash
# Initialize git in your project folder
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit: Loughborough Fantasy Hockey League"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/loughborough-fantasy-hockey.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will automatically detect it's a Vite project
5. Configure your project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts to link to your GitHub repo
```

## Step 4: Configure Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. Make sure to select **Production**, **Preview**, and **Development** environments
4. Click **Save**

## Step 5: Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Sign-in method**
4. Enable **Email/Password** authentication
5. Go to **Firestore Database** → **Rules**
6. Set the security rules (see README.md for details)
7. Go to **Project Settings** → **General**
8. Add your Vercel domain to **Authorized domains**

## Step 6: Redeploy

After setting environment variables:

1. Go to **Deployments** in Vercel
2. Click **Redeploy** on your latest deployment
3. Or push a new commit to trigger automatic deployment

## Step 7: Test Your Deployment

1. Visit your Vercel URL
2. Test user registration and login
3. Test team building functionality
4. Test admin panel (if you have admin access)

## Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update Firebase authorized domains

## Troubleshooting

### Build Errors
- Check that all dependencies are in `package.json`
- Verify Node.js version (18+ recommended)
- Check build logs in Vercel dashboard

### Firebase Connection Issues
- Verify environment variables are set correctly
- Check Firebase security rules
- Ensure your domain is authorized in Firebase

### Authentication Issues
- Verify Firebase Authentication is enabled
- Check that Email/Password sign-in is enabled
- Verify your domain is in authorized domains

## Monitoring

- **Vercel Analytics**: Enable in project settings
- **Error Tracking**: Consider adding Sentry or similar
- **Performance**: Monitor Core Web Vitals in Vercel dashboard

## Updates

To update your deployed app:

1. Make changes locally
2. Test with `npm run dev`
3. Commit and push to GitHub
4. Vercel will automatically deploy the changes

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vite Docs**: [vitejs.dev](https://vitejs.dev)
- **Firebase Docs**: [firebase.google.com/docs](https://firebase.google.com/docs)
