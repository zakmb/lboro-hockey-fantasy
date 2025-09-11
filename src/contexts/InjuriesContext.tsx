import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore'

interface InjuriesContextValue {
	injuredIds: Set<string>
	isInjured: (playerId: string) => boolean
	markInjured: (playerId: string) => Promise<void>
	clearInjured: (playerId: string) => Promise<void>
}

const InjuriesContext = createContext<InjuriesContextValue | undefined>(undefined)

export function InjuriesProvider({ children }: { children: React.ReactNode }){
	const [injuredIdsState, setInjuredIdsState] = useState<Set<string>>(new Set())

	useEffect(()=>{
		const ref = collection(db,'injuries')
		const unsub = onSnapshot(ref, snap => {
			const next = new Set<string>()
			snap.forEach(d => next.add(d.id))
			setInjuredIdsState(next)
		})
		return unsub
	},[])

	const value = useMemo<InjuriesContextValue>(()=>({
		injuredIds: injuredIdsState,
		isInjured: (playerId: string) => injuredIdsState.has(playerId),
		async markInjured(playerId: string){
			await setDoc(doc(db,'injuries', playerId), { playerId, createdAt: Date.now() })
		},
		async clearInjured(playerId: string){
			await deleteDoc(doc(db,'injuries', playerId))
		}
	}),[injuredIdsState])

	return (
		<InjuriesContext.Provider value={value}>{children}</InjuriesContext.Provider>
	)
}

export function useInjuries(){
	const ctx = useContext(InjuriesContext)
	if (!ctx) throw new Error('useInjuries must be used within InjuriesProvider')
	return ctx
}
