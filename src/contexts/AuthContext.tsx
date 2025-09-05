import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../lib/firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth'
import type { UserProfile } from '../types'

interface AuthCtx {
	user: UserProfile | null
	loading: boolean
	login: (email: string, password: string) => Promise<void>
	register: (email: string, password: string, displayName: string) => Promise<void>
	logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx | undefined>(undefined)

export const useAuth = () => {
	const v = useContext(Ctx)
	if (!v) throw new Error('useAuth must be used within AuthProvider')
	return v
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<UserProfile | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const unsub = onAuthStateChanged(auth, (u) => {
			if (u) {
				setUser({ id: u.uid, email: u.email || '', displayName: u.displayName || 'Manager' })
			} else {
				setUser(null)
			}
			setLoading(false)
		})
		return () => unsub()
	}, [])

	async function login(email: string, password: string) {
		await signInWithEmailAndPassword(auth, email, password)
	}

	async function register(email: string, password: string, displayName: string) {
		const cred = await createUserWithEmailAndPassword(auth, email, password)
		if (auth.currentUser) await updateProfile(auth.currentUser, { displayName })
		setUser({ id: cred.user.uid, email, displayName })
	}

	async function logout() {
		await signOut(auth)
	}

	return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
}