import React, { useEffect, useMemo, useState } from 'react'
import type { Player, TeamCode, Position } from '../types'
import { TEAM_LABEL } from '../types'
import { db } from '../lib/firebase'
import { doc, getDoc, onSnapshot, setDoc, collection, writeBatch } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { isAdmin } from '../config/adminEmails'
import { useInjuries } from '../contexts/InjuriesContext'
import { createTeamUpdateData } from '../lib/utils'
import { updatePlayerPrice as dynUpdate } from './Pricing'

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
	const [gwChanges, setGwChanges] = useState<Record<string, {goals: number, cleanSheets: number, greenCards: number, yellow5Cards: number, yellow10Cards: number, redCards: number, result: 'win'|'draw'|'loss'|'', manOfTheMatch: boolean}>>({})
	const [injurySelectId, setInjurySelectId] = useState<string>('')
	const [importText, setImportText] = useState<string>('')
	const [isFinalizing, setIsFinalizing] = useState(false);

	// Add new state for bulk updates
	const [bulkUpdate, setBulkUpdate] = useState<{
		playersList: string,
		result: 'win'|'draw'|'loss'|'',
		goalScorers: string,
		greenCards: string,
		yellow5Cards: string,
		yellow10Cards: string,
		redCards: string,
		motm: string,
		cleanSheet: boolean  // Add this line
	}>({
		playersList: '',
		result: '',
		goalScorers: '',
		greenCards: '',
		yellow5Cards: '',
		yellow10Cards: '',
		redCards: '',
		motm: '',
		cleanSheet: false  // Add this line
	})

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
                cleanSheets: 0,
                greenCards: 0,
                yellow5Cards: 0,
                yellow10Cards: 0,
                redCards: 0,
                manOfTheMatchCount: 0,
				transfersIn: 0,
				transfersOut: 0,
				prevPerfDelta: 0,
				pointsHistory: [],
				matchesPlayed: 0,
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

	function calculatePoints(player: Player, changes: {goals: number, cleanSheets: number, greenCards: number, yellow5Cards: number, yellow10Cards: number, redCards: number, result: 'win'|'draw'|'loss'|'', manOfTheMatch: boolean}): number {
		let points = 0
		// Goals
		if (player.position === 'FWD') points += changes.goals * 4
		else if (player.position === 'MID') points += changes.goals * 5
		else if (player.position === 'DEF') points += changes.goals * 6
		// Clean sheets
		if (player.position === 'GK') points += changes.cleanSheets * 10
		else if (player.position === 'DEF') points += changes.cleanSheets * 8
		else if (player.position === 'MID') points += changes.cleanSheets * 2
    	// Cards
		points += changes.greenCards * -2
		points += changes.yellow5Cards * -4
		points += changes.yellow10Cards * -8
		points += changes.redCards * -15
		// Result
		if (changes.result === 'win') points += 3
		else if (changes.result === 'draw') points += 1
		// Man of the match
		if (changes.manOfTheMatch) points += 5
		return points
	}

	function updateGwChange(playerId: string, field: string, value: any) {
		setGwChanges(prev => {
        const current = prev[playerId] || {goals: 0, cleanSheets: 0, greenCards: 0, yellow5Cards: 0, yellow10Cards: 0, redCards: 0, result: '', manOfTheMatch: false}
			const updated = { ...current, [field]: value }
			return { ...prev, [playerId]: updated }
		})
		
		// Update working players with new points after state update
        setTimeout(() => {
            setWorkingPlayers(prev => prev.map(p => {
				if (p.id !== playerId) return p
                const changes = { ...(gwChanges[playerId] || {goals:0, cleanSheets:0, greenCards:0, yellow5Cards:0, yellow10Cards:0, redCards:0, result: '', manOfTheMatch: false}), [field]: value }
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
		setIsFinalizing(true);
		try {
			const batch = writeBatch(db)
			
			// Update player stats by adding gameweek changes to totals
			for (const playerId in gwChanges){
				const changes = gwChanges[playerId]
				const player = players.find(p => p.id === playerId)
				if (!player) continue
				const gwPts = calculatePoints(player, changes)
				let updatedPlayer = {
					...player,
					goals: (Number(player.goals) || 0) + changes.goals,
					cleanSheets: (Number(player.cleanSheets) || 0) + changes.cleanSheets,
					greenCards: (Number(player.greenCards) || 0) + changes.greenCards,
                	yellow5Cards: (Number((player as any).yellow5Cards) || 0) + changes.yellow5Cards,
                	yellow10Cards: (Number((player as any).yellow10Cards) || 0) + changes.yellow10Cards,
					redCards: (Number(player.redCards) || 0) + changes.redCards,
                	manOfTheMatchCount: (Number((player as any).manOfTheMatchCount) || 0) + (changes.manOfTheMatch ? 1 : 0),
					pointsTotal: (Number(player.pointsTotal) || 0) + gwPts,
					pointsHistory: [gwPts, ...(player.pointsHistory || [])],
					matchesPlayed: (Number(player.matchesPlayed) || 0) + 1,
					updatedAt: Date.now()
				}
				// Apply dynamic pricing using Pricing.ts (uses transfersIn/Out & performance history)
				updatedPlayer = dynUpdate(updatedPlayer as any) as any
				
				batch.update(doc(db,'players',playerId), updatedPlayer as any)
			}

			// Handle players who didn't play this gameweek
			const playedPlayerIds = new Set(Object.keys(gwChanges));
			for (const player of players) {
				if (!playedPlayerIds.has(player.id)) {
					let updatedPlayer = {
						...player,
						pointsHistory: [0, ...(player.pointsHistory || [])],
						updatedAt: Date.now()
					}
				
				batch.update(doc(db,'players',player.id), updatedPlayer as any)
				}
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
				gw = gw - transferDeduction
				
				const total = (Number(t.teamPointsTotal)||0) + gw
				const now = new Date()
				const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
				const prevMonthly = (t.monthlyPoints && typeof t.monthlyPoints === 'object') ? t.monthlyPoints : {}
				const currentMonthPoints = Number(prevMonthly?.[ym]) || 0
				const nextMonthly = { ...prevMonthly, [ym]: currentMonthPoints + gw }
				const updateData: any = { 
					teamPrevGwPoints: gw, 
					teamPointsTotal: total, 
					updatedAt: Date.now(),
					transferPointsDeduction: 0, // Reset to 0 after applying deductions
					monthlyPoints: nextMonthly
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
		} finally {
      		setIsFinalizing(false);
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

			{/* Bulk Import */}
			<div className="card">
				<h3>Bulk Import Players</h3>
				<p className="text-sm" style={{marginTop:4}}>Paste or upload text in sections per team, e.g.:</p>
				<textarea className="input" style={{height:180, marginTop:8}} placeholder={"Paste squads..."} value={importText} onChange={e=>setImportText(e.target.value)} />
				<div style={{height:8}}/>
				<button className="btn" onClick={async()=>{
					try{
						const lines = importText.split(/\r?\n/)
						if(lines.length===0){ alert('No input provided'); return }
						const teamHeaderRegex = /^(?:men'?s\s*)?(1|2|3|4|5)\s*$/i
						let currentTeam: TeamCode | null = null
						const toCreate: Player[] = []
						const now = Date.now()
						const dragflickers = new Set(['spreckers','tarzan','shoey','finney','shareef','lee','schooner','haslam','skid','rdot','smithy','bb'])
						function isDragflicker(name:string){
							const n=name.toLowerCase()
							for(const nick of dragflickers){ if(n.localeCompare(nick)===0) return true }
							return false
						}
						function normPos(raw:string): Position | null {
							const s = raw.trim().toUpperCase()
							if(s==='GK' || s==='DEF' || s==='MID' || s==='FWD') return s as Position
							return null
						}
						function basePrice(team:TeamCode, pos:Position): number {
							switch(team){
								case 'Men1': return (pos==='MID'?8: pos==='FWD'?10: 6)
								case 'Men2': return (pos==='MID'?10: pos==='FWD'?12: 8)
								case 'Men3': return (pos==='MID'?7: pos==='FWD'?9: 5)
								case 'Men4': return (pos==='MID'?11: pos==='FWD'?13: 9)
								case 'Men5': return (pos==='GK'?6: pos==='DEF'?10: pos==='MID'?12: 14)
							}
						}
						function randomAdjust(): number {
							const n = Math.floor(Math.random()*3) - 1 // -1, 0, or 1
							return n * 0.5
						}
						for(const raw of lines){
							const line = raw.trim()
							if(!line) continue
							const th = teamHeaderRegex.exec(line)
							if(th){
								const idx = th[1]
								currentTeam = (`Men${idx}`) as TeamCode
								continue
							}
							if(!currentTeam) continue
							const parts = line.split(/\s+-\s+|,|\t|\s{2,}/).map(s=>s.trim()).filter(Boolean)
							if(parts.length<2) continue
							const name = parts[0]
							const posRaw = parts.slice(1).join(' ')
							const pos = normPos(posRaw)
							if(!pos) continue
							let price = basePrice(currentTeam, pos)
							if(isDragflicker(name)) price += 2
							price += randomAdjust()
							const p: Player = {
								id: crypto.randomUUID(),
								name,
								team: currentTeam,
								position: pos,
								price,
								pointsTotal: 0,
								pointsGw: 0,
								prevGwPoints: 0,
								goals: 0,
								cleanSheets: 0,
								greenCards: 0,
								yellow5Cards: 0,
								yellow10Cards: 0,
								redCards: 0,
								manOfTheMatchCount: 0,
								transfersIn: 0,
								transfersOut: 0,
								prevPerfDelta: 0,
								pointsHistory: [],
								matchesPlayed: 0,
								createdAt: now,
								updatedAt: now
							}
							toCreate.push(p)
						}
						if(toCreate.length===0){ alert('No valid players found to import.'); return }
						const batch = writeBatch(db)
						for(const p of toCreate){ batch.set(doc(db,'players',p.id), p as any) }
						await batch.commit()
						setPlayers(prev=>[...prev, ...toCreate])
						setWorkingPlayers(prev=>[...prev, ...toCreate])
						alert(`Imported ${toCreate.length} players successfully.`)
					}catch(err){
						console.error(err)
						alert(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
					}
				}}>Import Players</button>
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

			<div className="bulkAddPoints">
				<h3>Bulk Add Points</h3>
				<div className="grid" style={{gap: 12}}>
					<div>
						<label className="field-label">Players List (one per line)</label>
						<textarea 
							className="input" 
							style={{height: 100}} 
							value={bulkUpdate.playersList} 
							onChange={e => setBulkUpdate(prev => ({...prev, playersList: e.target.value}))}
							placeholder="Enter player names, one per line..."
						/>
					</div>
					<div className="grid" style={{gridTemplateColumns: '1fr 1fr 1fr'}}>
						<div>
							<label className="field-label">Result</label>
							<select 
								className="input"
								value={bulkUpdate.result}
								onChange={e => setBulkUpdate(prev => ({...prev, result: e.target.value as any}))}
							>
								<option value="">Select result</option>
								<option value="win">Win</option>
								<option value="draw">Draw</option>
								<option value="loss">Loss</option>
							</select>
						</div>
						<div>
							<label className="field-label">Clean Sheet</label>
							<label className="checkbox-tile">
								<input 
									type="checkbox"
									checked={bulkUpdate.cleanSheet}
									onChange={e => setBulkUpdate(prev => ({...prev, cleanSheet: e.target.checked}))}
									style={{margin: 0}}
								/>
								<span className="text-sm">Yes (applies to GK/DEF/MID)</span>
							</label>
						</div>
						<div>
							<label className="field-label">Man of the Match</label>
							<input 
								className="input"
								value={bulkUpdate.motm}
								onChange={e => setBulkUpdate(prev => ({...prev, motm: e.target.value}))}
								placeholder="MOTM name..."
							/>
						</div>
					</div>
					<div className="grid" style={{gridTemplateColumns: '1fr 1fr 1fr 1fr'}}>
						<div>
							<label className="field-label">Goals (name xNumber of Goals for multiple)</label>
							<textarea 
								className="input"
								style={{height: 60}}
								value={bulkUpdate.goalScorers}
								onChange={e => setBulkUpdate(prev => ({...prev, goalScorers: e.target.value}))}
								placeholder="Scorer x2..."
							/>
						</div>
						<div>
							<label className="field-label">Green Cards</label>
							<textarea 
								className="input"
								style={{height: 60}}
								value={bulkUpdate.greenCards}
								onChange={e => setBulkUpdate(prev => ({...prev, greenCards: e.target.value}))}
								placeholder="Name x2..."
							/>
						</div>
						<div>
							<label className="field-label">Yellow 5min</label>
							<textarea 
								className="input"
								style={{height: 60}}
								value={bulkUpdate.yellow5Cards}
								onChange={e => setBulkUpdate(prev => ({...prev, yellow5Cards: e.target.value}))}
								placeholder="Name x2..."
							/>
						</div>
						<div>
							<label className="field-label">Yellow 10min</label>
							<textarea 
								className="input"
								style={{height: 60}}
								value={bulkUpdate.yellow10Cards}
								onChange={e => setBulkUpdate(prev => ({...prev, yellow10Cards: e.target.value}))}
								placeholder="Name x2..."
							/>
						</div>
						<div>
							<label className="field-label">Red Cards</label>
							<textarea 
								className="input"
								style={{height: 60}}
								value={bulkUpdate.redCards}
								onChange={e => setBulkUpdate(prev => ({...prev, redCards: e.target.value}))}
								placeholder="Name..."
							/>
						</div>
					</div>
					<button 
						className="btn"
						onClick={() => {
							// Validate player names first
                            const playerNames = bulkUpdate.playersList.split('\n')
                                .map(n => n.trim())
                                .filter(Boolean);

							if (playerNames.length === 0) {
								alert('Please enter at least one player in the Players List.');
								return;
							}

							if (bulkUpdate.result === '') {
								alert('Please select a match result (win, draw, loss).');
								return;
							}
                            
                            const invalidPlayers = playerNames.filter(name => 
                                !workingPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())
                            );

                            if (invalidPlayers.length > 0) {
                                alert(`The following players were not found in the database:\n${invalidPlayers.join('\n')}`);
                                return;
                            }

                            // Parse names and validate they exist in playersList
                            function parseAndValidateNames(input: string, field: string): [Record<string, number>, string[]] {
                                const result: Record<string, number> = {};
                                const invalidNames: string[] = [];
                                const lines = input.split('\n')
                                    .map(line => line.trim())
                                    .filter(Boolean);
                                
                                for (const line of lines) {
									//Check it matches "name xNumber" or just "name" format and extract
                                    const match = line.toLowerCase().match(/^(.*?)(?:\s*x\s*(\d+))?$/);
                                    if (match) {
                                        const [_, name, quantity] = match;
                                        const cleanName = name.trim();
                                        if (cleanName) {
                                            // Check if player exists in playersList
                                            if (!playerNames.some(n => n.toLowerCase() === cleanName)) {
                                                invalidNames.push(cleanName);
                                            } else {
                                                result[cleanName] = (result[cleanName] || 0) + (quantity ? parseInt(quantity) : 1);
                                            }
                                        }
                                    }
                                }
                                return [result, invalidNames];
                            }

                            // Validate all inputs
                            const [goalScorers, invalidGoalScorers] = parseAndValidateNames(bulkUpdate.goalScorers, 'goals');
                            const [greenCards, invalidGreenCards] = parseAndValidateNames(bulkUpdate.greenCards, 'green cards');
                            const [yellow5Cards, invalidYellow5] = parseAndValidateNames(bulkUpdate.yellow5Cards, 'yellow 5min');
                            const [yellow10Cards, invalidYellow10] = parseAndValidateNames(bulkUpdate.yellow10Cards, 'yellow 10min');
                            const [redCards, invalidRedCards] = parseAndValidateNames(bulkUpdate.redCards, 'red cards');
                            
                            const motm = bulkUpdate.motm.trim();
                            const invalidMotm = motm && !playerNames.some(n => n.toLowerCase() === motm.toLowerCase());

                            // Collect all validation errors
                            const errors: string[] = [];
                            if (invalidGoalScorers.length) errors.push(`Goals: ${invalidGoalScorers.join(', ')}`);
                            if (invalidGreenCards.length) errors.push(`Green cards: ${invalidGreenCards.join(', ')}`);
                            if (invalidYellow5.length) errors.push(`Yellow 5min: ${invalidYellow5.join(', ')}`);
                            if (invalidYellow10.length) errors.push(`Yellow 10min: ${invalidYellow10.join(', ')}`);
                            if (invalidRedCards.length) errors.push(`Red cards: ${invalidRedCards.join(', ')}`);
                            if (invalidMotm) errors.push(`Man of the Match: ${motm}`);

                            if (errors.length > 0) {
                                alert(`The following players were not in the player list:\n\n${errors.join('\n')}`);
                                return;
                            }

                            const newChanges = {...gwChanges};
                            for (const name of playerNames) {
                                const player = workingPlayers.find(p => p.name.toLowerCase() === name.toLowerCase());
                                if (!player) continue;

                                const changes = {
                                    goals: goalScorers[name.toLowerCase()] || 0,
                                    cleanSheets: (player.position !== 'FWD' && bulkUpdate.cleanSheet) ? 1 : 0,
                                    greenCards: greenCards[name.toLowerCase()] || 0,
                                    yellow5Cards: yellow5Cards[name.toLowerCase()] || 0,
                                    yellow10Cards: yellow10Cards[name.toLowerCase()] || 0,
                                    redCards: redCards[name.toLowerCase()] || 0,
                                    result: bulkUpdate.result,
                                    manOfTheMatch: motm.toLowerCase() === name.toLowerCase()
                                };

                                newChanges[player.id] = changes;

                                // Calculate and update points immediately
                                const gwPoints = calculatePoints(player, changes);
                                const originalTotal = Number(player.pointsTotal) || 0;
                                const originalGw = Number(player.pointsGw) || 0;
                                const newTotal = originalTotal - originalGw + gwPoints;

                                setWorkingPlayers(prev => prev.map(p => {
                                    if (p.id !== player.id) return p;
                                    return {
                                        ...p,
                                        pointsGw: gwPoints,
                                        pointsTotal: newTotal,
                                        updatedAt: Date.now()
                                    };
                                }));
                            }

                            // Update the GW changes
                            setGwChanges(newChanges);
							
							// Clear the form
							setBulkUpdate({
								playersList: '',
								result: '',
								goalScorers: '',
								greenCards: '',
								yellow5Cards: '',
								yellow10Cards: '',
								redCards: '',
								motm: '',
								cleanSheet: false,  // Add to form reset
							});

							alert('Bulk update applied! Review the changes below before finalizing.');
						}}
					>
						Apply Bulk Update
					</button>
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
                                                        <label className="field-label">Yellow 5 min</label>
                                                        <select className="input" value={gwChanges[p.id]?.yellow5Cards || 0} onChange={(e) => updateGwChange(p.id, 'yellow5Cards', parseInt(e.target.value))}>
                                                            {Array.from({length: 3}, (_, i) => <option key={i} value={i}>{i}</option>)}
                                                        </select>
														</div>
														<div>
                                                        <label className="field-label">Yellow 10 min</label>
                                                        <select className="input" value={gwChanges[p.id]?.yellow10Cards || 0} onChange={(e) => updateGwChange(p.id, 'yellow10Cards', parseInt(e.target.value))}>
                                                            {Array.from({length: 3}, (_, i) => <option key={i} value={i}>{i}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
															<label className="field-label">Red Cards</label>
															<select className="input" value={gwChanges[p.id]?.redCards || 0} onChange={(e) => updateGwChange(p.id, 'redCards', parseInt(e.target.value))}>
																{Array.from({length: 2}, (_, i) => <option key={i} value={i}>{i}</option>)}
															</select>
														</div>
                                                    <div>
                                                        <label className="field-label">Result</label>
                                                        <select className="input" value={gwChanges[p.id]?.result || ''} onChange={(e) => updateGwChange(p.id, 'result', e.target.value as any)}>
                                                            <option value="">Select result</option>
                                                            <option value="win">Win</option>
                                                            <option value="draw">Draw</option>
                                                            <option value="loss">Loss</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="field-label">Man of the Match</label>
                                                        <label className="checkbox-tile">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={!!gwChanges[p.id]?.manOfTheMatch}
                                                                onChange={(e) => updateGwChange(p.id, 'manOfTheMatch', e.target.checked)}
                                                                style={{margin: 0}}
                                                            />
                                                            <span className="text-sm">Yes</span>
                                                        </label>
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
					<button className="btn" onClick={finalizeGameweek} disabled={isFinalizing}>Finalize Gameweek (save all)</button>
					<button className="btn secondary" onClick={()=>{ setWorkingPlayers(players); setPendingIds(new Set()); setGwChanges({}) }}>Discard Changes</button>
				</div>
			</div>
		</div>
	)
}