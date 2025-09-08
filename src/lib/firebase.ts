import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAIfen6C-OGnZ77iKeQIlvYzDvdqVvQ668',
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'hockey-fantasy-89cef.firebaseapp.com',
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'hockey-fantasy-89cef',
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'hockey-fantasy-89cef.firebasestorage.app',
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '256587838759',
	appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:256587838759:web:7ff9643dad24ad9ba7e502'
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

export default app