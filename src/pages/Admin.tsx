import React, { useEffect, useMemo, useState } from 'react'
import type { Player, TeamCode, Position } from '../types'
import { TEAM_LABEL } from '../types'
import { db } from '../lib/firebase'
import { doc, getDoc, onSnapshot, setDoc, collection, updateDoc, writeBatch } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { isAdmin } from '../config/adminEmails'

const TEAMS: TeamCode[] = ['Men1','Men2','Men3','Men4','Men5']
const POS: Position[] = ['GK','DEF','MID','FWD']

export default function Admin(){
	const { user } = useAuth()
	
	// Check if user has admin access
	if (!user || !isAdmin(user.email)) {
		return (
			<div className="card">
				<h2>Access Denied</h2>
				<p>You do not have permission to access the admin page.</p>
			</div>
		)
	}
	
	const [transfersEnabled,setTransfersEnabled]=useState<boolean>(false)
	const [players,setPlayers]=useState<Player[]>([])
	const [workingPlayers,setWorkingPlayers]=useState<Player[]>([])
	const [form,setForm]=useState<{name:string,team:TeamCode,position:Position,price:number}>({name:'',team:'Men1',position:'MID',price:4})
	const [pendingAdds,setPendingAdds]=useState<Player[]>([])
	const [pendingIds,setPendingIds]=useState<Set<string>>(new Set())

	useEffect(()=>{
		const ref = doc(db,'config','league')
		getDoc(ref).then(s=>{ if(s.exists()) setTransfersEnabled(!!s.data().transfersEnabled) })
		const unsub = onSnapshot(ref,(s)=>{ if(s.exists()) setTransfersEnabled(!!s.data().transfersEnabled) })
		return unsub
	},[])

	async function toggleTransfers(v:boolean){
		setTransfersEnabled(v)
		await setDoc(doc(db,'config','league'), { transfersEnabled: v }, { merge: true })
		if (!v) {
			// reset per-user transfer markers when window closes
			const batch = writeBatch(db)
			// lightweight: iterate teams snapshot and reset
			const snap = await (await import('firebase/firestore')).getDocs(collection(db,'teams'))
			snap.forEach(d=>{ 
				batch.update(doc(db,'teams',d.id), { transferUsed: false })
			})
			await batch.commit()
		}
	}

	useEffect(()=>{
		const unsub = onSnapshot(collection(db,'players'), (snap)=>{
			const list: Player[] = []
			snap.forEach(d=> list.push(d.data() as Player))
			setPlayers(list)
			setWorkingPlayers(list)
			setPendingAdds([])
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

	function addPlayerLocal(){
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
		// Write immediately. The players snapshot will refresh the list.
		setDoc(doc(db,'players',p.id), p)
		setForm({ name:'', team:'Men1', position:'MID', price:4 })
	}

	function applyEventLocal(id:string, deltaPoints:number, mutate:(p:Player)=>Player){
		setWorkingPlayers(prev=> prev.map(p=>{
			if(p.id!==id) return p
			// Coerce numeric fields to numbers to avoid NaN
			const normalized: Player = {
				...p,
				pointsGw: Number(p.pointsGw)||0,
				pointsTotal: Number(p.pointsTotal)||0,
				goals: Number(p.goals)||0,
				assists: Number(p.assists)||0,
				cleanSheets: Number(p.cleanSheets)||0,
				greenCards: Number(p.greenCards)||0,
				yellowCards: Number(p.yellowCards)||0,
				redCards: Number(p.redCards)||0,
				prevGwPoints: Number((p as any).prevGwPoints)||0
			}
			const withEvent = mutate(normalized)
			const updated = applyDynamicPricing({ ...withEvent, pointsGw: (withEvent.pointsGw||0)+deltaPoints, pointsTotal: (withEvent.pointsTotal||0)+deltaPoints, updatedAt: Date.now() }, deltaPoints)
			return updated
		}))
		setPendingIds(prev=> new Set(prev).add(id))
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
		const batch = writeBatch(db)
		// existing players updated
		for (const p of workingPlayers){
			const base = players.find(x=>x.id===p.id)
			if (base){
				if (!pendingIds.has(p.id)) continue
				batch.update(doc(db,'players',p.id), p as any)
			}
		}
		// Calculate team GW points (captain doubled) and persist to teams
		const playerGwMap: Record<string, number> = {}
		for (const p of workingPlayers){ playerGwMap[p.id] = Number(p.pointsGw)||0 }
		const teamsSnap = await (await import('firebase/firestore')).getDocs(collection(db,'teams'))
		teamsSnap.forEach(d=>{
			const t = d.data() as any
			const ids: string[] = Array.isArray(t.players)? t.players : []
			const captain: string|undefined = t.captainId
			let gw = 0
			for (const id of ids){ gw += playerGwMap[id]||0 }
			if (captain) gw += playerGwMap[captain]||0 // captain doubled
			const prevGw = Number(t.teamPointsGw)||0
			const total = (Number(t.teamPointsTotal)||0) + gw
			batch.set(doc(db,'teams',d.id), { teamPrevGwPoints: prevGw, teamPointsGw: gw, teamPointsTotal: total, updatedAt: Date.now() }, { merge: true })
		})
		// Also roll GW -> prevGW and reset GW for all players
		for (const p of workingPlayers){
			batch.update(doc(db,'players',p.id), { prevGwPoints: p.pointsGw, pointsGw: 0, updatedAt: Date.now() } as any)
		}
		// staged new players handled by snapshot as they are immediate now
		await batch.commit()
		alert('Gameweek finalized and data saved')
	}

	return (
		<div className="grid" style={{gap:24}}>
			<div className="card">
				<h2>Admin Controls</h2>
				<label style={{display:'flex',alignItems:'center',gap:8}}>
					<input type="checkbox" checked={transfersEnabled} onChange={e=>toggleTransfers(e.target.checked)} />
					Enable Transfers
				</label>
				<div className="subtitle" style={{marginTop:8}}>Players: {totals.count} • Avg Price: £{totals.avgPrice}M</div>
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
				<h3>Players (by team)</h3>
				<div className="grid" style={{gridTemplateColumns:'1fr'}}>
					{TEAMS.map(team => (
						<div key={team} className="card">
							<h4 style={{marginBottom:8}}>{TEAM_LABEL[team]}</h4>
							<div className="grid" style={{gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
								{(['GK','DEF','MID','FWD'] as Position[]).map(pos => (
									<div key={pos} className="card">
										<div className="subtitle" style={{marginBottom:6}}>{pos==='GK'?'Goalkeepers':pos==='DEF'?'Defenders':pos==='MID'?'Midfielders':'Forwards'}</div>
										<div className="grid" style={{gridTemplateColumns:'1fr'}}>
											{groupedByTeam[team][pos].map(p=> (
												<div className="card" key={p.id}>
													<b>{p.name}</b> — £{p.price}M
													<div>GW/Total: {p.pointsGw} / {p.pointsTotal}</div>
													<div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
														{p.position!=='GK' && (<>
															{p.position==='DEF' && <button className="btn" onClick={()=>applyEventLocal(p.id, +6, (x)=>({ ...x, goals: x.goals+1 }))}>Goal +6</button>}
															{p.position==='MID' && <button className="btn" onClick={()=>applyEventLocal(p.id, +5, (x)=>({ ...x, goals: x.goals+1 }))}>Goal +5</button>}
															{p.position==='FWD' && <button className="btn" onClick={()=>applyEventLocal(p.id, +5, (x)=>({ ...x, goals: x.goals+1 }))}>Goal +5</button>}
															<button className="btn secondary" onClick={()=>applyEventLocal(p.id, +3, (x)=>({ ...x, assists: x.assists+1 }))}>Assist +3</button>
														</>)}
														{p.position==='GK' && <button className="btn" onClick={()=>applyEventLocal(p.id, +6, (x)=>({ ...x, cleanSheets: x.cleanSheets+1 }))}>Clean Sheet +6</button>}
														{p.position==='DEF' && <button className="btn secondary" onClick={()=>applyEventLocal(p.id, +4, (x)=>({ ...x, cleanSheets: x.cleanSheets+1 }))}>Clean Sheet +4</button>}
														{p.position==='MID' && <button className="btn secondary" onClick={()=>applyEventLocal(p.id, +2, (x)=>({ ...x, cleanSheets: x.cleanSheets+1 }))}>Clean Sheet +2</button>}
														<button className="btn secondary" onClick={()=>applyEventLocal(p.id, -1, (x)=>({ ...x, greenCards: x.greenCards+1 }))} style={{background:'#e8fce8',borderColor:'#bbf7d0',color:'#166534'}}>Green -1</button>
														<button className="btn secondary" onClick={()=>applyEventLocal(p.id, -2, (x)=>({ ...x, yellowCards: x.yellowCards+1 }))} style={{background:'#fff7ed',borderColor:'#fed7aa',color:'#9a3412'}}>Yellow -2</button>
														<button className="btn secondary" onClick={()=>applyEventLocal(p.id, -3, (x)=>({ ...x, redCards: x.redCards+1 }))} style={{background:'#fef2f2',borderColor:'#fecaca',color:'#991b1b'}}>Red -3</button>
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
					<button className="btn secondary" onClick={()=>{ setWorkingPlayers(players); setPendingAdds([]); setPendingIds(new Set()) }}>Discard Changes</button>
				</div>
			</div>
		</div>
	)
}
