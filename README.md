# Loughborough Fantasy Hockey League

A fantasy hockey league website built with React, TypeScript, and Firebase, specifically designed for the Loughborough Hockey League.

## Features

- **Team Builder**: Create and manage your 11-player team (1 GK, 4 DEF, 3 MID, 3 FWD)
- **League Table**: View standings and click on teams to see detailed formations
- **Player Stats**: Comprehensive player statistics with sorting capabilities
- **Admin Panel**: Manage players, points, and league settings (admin access only)
- **Real-time Updates**: Live data synchronization with Firebase
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore + Authentication)
- **Deployment**: Vercel-ready

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore and Authentication enabled

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd field-hockey-fantasy-league
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Configuration

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Authentication (Email/Password)
4. Create a web app and get your config
5. Copy your Firebase config to `src/lib/firebase.ts`

### 4. Firestore Security Rules

Set up the following security rules in your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Players collection - readable by all authenticated users
    match /players/{document} {
      allow read: if request.auth != null;
      allow write: if false; // Only admins can modify via Admin panel
    }
    
    // Teams collection - users can read all teams, write only their own
    match /teams/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // League config - readable by all, writable by admins (handled in app)
    match /config/{document} {
      allow read: if request.auth != null;
      allow write: if false; // Only admins can modify via Admin panel
    }
  }
}
```

### 5. Admin Access

Add admin email addresses in `src/config/adminEmails.ts`:

```typescript
export const ADMIN_EMAILS = [
  'your-admin-email@example.com'
]
```

### 6. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Build for Production

```bash
npm run build
```

## Deployment to Vercel

### Option 1: Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect it's a Vite project
6. Add your environment variables (Firebase config)
7. Deploy!

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel
```

### Environment Variables

Add these to your Vercel project:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── config/             # Configuration files (admin emails)
├── contexts/           # React contexts (Auth)
├── lib/                # Firebase configuration
├── pages/              # Main page components
│   ├── Admin.tsx      # Admin panel (admin only)
│   ├── LeagueTable.tsx # League standings
│   ├── Login.tsx      # User authentication
│   ├── PlayerStats.tsx # Player statistics
│   ├── Register.tsx   # User registration
│   └── TeamBuilder.tsx # Team management
├── types.ts            # TypeScript type definitions
└── main.tsx           # App entry point
```

## Game Rules

- **Team Formation**: 1 Goalkeeper, 4 Defenders, 3 Midfielders, 3 Forwards
- **Team Limits**: Maximum 3 players from any single team
- **Budget**: £100M starting budget
- **Transfers**: Limited transfers based on admin settings
- **Points System**: 
  - Forwards: 5 points for goals, 3 for assists
  - Midfielders: 5 points for goals, 3 for assists, 2 for clean sheets
  - Defenders: 6 points for goals, 3 for assists, 4 for clean sheets
  - Goalkeepers: 6 points for clean sheets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For support or questions, please contact the development team or create an issue in the GitHub repository.
