import React, { useEffect, useMemo, useState } from 'react'
import type { Player, TeamCode, Position } from '../types'
import { TEAM_LABEL } from '../types'
import { db } from '../lib/firebase'
import { doc, getDoc, onSnapshot, setDoc, collection, writeBatch } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { isAdmin } from '../config/adminEmails'
import { useInjuries } from '../contexts/InjuriesContext'
import { createTeamUpdateData } from '../lib/utils'

const TEAMS: TeamCode[] = ['Men1','Men2','Men3','Men4','Men5']
const POS: Position[] = ['GK','DEF','MID','FWD']

export default function Admin(){
	const { user } = useAuth()
	const { injuredIds, isInjured, markInjured, clearInjured } = useInjuries()
	
	if (!user || !isAdmin(user.email)) {
		return (
			<div className="card">
				<h2>Access Denied</h2>
				<p>You do not have permission to access the admin page.</p>
			</div>
		)
	}
	
	const [transfersEnabled, setTransfersEnabled] = useState<boolean>(false)
	const [players, setPlayers] = useState<Player[]>([])
	const [workingPlayers, setWorkingPlayers] = useState<Player[]>([])
	const [form, setForm] = useState<{name:string,team:TeamCode,position:Position,price:number}>({name:'',team:'Men1',position:'MID',price:4})
	const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
	const [gwChanges, setGwChanges] = useState<Record<string, {goals: number, assists: number, cleanSheets: number, greenCards: number, yellowCards: number, redCards: number}>>({})
	const [injurySelectId, setInjurySelectId] = useState<string>('')

	useEffect(()=>{
		const ref = doc(db,'config','league')
		getDoc(ref).then(s=>{ if(s.exists()) setTransfersEnabled(!!s.data().transfersEnabled) })
		const unsub = onSnapshot(ref,(s)=>{ if(s.exists()) setTransfersEnabled(!!s.data().transfersEnabled) })
		return unsub
	},[])

	async function toggleTransfers(v:boolean){
		try {
		setTransfersEnabled(v)
		await setDoc(doc(db,'config','league'), { transfersEnabled: v }, { merge: true })
		if (!v) {
			const batch = writeBatch(db)
			const snap = await (await import('firebase/firestore')).getDocs(collection(db,'teams'))
			snap.forEach(d=>{ 
				const data = d.data()
				const updateData = createTeamUpdateData(data)
				batch.update(doc(db,'teams',d.id), updateData)
			})
			await batch.commit()
			}
		} catch (error) {
			console.error('Error toggling transfers:', error)
			alert(`Failed to update transfers: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your Firebase permissions.`)
		}
	}

	useEffect(()=>{
		const unsub = onSnapshot(collection(db,'players'), (snap)=>{
			const list: Player[] = []
			snap.forEach(d=> list.push(d.data() as Player))
			setPlayers(list)
			setWorkingPlayers(list)
			setPendingIds(new Set())
		})
		return unsub
	},[])

	function applyDynamicPricing(player: Player, deltaPoints: number): Player {
		const k = 0.05
		let newPrice = player.price + k * deltaPoints
		newPrice = Math.max(3.5, Math.min(15, parseFloat(newPrice.toFixed(1))))
		return { ...player, price: newPrice }
	}

	async function addPlayerLocal(){
		try {
            const p: Player = {
                id: crypto.randomUUID(),
                name: form.name || 'New Player',
                team: form.team,
                position: form.position,
                price: form.price,
                pointsTotal: 0,
                pointsGw: 0,
                prevGwPoints: 0,
                goals: 0,
                assists: 0,
                cleanSheets: 0,
                greenCards: 0,
                yellowCards: 0,
                redCards: 0,
                createdAt: Date.now(),
                updatedAt: Date.now()
            }

            await setDoc(doc(db,'players',p.id), p)
            setForm({ name:'', team:'Men1', position:'MID', price:4 })

			alert('Player added successfully!')
		} catch (error) {
			console.error('Error adding player:', error)
			alert(`Failed to add player: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your Firebase permissions.`)
		}
	}

	function calculatePoints(player: Player, changes: {goals: number, assists: number, cleanSheets: number, greenCards: number, yellowCards: number, redCards: number}): number {
		let points = 0
		
		// Goals (position dependent)
		if (player.position === 'DEF') points += changes.goals * 6
		else if (player.position === 'MID' || player.position === 'FWD') points += changes.goals * 5
		
		// Assists
		points += changes.assists * 3
		
		// Clean sheets (position dependent)
		if (player.position === 'GK') points += changes.cleanSheets * 6
		else if (player.position === 'DEF') points += changes.cleanSheets * 4
		else if (player.position === 'MID') points += changes.cleanSheets * 2
		
		// Cards
		points += changes.greenCards * -1
		points += changes.yellowCards * -2
		points += changes.redCards * -3
		
		return points
	}

	function updateGwChange(playerId: string, field: string, value: number) {
		setGwChanges(prev => {
			const current = prev[playerId] || {goals: 0, assists: 0, cleanSheets: 0, greenCards: 0, yellowCards: 0, redCards: 0}
			const updated = { ...current, [field]: value }
			return { ...prev, [playerId]: updated }
		})
		
		// Update working players with new points after state update
		setTimeout(() => {
			setWorkingPlayers(prev => prev.map(p => {
				if (p.id !== playerId) return p
				const changes = { ...(gwChanges[playerId] || {goals: 0, assists: 0, cleanSheets: 0, greenCards: 0, yellowCards: 0, redCards: 0}), [field]: value }
				const gwPoints = calculatePoints(p, changes)
				const originalTotal = Number(p.pointsTotal) || 0
				const originalGw = Number(p.pointsGw) || 0
				const newTotal = originalTotal - originalGw + gwPoints
				
				return {
				...p,

					pointsGw: gwPoints,
					pointsTotal: newTotal,
					updatedAt: Date.now()
				}
			}))
		}, 0)
		
		setPendingIds(prev => new Set(prev).add(playerId))
	}

	const totals = useMemo(()=>({
		count: workingPlayers.length,
		avgPrice: workingPlayers.length? (workingPlayers.reduce((s,p)=>s+p.price,0)/workingPlayers.length).toFixed(2): '0.00'
	}),[workingPlayers])

	const sortedPlayers = useMemo(()=>{
		const teamIndex = (t:TeamCode)=> TEAMS.indexOf(t)
		const posIndex: Record<Position,number> = { GK:0, DEF:1, MID:2, FWD:3 }
		return [...workingPlayers].sort((a,b)=> teamIndex(a.team)-teamIndex(b.team) || posIndex[a.position]-posIndex[b.position] || a.name.localeCompare(b.name))
	},[workingPlayers])

	const groupedByTeam = useMemo(()=>{
		const map: Record<TeamCode, Record<Position, Player[]>> = {
			Men1:{GK:[],DEF:[],MID:[],FWD:[]}, Men2:{GK:[],DEF:[],MID:[],FWD:[]}, Men3:{GK:[],DEF:[],MID:[],FWD:[]}, Men4:{GK:[],DEF:[],MID:[],FWD:[]}, Men5:{GK:[],DEF:[],MID:[],FWD:[]}
		}
		for(const p of sortedPlayers){ map[p.team][p.position].push(p) }
		return map
	},[sortedPlayers])

	async function finalizeGameweek(){
		try {
			const batch = writeBatch(db)
			
			// Update player stats by adding gameweek changes to totals
			for (const playerId in gwChanges){
				const changes = gwChanges[playerId]
				const player = players.find(p => p.id === playerId)
				if (!player) continue
				
				const updatedPlayer = {
					...player,
					goals: (Number(player.goals) || 0) + changes.goals,
					assists: (Number(player.assists) || 0) + changes.assists,
					cleanSheets: (Number(player.cleanSheets) || 0) + changes.cleanSheets,
					greenCards: (Number(player.greenCards) || 0) + changes.greenCards,
					yellowCards: (Number(player.yellowCards) || 0) + changes.yellowCards,
					redCards: (Number(player.redCards) || 0) + changes.redCards,
					pointsTotal: (Number(player.pointsTotal) || 0) + changes.goals * (player.position === 'DEF' ? 6 : 5) + changes.assists * 3 + changes.cleanSheets * (player.position === 'GK' ? 6 : player.position === 'DEF' ? 4 : 2) + changes.greenCards * -1 + changes.yellowCards * -2 + changes.redCards * -3,
					updatedAt: Date.now()
				}
				
				batch.update(doc(db,'players',playerId), updatedPlayer as any)
			}
			
			// Update team points
			const playerGwMap: Record<string, number> = {}
			for (const playerId in gwChanges){
				const changes = gwChanges[playerId]
				const player = players.find(p => p.id === playerId)
				if (!player) continue
				
				const gwPoints = calculatePoints(player, changes)
				playerGwMap[playerId] = gwPoints
			}
			
			const teamsSnap = await (await import('firebase/firestore')).getDocs(collection(db,'teams'))
			teamsSnap.forEach(d=>{
				const t = d.data() as any
				const ids: string[] = Array.isArray(t.players)? t.players : []
				const captain: string|undefined = t.captainId
				const triplePending: boolean = !!t.tripleCaptainPending
				
				let gw = 0
				for (const id of ids){ gw += playerGwMap[id]||0 }
				if (captain) {
					const capPts = playerGwMap[captain]||0
					gw += capPts
					if (triplePending) gw += capPts
				}
				
				// Use transfer deduction from database
				const transferDeduction = Number(t.transferPointsDeduction) || 0
				
				const total = (Number(t.teamPointsTotal)||0) + gw - transferDeduction
				const updateData: any = { 
					teamPrevGwPoints: gw, 
					teamPointsTotal: total, 
					updatedAt: Date.now(),
					transferPointsDeduction: 0 // Reset to 0 after applying deductions
				}
				
				if (triplePending) {
					updateData.tripleCaptainPending = false
					updateData.tripleCaptainUsed = true
				}
				
				// Free transfers are now managed in saveTeam function, not here
				
				batch.set(doc(db,'teams',d.id), updateData, { merge: true })
			})
			
			// Reset gameweek changes and points
			for (const p of workingPlayers){
				batch.update(doc(db,'players',p.id), { prevGwPoints: p.pointsGw, pointsGw: 0, updatedAt: Date.now() } as any)
			}
			
			await batch.commit()
			setGwChanges({})
			alert('Gameweek finalized and data saved successfully!')
		} catch (error) {
			console.error('Error finalizing gameweek:', error)
			alert(`Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your Firebase permissions or try again.`)
		}
	}

	return (
		<div className="grid" style={{gap:24}}>
			<div className="card">
				<h2>Admin Controls</h2>
				<label style={{display:'flex',alignItems:'center',gap:8}}>
					<input type="checkbox" checked={transfersEnabled} onChange={e=>toggleTransfers(e.target.checked)} />
					Enable Transfers
				</label>
			</div>

			<div className="card">
				<h3>Add Player</h3>
				<div className="grid" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr'}}>
					<input className="input" placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
					<select className="input" value={form.team} onChange={e=>setForm({...form,team:e.target.value as TeamCode})}>
						{TEAMS.map(t=> <option key={t} value={t}>{TEAM_LABEL[t]}</option>)}
					</select>
					<select className="input" value={form.position} onChange={e=>setForm({...form,position:e.target.value as Position})}>
						{POS.map(p=> <option key={p} value={p}>{p}</option>)}
					</select>
					<input className="input" type="number" step="0.1" value={form.price} onChange={e=>setForm({...form,price:parseFloat(e.target.value)})} />
				</div>
				<div style={{height:8}}/>
				<button className="btn" onClick={addPlayerLocal}>Add Player</button>
			</div>

			<div className="card">
				<h3>Injuries</h3>
				<div className="grid" style={{gridTemplateColumns:'2fr 1fr'}}>
					<select className="input" value={injurySelectId} onChange={e=>setInjurySelectId(e.target.value)}>
						<option value="">Select player to mark injured</option>
						{players.filter(p=>!injuredIds.has(p.id)).sort((a,b)=>a.name.localeCompare(b.name)).map(p=> (
							<option key={p.id} value={p.id}>{p.name}</option>
						))}
					</select>
					<button className="btn" disabled={!injurySelectId} onClick={async()=>{ if(!injurySelectId) return; await markInjured(injurySelectId); setInjurySelectId('') }}>Mark Injured</button>
				</div>
				<div style={{height:8}}/>
				<div className="grid" style={{gridTemplateColumns:'1fr'}}>
					<div className="subtitle">Currently Injured</div>
					{players.filter(p=>injuredIds.has(p.id)).length===0 && (
						<div>No injured players.</div>
					)}
					{players.filter(p=>injuredIds.has(p.id)).sort((a,b)=>a.name.localeCompare(b.name)).map(p=> (
						<div key={p.id} className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
							<div className="text-sm">{p.name} 🚑</div>
							<button className="btn secondary" onClick={()=>clearInjured(p.id)}>Remove</button>
						</div>
					))}
				</div>
			</div>

			<div className="card">
				<h3>Players (by team)</h3>
				<div className="grid" style={{gridTemplateColumns:'1fr'}}>
					{TEAMS.map(team => (
						<div key={team} className="card">
							<h4 style={{marginBottom:8}}>{TEAM_LABEL[team]}</h4>

								<div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
								    {(['GK','DEF','MID','FWD'] as Position[]).map(pos => (

									<div key={pos} className="card primary section">
										<div className="subtitle" style={{marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--surface)'}}>
											{pos==='GK'?'Goalkeepers':pos==='DEF'?'Defenders':pos==='MID'?'Midfielders':'Forwards'}
										</div>
										<div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
											{groupedByTeam[team][pos].map(p=> (

												<div className="card inner" key={p.id}>
													<div className="card-header">
														<div>
															<div className="text-title-sm">
																{p.name}{isInjured(p.id) ? ' 🚑' : ''}
															</div>
															<div className="text-sm text-muted">
																£{p.price}M • {pos} • GW: {p.pointsGw} • Total: {p.pointsTotal}
															</div>
														</div>
													</div>
													<div className="fields-grid">
														{p.position !== 'GK' && (
															<div>
																<label className="field-label">Goals</label>
																<select className="input" value={gwChanges[p.id]?.goals || 0} onChange={(e) => updateGwChange(p.id, 'goals', parseInt(e.target.value))}>
																	{Array.from({length: 11}, (_, i) => <option key={i} value={i}>{i}</option>)}
																</select>
															</div>
														)}
														{p.position !== 'GK' && (
															<div>
																<label className="field-label">Assists</label>
																<select className="input" value={gwChanges[p.id]?.assists || 0} onChange={(e) => updateGwChange(p.id, 'assists', parseInt(e.target.value))}>
																	{Array.from({length: 11}, (_, i) => <option key={i} value={i}>{i}</option>)}
																</select>
															</div>
														)}
														{p.position !== 'FWD' && (
															<div>
																<label className="field-label">Clean Sheet</label>
																<label className="checkbox-tile">
																	<input 
																		type="checkbox" 
																		checked={(gwChanges[p.id]?.cleanSheets || 0) > 0} 
																		onChange={(e) => updateGwChange(p.id, 'cleanSheets', e.target.checked ? 1 : 0)}
																		style={{margin: 0}}
																	/>
																	<span className="text-sm">Yes</span>
																</label>
															</div>
														)}
														<div>
															<label className="field-label">Green Cards</label>
															<select className="input" value={gwChanges[p.id]?.greenCards || 0} onChange={(e) => updateGwChange(p.id, 'greenCards', parseInt(e.target.value))}>
																{Array.from({length: 3}, (_, i) => <option key={i} value={i}>{i}</option>)}
															</select>
														</div>
														<div>
															<label className="field-label">Yellow Cards</label>
															<select className="input" value={gwChanges[p.id]?.yellowCards || 0} onChange={(e) => updateGwChange(p.id, 'yellowCards', parseInt(e.target.value))}>
																{Array.from({length: 3}, (_, i) => <option key={i} value={i}>{i}</option>)}
															</select>
														</div>
														<div>
															<label className="field-label">Red Cards</label>
															<select className="input" value={gwChanges[p.id]?.redCards || 0} onChange={(e) => updateGwChange(p.id, 'redCards', parseInt(e.target.value))}>
																{Array.from({length: 2}, (_, i) => <option key={i} value={i}>{i}</option>)}
															</select>
														</div>
													</div>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
				<div style={{display:'flex',gap:8,marginTop:12}}>
					<button className="btn" onClick={finalizeGameweek}>Finalize Gameweek (save all)</button>
					<button className="btn secondary" onClick={()=>{ setWorkingPlayers(players); setPendingIds(new Set()); setGwChanges({}) }}>Discard Changes</button>
				</div>
			</div>
		</div>
	)
}