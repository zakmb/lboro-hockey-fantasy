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

function isMockAuth(): boolean {
	try {
		// If firebase config is not set, our apiKey is the placeholder
		const apiKey = (auth as any)?._config?.apiKey || (auth as any)?.app?.options?.apiKey
		return !apiKey || String(apiKey).includes('REPLACE_ME')
	} catch {
		return true
	}
}

const MOCK_KEY = 'fhfl_mock_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<UserProfile | null>(null)
	const [loading, setLoading] = useState(true)
	const useMock = isMockAuth()

	useEffect(() => {
		if (useMock) {
			const raw = localStorage.getItem(MOCK_KEY)
			setUser(raw ? JSON.parse(raw) as UserProfile : null)
			setLoading(false)
			return
		}
		const unsub = onAuthStateChanged(auth, (u) => {
			if (u) {
				setUser({ id: u.uid, email: u.email || '', displayName: u.displayName || 'Manager' })
			} else {
				setUser(null)
			}
			setLoading(false)
		})
		return () => unsub()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [useMock])

	async function login(email: string, password: string) {
		if (useMock) {
			const mock: UserProfile = { id: 'mock-' + btoa(email), email, displayName: email.split('@')[0] }
			localStorage.setItem(MOCK_KEY, JSON.stringify(mock))
			setUser(mock)
			return
		}
		await signInWithEmailAndPassword(auth, email, password)
	}

	async function register(email: string, password: string, displayName: string) {
		if (useMock) {
			const mock: UserProfile = { id: 'mock-' + btoa(email), email, displayName }
			localStorage.setItem(MOCK_KEY, JSON.stringify(mock))
			setUser(mock)
			return
		}
		const cred = await createUserWithEmailAndPassword(auth, email, password)
		if (auth.currentUser) await updateProfile(auth.currentUser, { displayName })
		setUser({ id: cred.user.uid, email, displayName })
	}

	async function logout() {
		if (useMock) {
			localStorage.removeItem(MOCK_KEY)
			setUser(null)
			return
		}
		await signOut(auth)
	}

	return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
}
