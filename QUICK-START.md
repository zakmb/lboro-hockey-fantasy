# 🚀 Quick Start Guide

Get your Loughborough Fantasy Hockey League deployed to Vercel in minutes!

## 📋 What You Need

- GitHub account
- Vercel account (free at [vercel.com](https://vercel.com))
- Firebase project (free at [firebase.google.com](https://firebase.google.com))

## ⚡ Quick Steps

### 1. Setup GitHub Repository
```bash
# Run the setup script (Windows users: use setup-github.bat)
./setup-github.sh

# Create new repo on GitHub (don't initialize with README)
# Then push your code:
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel auto-detects it's a Vite project ✅
5. Click "Deploy"

### 3. Configure Firebase
1. Add your Vercel domain to Firebase authorized domains
2. Set Firestore security rules (see README.md)
3. Add environment variables in Vercel dashboard

## 🔧 Environment Variables

Add these in Vercel → Settings → Environment Variables:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 📚 Detailed Guides

- **Full Setup**: [README.md](README.md)
- **Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Environment**: [env.example](env.example)

## 🎯 Your App Will Have

- ✅ User registration & login
- ✅ Team builder (11 players, formation rules)
- ✅ League table with team details
- ✅ Player statistics
- ✅ Admin panel (configurable access)
- ✅ Real-time updates
- ✅ Mobile responsive design

## 🆘 Need Help?

- Check the detailed guides above
- Look at Vercel build logs
- Verify Firebase configuration
- Test locally first with `npm run dev`

---

**Ready to deploy?** 🚀 Start with step 1 above!
