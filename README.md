# Field Hockey Fantasy League

A web-based fantasy league management system for field hockey teams. This application allows users to create teams, manage players, track statistics, and compete in a fantasy league format.

## Features

- **Team Management**: Create and manage fantasy teams with player selections
- **Player Statistics**: Track goals, assists, clean sheets, cards, and points
- **Transfer System**: Make transfers with point deductions for exceeding free transfer limits
- **Gameweek Management**: Admin controls for finalizing gameweeks and updating player stats
- **League Table**: View team standings and points
- **Injury Management**: Mark players as injured to prevent selection
- **Admin Controls**: Comprehensive admin panel for league management

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Deployment**: Vercel

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase project with Firestore enabled

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd field-hockey-fantasy-league
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Authentication with Email/Password provider
4. Get your Firebase configuration

### 4. Environment Configuration

Create a `.env.local` file in the root directory with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 5. Admin Configuration

Add admin email addresses to `src/config/adminEmails.ts`:

```typescript
export const ADMIN_EMAILS = [
  'admin1@example.com',
  'admin2@example.com'
]

export function isAdmin(email: string | undefined): boolean {
  return email ? ADMIN_EMAILS.includes(email) : false
}
```

### 6. Firebase Security Rules

Set up Firestore security rules to allow authenticated users to read/write their own team data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Teams - users can only access their own team
    match /teams/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Players - read-only for all authenticated users
    match /players/{playerId} {
      allow read: if request.auth != null;
      allow write: if false; // Only admins can modify players
    }
    
    // Config - read-only for all authenticated users
    match /config/{configId} {
      allow read: if request.auth != null;
      allow write: if false; // Only admins can modify config
    }
    
    // Injuries - read-only for all authenticated users
    match /injuries/{injuryId} {
      allow read: if request.auth != null;
      allow write: if false; // Only admins can modify injuries
    }
  }
}
```

## Running Locally

```bash
npm run dev
```

The application will be available at `http://localhost:3000`
