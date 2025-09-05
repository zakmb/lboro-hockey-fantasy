import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Player, TeamCode, Position } from '../types'
import { TEAM_LABEL } from '../types'
import { db } from '../lib/firebase'
import { collection, onSnapshot, doc, setDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'

const TEAMS: TeamCode[] = ['Men1','Men2','Men3','Men4','Men5']
const FORMATION = { GK: 1, DEF: 4, MID: 3, FWD: 3 } as const
const MAX_PER_TEAM = 3
const BUDGET_LIMIT = 100

function getDeadline(): Date {
	// Set deadline to September 6th, 2025 at midday (12:00 PM)
	const d = new Date(2025, 8, 6, 12, 0, 0, 0) // Month is 0-indexed, so 8 = September
	return d
}

export default function TeamBuilder(){
	const { user } = useAuth()
	const prevTransfersEnabledRef = useRef<boolean>(false)
	const [pool,setPool]=useState<Player[]>([])
	const [selected,setSelected]=useState<string[]>([])
	const [captainId,setCaptainId]=useState<string>('')
	const [baseline,setBaseline]=useState<string[]>([]) // team at window start or loaded from DB
	const [baselineCaptain,setBaselineCaptain]=useState<string>('')
	const [transfersEnabled,setTransfersEnabled]=useState<boolean>(false)
	const [deadline,setDeadline]=useState<Date>(getDeadline())
	const [countdown,setCountdown]=useState<string>('')
	const [transferUsed,setTransferUsed]=useState<boolean>(false)
	const [bank,setBank]=useState<number>(100)
	const [buyPrices,setBuyPrices]=useState<Record<string,number>>({})
	const [collapsedPositions,setCollapsedPositions]=useState<Record<Position,boolean>>({GK:false,DEF:false,MID:false,FWD:false})

	// Countdown
	useEffect(()=>{
		const timer = setInterval(()=>{
			const now = Date.now()
			const diff = deadline.getTime() - now
			if (diff <= 0) { setCountdown('Deadline passed'); return }
			const d = Math.floor(diff/86400000)
			const h = Math.floor((diff%86400000)/3600000)
			const m = Math.floor((diff%3600000)/60000)
			const s = Math.floor((diff%60000)/1000)
			setCountdown(`${d}d ${h}h ${m}m ${s}s`)
		}, 1000)
		return ()=>clearInterval(timer)
	},[deadline])

	// Streams
	useEffect(()=>{
		const unsubPlayers = onSnapshot(collection(db,'players'), snap=>{
			const list: Player[] = []
			snap.forEach(d=> list.push(d.data() as Player))
			setPool(list.length? list : defaultPool())
		})
		const unsubConfig = onSnapshot(doc(db,'config','league'), async (s)=>{
			const data = s.data() as any
			if (data?.transfersEnabled !== undefined){
				const next = !!data.transfersEnabled
				const prev = prevTransfersEnabledRef.current
				setTransfersEnabled(next)
				// When toggled from false -> true, reset transferUsed for all teams
				if (prev === false && next === true){
					try{
						const batch = writeBatch(db)
						const teamsSnap = await getDocs(collection(db,'teams'))
						teamsSnap.forEach(docSnap=>{
							batch.set(doc(db,'teams',docSnap.id), { transferUsed: false }, { merge: true })
						})
						await batch.commit()
					}catch(err){
						console.error('Failed to reset transferUsed for all teams', err)
					}
				}
				prevTransfersEnabledRef.current = next
			}
		})
		return ()=>{ unsubPlayers(); unsubConfig() }
	},[])

	// Load user's saved team
	useEffect(()=>{
		if(!user) return
		const ref = doc(db,'teams',user.id)
		getDoc(ref).then(s=>{
			const data = s.data() as any
			if (data?.players && Array.isArray(data.players)) { setSelected(data.players as string[]); setBaseline(data.players as string[]) }
			if (data?.captainId) { setCaptainId(data.captainId as string); setBaselineCaptain(data.captainId as string) }
			if (data?.transferUsed !== undefined) setTransferUsed(!!data.transferUsed)
			if (typeof data?.bank === 'number') setBank(data.bank)
			else setBank(100) // Default to £100M if no bank data
			if (data?.buyPrices && typeof data.buyPrices === 'object') setBuyPrices(data.buyPrices)
		})
		const unsub = onSnapshot(ref,(s)=>{
			const data = s.data() as any
			if (data?.players && Array.isArray(data.players)) { setSelected(data.players as string[]); setBaseline(data.players as string[]) }
			if (data?.captainId) { setCaptainId(data.captainId as string); setBaselineCaptain(data.captainId as string) }
			if (data?.transferUsed !== undefined) setTransferUsed(!!data.transferUsed)
			if (typeof data?.bank === 'number') setBank(data.bank)
			else setBank(100) // Default to £100M if no bank data
			if (data?.buyPrices && typeof data.buyPrices === 'object') setBuyPrices(data.buyPrices)
		})
		return unsub
	},[user])

	function defaultPool(): Player[] {
		return Array.from({length:40}).map((_,i)=>({
			id:'p'+i,
			name:'Player '+(i+1),
			team:TEAMS[i%5],
			position:(['GK','DEF','MID','FWD'] as const)[i%4],
			price:4+(i%6),
			pointsTotal:0,
			pointsGw:0,
			prevGwPoints:0,
			goals:0,assists:0,cleanSheets:0,greenCards:0,yellowCards:0,redCards:0,
			createdAt:Date.now(),updatedAt:Date.now()
		}))
	}

	const selectedPlayers = selected.map(id=> pool.find(p=>p.id===id)!).filter(Boolean)
	const counts = useMemo(()=> selectedPlayers.reduce((acc,p)=>{(acc as any)[p.position]++;return acc},{GK:0,DEF:0,MID:0,FWD:0} as Record<Position,number>),[selectedPlayers])
	const byTeam = useMemo(()=>{ const map: Record<TeamCode,number>={Men1:0,Men2:0,Men3:0,Men4:0,Men5:0}; selectedPlayers.forEach(p=>map[p.team]++); return map },[selectedPlayers])
	const squadCost = useMemo(()=> selectedPlayers.reduce((s,p)=> s + (p.price||0), 0), [selectedPlayers])
	const budget = BUDGET_LIMIT // Budget is always £100M, bank shows remaining funds

	const afterDeadline = useMemo(()=> Date.now() >= deadline.getTime(), [deadline])

	// Transfer limit calculation (symmetric diff/2 additions/removals)
	const transfersUsed = useMemo(()=>{
		// For new accounts (baseline is empty), transfersUsed should be 0
		if (baseline.length === 0) return 0
		const base = new Set(baseline)
		const now = new Set(selected)
		let diff = 0
		for (const id of now) if (!base.has(id)) diff++
		for (const id of base) if (!now.has(id)) diff++
		return Math.ceil(diff/2)
	},[baseline,selected])

	const allowedTransfersAfterDeadline = transferUsed ? 0 : 1
	const meetsTeamMin = TEAMS.every(t=>byTeam[t]>=1)
	const meetsTeamMax = TEAMS.every(t=>byTeam[t] <= MAX_PER_TEAM)
	const meetsFormation = (counts.GK===1 && counts.DEF===4 && counts.MID===3 && counts.FWD===3)
	const captainValid = captainId && selected.includes(captainId)

	// Post-deadline rule: if not transfersEnabled -> no edits; if enabled -> allow remaining transfer(s) + captain change
	const deadlinePolicyOk = useMemo(()=>{
		if (!afterDeadline) return true
		// For new players (baseline is empty), always allow team creation after deadline
		if (baseline.length === 0) return captainValid
		if (!transfersEnabled) return JSON.stringify(selected.sort())===JSON.stringify(baseline.sort()) && captainValid
		// For existing teams, check transfer limits
		return transfersUsed <= allowedTransfersAfterDeadline && captainValid
	},[afterDeadline,transfersEnabled,transfersUsed,allowedTransfersAfterDeadline,baseline,selected,captainValid])

	const canSave = selected.length===11 && meetsTeamMin && meetsTeamMax && meetsFormation && captainValid && deadlinePolicyOk && squadCost <= budget
	const hardDisabled = afterDeadline && !transfersEnabled && baseline.length > 0
	
	// Check if any changes have been made (for reset button)
	const hasChanges = useMemo(() => {
		const playersChanged = JSON.stringify(selected.sort()) !== JSON.stringify(baseline.sort())
		const captainChanged = captainId !== baselineCaptain
		return playersChanged || captainChanged
	}, [selected, baseline, captainId, baselineCaptain])

	const errorMessages = useMemo(()=>{
		const errs: string[] = []
		if (selected.length !== 11) errs.push('You must select exactly 11 players.')
		TEAMS.forEach(t=>{ if(byTeam[t] < 1) errs.push(`Select at least 1 player from ${TEAM_LABEL[t]}.`) })
		TEAMS.forEach(t=>{ if(byTeam[t] > 3) errs.push(`Maximum 3 from ${TEAM_LABEL[t]} (currently ${byTeam[t]}).`) })
		if (counts.GK !== 1) errs.push('You must pick exactly 1 Goalkeeper.')
		if (counts.DEF !== 4) errs.push('You must pick exactly 4 Defenders.')
		if (counts.MID !== 3) errs.push('You must pick exactly 3 Midfielders.')
		if (counts.FWD !== 3) errs.push('You must pick exactly 3 Forwards.')
		if (!captainValid) errs.push('Select a captain from your 11 players.')
		if (afterDeadline && !transfersEnabled && baseline.length > 0) errs.push('Transfer window closed. No changes allowed.')
		if (afterDeadline && transfersEnabled && baseline.length > 0 && transfersUsed>1) errs.push('Only 1 transfer allowed while transfers are enabled.')
		if (squadCost > budget) errs.push(`Budget exceeded: £${squadCost.toFixed(1)}M / £${budget.toFixed(1)}M`)
		return errs
	},[selected.length, byTeam, counts, captainValid, afterDeadline, transfersEnabled, transfersUsed, squadCost, budget])

	function canPickByPosition(p: Player): boolean { 
		// Check position constraints
		const nc={...counts} as Record<Position,number>; 
		nc[p.position]++; 
		if(p.position==='GK'&&nc.GK>1)return false; 
		if(p.position==='DEF'&&nc.DEF>4)return false; 
		if(p.position==='MID'&&nc.MID>3)return false; 
		if(p.position==='FWD'&&nc.FWD>3)return false; 
		
		// Check team constraints
		const currentByTeam = {...byTeam}
		currentByTeam[p.team]++
		if (currentByTeam[p.team] > MAX_PER_TEAM) return false
		
		// Check budget constraints
		const newSquadCost = squadCost + p.price
		if (newSquadCost > budget) return false
		
		// Check total players
		return selected.length < 11
	}

	function toggle(id:string, e: React.MouseEvent){ 
		e.preventDefault() // Prevent page scroll
		e.stopPropagation() // Prevent event bubbling
		const p=pool.find(x=>x.id===id)!; 
		if(selected.includes(id)){ 
			// Prevent deselecting players when transfers are disabled or used up
			// For new accounts (baseline empty), always allow deselecting
			if (baseline.length === 0) {
				// Allow deselecting for new accounts
			} else if (hardDisabled || (afterDeadline && transfersEnabled && transferUsed)) {
				return
			}
			setSelected(prev=>prev.filter(x=>x!==id)); 
			if(captainId===id) setCaptainId(''); 
			// Add player's price back to bank when removing
			setBank(prev => prev + p.price)
			return 
		}
		// Prevent picking beyond window rules (after deadline, transfers enabled, only 1 transfer)
		if (canPickByPosition(p)) {
			const simulate = [...selected, id]
			if (afterDeadline) {
				// For new accounts (baseline is empty), always allow full team creation
				if (baseline.length === 0) {
					// Allow adding players up to 11 for new accounts
					if (simulate.length > 11) return
				} else if (transfersEnabled) {
					// For existing teams, apply transfer limits
					const base = new Set(baseline)
					let diff = 0
					for (const pid of simulate) if (!base.has(pid)) diff++
					for (const pid of base) if (!simulate.includes(pid)) diff++
					const used = Math.ceil(diff/2)
					if (used>1) return
				} else {
					// Transfers not enabled, no changes allowed for existing teams
					return
				}
			}
			// Subtract player's price from bank when adding
			setBank(prev => prev - p.price)
			setSelected(prev=>[...prev,id])
		}
	}

	async function saveTeam(){
		if(!user||!canSave) return;
		
		let nextBank = bank // Start with current bank balance
		let nextBuy = { ...buyPrices }
		
		// On first-time team creation, initialize buyPrices
		if (baseline.length===0 && selected.length===11){
			for (const p of selectedPlayers){ 
				nextBuy[p.id] = p.price 
				// Don't subtract from bank - it's already correct from player selection
			}
		} else {
			// For team changes, handle player replacements
			const baseSet = new Set(baseline)
			const nowSet = new Set(selected)
			
			// Remove old players and add their current price back to budget
			for (const removed of baseline){ 
				if (!nowSet.has(removed)){
					const p = pool.find(x=>x.id===removed)
					if (p){ 
						nextBank += p.price // Add current price back to budget
						delete nextBuy[removed] 
					}
				}
			}
			
			// Add new players and subtract their current price from budget
			for (const added of selected){ 
				if (!baseSet.has(added)){
					const p = pool.find(x=>x.id===added)
					if (p){ 
						nextBuy[added] = p.price 
						nextBank -= p.price // Subtract current price from budget
					}
				}
			}
			
			// Ensure bank doesn't go below 0
			nextBank = Math.max(0, nextBank)
		}
		
		const payload: any = { 
			id: user.id, 
			userId: user.id, 
			displayName: user.displayName, 
			players: selected, 
			captainId, 
			bank: parseFloat(nextBank.toFixed(1)), 
			budget: BUDGET_LIMIT, // Save the total budget (100M)
			buyPrices: nextBuy, 
			updatedAt: Date.now() 
		}
		
		// Add createdAt only for first-time team creation
		if (baseline.length===0 && selected.length===11) {
			payload.createdAt = Date.now()
		}
		
		if (afterDeadline && transfersEnabled && transfersUsed>0) payload.transferUsed = true
		await setDoc(doc(db,'teams',user.id), payload, { merge: true })
		setBaseline(selected); setBaselineCaptain(captainId); setBank(payload.bank); setBuyPrices(nextBuy); if (payload.transferUsed) setTransferUsed(true); alert('Team saved!')
	}

	function resetTeam(){ 
		setSelected(baseline); 
		setCaptainId(baselineCaptain)
		// Reset bank to original state
		let originalBank = 100
		for (const playerId of baseline) {
			const p = pool.find(x => x.id === playerId)
			if (p) originalBank -= p.price
		}
		setBank(originalBank)
	}

	const byPos = useMemo(()=>({ 
		GK: pool.filter(p=>p.position==='GK').sort((a,b)=>b.pointsTotal-a.pointsTotal), 
		DEF: pool.filter(p=>p.position==='DEF').sort((a,b)=>b.pointsTotal-a.pointsTotal), 
		MID: pool.filter(p=>p.position==='MID').sort((a,b)=>b.pointsTotal-a.pointsTotal), 
		FWD: pool.filter(p=>p.position==='FWD').sort((a,b)=>b.pointsTotal-a.pointsTotal) 
	}),[pool])

	function PosList({ pos, title }:{ pos: Position, title: string }){ return (
		<div className="card">
			<div style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				cursor: 'pointer',
				marginBottom: collapsedPositions[pos] ? 0 : 12
			}} onClick={() => setCollapsedPositions(prev => ({...prev, [pos]: !prev[pos]}))}>
				<h3 style={{margin: 0}}>{title} ({(counts as any)[pos]}/{({GK:1,DEF:4,MID:3,FWD:3} as any)[pos]})</h3>
				<div style={{
					fontSize: '18px',
					fontWeight: 'bold',
					color: 'var(--primary)',
					transform: collapsedPositions[pos] ? 'rotate(0deg)' : 'rotate(180deg)',
					transition: 'transform 0.2s ease'
				}}>▼</div>
			</div>
			{!collapsedPositions[pos] && (
				<div className="grid" style={{
					gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',
					gap:12,
					alignItems:'stretch'
				}}>
					{byPos[pos].map(p=>{ const isSel=selected.includes(p.id); const disabled=!isSel && !canPickByPosition(p) || (isSel && (hardDisabled || (afterDeadline && transfersEnabled && transferUsed))); return (
						<div key={p.id} onClick={disabled ? undefined : (e)=>toggle(p.id, e)} className="card" style={{
						textAlign:'left',
						opacity: disabled ? 0.6 : 1,
						borderColor: isSel ? 'var(--primary)' : 'var(--border)',
						borderWidth: isSel ? '2px' : '1px',
						background: isSel ? 'linear-gradient(135deg, #f0f9ff, #e0f2fe)' : 'white',
						boxShadow: isSel ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
						transition: 'all 0.2s ease',
						cursor: disabled ? 'not-allowed' : 'pointer',
						transform: isSel ? 'translateY(-2px)' : 'none',
						display:'grid',
						gridTemplateColumns:'60px 1fr',
						alignItems:'stretch',
						gap:16,
						padding: '20px',
						borderRadius: '12px',
						minHeight: '120px',
						width: '100%',
						overflow: 'hidden',
						userSelect: 'none'
					}}>
						<div style={{
							textAlign:'center',
							background: isSel ? 'var(--primary)' : '#f8fafc',
							borderRadius: '8px',
							padding: '14px 8px',
							minWidth: '50px',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							alignItems: 'center',
							height: '100%'
						}}>
							<div style={{
								fontWeight:700,
								fontSize: '16px',
								color: isSel ? 'white' : '#1e293b'
							}}>{p.pointsTotal}</div>
							<div style={{
								fontSize:10,
								color: isSel ? 'rgba(255,255,255,0.8)' : '#64748b',
								fontWeight: 500,
								marginTop: '2px'
							}}>Total</div>
							<div style={{
								fontSize:11,
								color: isSel ? 'rgba(255,255,255,0.8)' : '#64748b',
								fontWeight: 500,
								marginTop: '4px'
							}}>Prev GW {p.prevGwPoints}</div>
						</div>
						<div style={{
							minWidth: 0,
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							overflow: 'hidden'
						}}>
							<div style={{
								fontWeight: 600,
								fontSize: '14px',
								color: '#1e293b',
								marginBottom: '6px',
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								lineHeight: '1.2'
							}}>{p.name}</div>
							<div style={{
								fontSize: '12px',
								color: '#64748b',
								fontWeight: 500,
								lineHeight: '1.3',
								marginBottom: '4px'
							}}>{TEAM_LABEL[p.team]}</div>
							<div style={{
								fontSize: '13px',
								color: '#059669',
								fontWeight: 600,
								lineHeight: '1.2'
							}}>£{p.price}M</div>
						</div>
					</div>)})}
				</div>
			)}
		</div>) }

	function FormationPitch(){ const gk=selectedPlayers.filter(p=>p.position==='GK'); const def=selectedPlayers.filter(p=>p.position==='DEF'); const mid=selectedPlayers.filter(p=>p.position==='MID'); const fwd=selectedPlayers.filter(p=>p.position==='FWD'); return (
		<div className="card" style={{background:'linear-gradient(#e8f6ff,#eef7ff)',borderColor:'#d7e6ff'}}>
			<h3>Team</h3>
			<div style={{height:12}}/>
			<div style={{display:'grid',gap:20}}>
				<Row players={fwd} />
				<Row players={mid} />
				<Row players={def} isDefenders={true} />
				<Row players={gk} />
			</div>
			{!afterDeadline && (
				<div className="subtitle" style={{marginTop:12}}>Deadline to change teams: {deadline.toLocaleDateString()} 12:00 — {countdown || 'Deadline passed'}</div>
			)}
		</div>) }

	function Row({ players, isDefenders = false }:{ players: Player[], isDefenders?: boolean }){ return (
		<div style={{
			display:'flex',
			justifyContent:'center',
			gap:16,
			flexWrap: 'wrap',
			overflowX: 'visible'
		}}>
			{players.map(p=> (
				<div key={p.id} className="card" style={{
					minWidth: isDefenders ? 140 : 160,
					maxWidth: isDefenders ? 160 : 180,
					textAlign:'center',
					position:'relative',
					padding:'16px 12px',
					overflow:'hidden',
					flexShrink: 0
				}}>
					{captainId===p.id && (
						<div style={{position:'absolute',top:6,right:6,background:'var(--primary)',color:'#fff',borderRadius:'999px',padding:'2px 6px',fontSize:11,fontWeight:700}}>C</div>
					)}
					<div style={{
						fontWeight:600,
						fontSize: isDefenders ? '12px' : '13px',
						lineHeight:'1.2',
						marginBottom:'4px',
						whiteSpace:'nowrap',
						overflow:'hidden',
						textOverflow:'ellipsis'
					}}>{p.name}</div>
					<div className="subtitle" style={{fontSize:'11px',marginBottom:'4px'}}>{p.position}</div>
					<div style={{fontSize:11,color:'#64748b'}}>
						Prev GW: {p.prevGwPoints}
					</div>
				</div>
			))}
		</div>) }

	return (
		<div className="grid" style={{
			gridTemplateColumns:'1fr 1.5fr', 
			alignItems:'start',
			gap:'20px',
			minHeight:'100vh',
			padding:'0 10px'
		}}>
			<div className="grid" style={{gap:'24px'}}>
				<PosList pos="GK" title="Goalkeepers" />
				<PosList pos="DEF" title="Defenders" />
				<PosList pos="MID" title="Midfielders" />
				<PosList pos="FWD" title="Forwards" />
			</div>
			<div className="grid" style={{gap:'24px'}}>
				{afterDeadline && transfersEnabled && transferUsed && (
					<div className="card" style={{borderColor:'#e9d5ff',background:'#faf5ff',color:'#6b21a8'}}>
						You have made your change for this week. You can still change your captain.
					</div>
				)}
				{afterDeadline && !transfersEnabled && (
					<div className="card" style={{borderColor:'#e9d5ff',background:'#faf5ff',color:'#6b21a8'}}>
						Changes can not be made currently, you will be notified when they can be done
					</div>
				)}
				<FormationPitch />
				<div className="card">
					<div className="subtitle" style={{marginBottom:8}}>Budget: £{bank.toFixed(1)}M</div>
					<label className="subtitle" style={{display:'block',marginBottom:6}}>Captain</label>
					<select className="input" value={captainId} onChange={e=>setCaptainId(e.target.value)}>
						<option value="">Select your captain</option>
						{selectedPlayers.map(p=> <option key={p.id} value={p.id}>{p.name} — {p.position}</option>)}
					</select>
				</div>
				<div className="card">
					{!canSave && (
						<div style={{marginBottom:12,padding:12,border:'1px solid #f5c2c7',background:'#fff0f1',borderRadius:10,color:'#7f1d1d'}}>
							<b>Fix the issues below to save your team:</b>
							<ul style={{margin:'8px 0 0 18px'}}>
								{errorMessages.map((e,i)=> <li key={i}>{e}</li>)}
							</ul>
						</div>
					)}
					<button disabled={hardDisabled || !canSave} className="btn" onClick={saveTeam} style={(hardDisabled || !canSave)?{opacity:.5,cursor:'not-allowed',background:'#b9a8d6'}:undefined}>Save Team</button>
					<button disabled={!hasChanges} className="btn secondary" onClick={resetTeam} style={!hasChanges?{opacity:.5,cursor:'not-allowed'}:{marginLeft:8}}>Reset</button>
				</div>
			</div>
		</div>
	)
}
