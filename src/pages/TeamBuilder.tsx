import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Player, TeamCode, Position } from '../types'
import { TEAM_LABEL } from '../types'
import { db } from '../lib/firebase'
import { collection, onSnapshot, doc, setDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import './TeamBuilder.css'
import { useInjuries } from '../contexts/InjuriesContext'

const TEAMS: TeamCode[] = ['Men1','Men2','Men3','Men4','Men5']
const FORMATION = { GK: 1, DEF: 4, MID: 3, FWD: 3 } as const
const MAX_PER_TEAM = 3
const BUDGET_LIMIT = 100

function getDeadline(): Date {
  const d = new Date(2025, 8, 6, 12, 0, 0, 0)
  return d
}

export default function TeamBuilder(){
  const { user } = useAuth()
  const { isInjured } = useInjuries()
  const prevTransfersEnabledRef = useRef<boolean>(false)
  const [pool, setPool] = useState<Player[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [captainId, setCaptainId] = useState<string>('')
  const [baseline, setBaseline] = useState<string[]>([])
  const [baselineCaptain, setBaselineCaptain] = useState<string>('')
  const [transfersEnabled, setTransfersEnabled] = useState<boolean>(false)
  const [deadline, setDeadline] = useState<Date>(getDeadline())
  const [countdown, setCountdown] = useState<string>('')
  const [transferUsed, setTransferUsed] = useState<boolean>(false)
  const [bank, setBank] = useState<number>(100)
  const [buyPrices, setBuyPrices] = useState<Record<string,number>>({})
  const [collapsedPositions, setCollapsedPositions] = useState<Record<Position,boolean>>({GK:false,DEF:false,MID:false,FWD:false})
  const [tripleCaptainUsed, setTripleCaptainUsed] = useState<boolean>(false)
  const [tripleCaptainPending, setTripleCaptainPending] = useState<boolean>(false)
  const [tripleCaptainConfirm, setTripleCaptainConfirm] = useState<boolean>(false)

  // countdown
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

  // live players and config (transfers enabled + weekly reset)
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

  // load/save team doc
  useEffect(()=>{
    if(!user) return
    const ref = doc(db,'teams',user.id)
    getDoc(ref).then(s=>{
      const data = s.data() as any
      if (data?.players && Array.isArray(data.players)) { setSelected(data.players as string[]); setBaseline(data.players as string[]) }
      if (data?.captainId) { setCaptainId(data.captainId as string); setBaselineCaptain(data.captainId as string) }
      if (data?.transferUsed !== undefined) setTransferUsed(!!data.transferUsed)
      if (typeof data?.bank === 'number') setBank(data.bank)
      else setBank(100)
      if (data?.buyPrices && typeof data.buyPrices === 'object') setBuyPrices(data.buyPrices)
      if (data?.tripleCaptainUsed !== undefined) setTripleCaptainUsed(!!data.tripleCaptainUsed)
      if (data?.tripleCaptainPending !== undefined) setTripleCaptainPending(!!data.tripleCaptainPending)
    })
    const unsub = onSnapshot(ref,(s)=>{
      const data = s.data() as any
      if (data?.players && Array.isArray(data.players)) { setSelected(data.players as string[]); setBaseline(data.players as string[]) }
      if (data?.captainId) { setCaptainId(data.captainId as string); setBaselineCaptain(data.captainId as string) }
      if (data?.transferUsed !== undefined) setTransferUsed(!!data.transferUsed)
      if (typeof data?.bank === 'number') setBank(data.bank)
      else setBank(100)
      if (data?.buyPrices && typeof data.buyPrices === 'object') setBuyPrices(data.buyPrices)
      if (data?.tripleCaptainUsed !== undefined) setTripleCaptainUsed(!!data.tripleCaptainUsed)
      if (data?.tripleCaptainPending !== undefined) setTripleCaptainPending(!!data.tripleCaptainPending)
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
  const budget = BUDGET_LIMIT

  const afterDeadline = useMemo(()=> Date.now() >= deadline.getTime(), [deadline])

  const transfersUsed = useMemo(()=>{
    if (baseline.length === 0) return 0
    const base = new Set(baseline)
    const now = new Set(selected)
    let diff = 0
    for (const id of now) if (!base.has(id)) diff++
    for (const id of base) if (!now.has(id)) diff++
    return Math.ceil(diff/2)
  },[baseline,selected])

  const allowedTransfersAfterDeadline = transferUsed ? 0 : 1
  const meetsFormation = (counts.GK===1 && counts.DEF===4 && counts.MID===3 && counts.FWD===3)
  const captainValid = captainId && selected.includes(captainId)

  const deadlinePolicyOk = useMemo(()=>{
    if (!afterDeadline) return true
    if (baseline.length === 0) return captainValid
    if (!transfersEnabled) return JSON.stringify(selected.sort())===JSON.stringify(baseline.sort()) && captainValid
    return transfersUsed <= allowedTransfersAfterDeadline && captainValid
  },[afterDeadline,transfersEnabled,transfersUsed,allowedTransfersAfterDeadline,baseline,selected,captainValid])

  const canSave = selected.length===11 && meetsFormation && captainValid && deadlinePolicyOk && squadCost <= budget
  const hardDisabled = afterDeadline && !transfersEnabled && baseline.length > 0

  const hasChanges = useMemo(() => {
    const playersChanged = JSON.stringify(selected.sort()) !== JSON.stringify(baseline.sort())
    const captainChanged = captainId !== baselineCaptain
    return playersChanged || captainChanged
  }, [selected, baseline, captainId, baselineCaptain])

  const errorMessages = useMemo(()=>{
    const errs: string[] = []
    if (selected.length !== 11) errs.push('You must select exactly 11 players.')
    if (counts.GK !== 1) errs.push('You must pick exactly 1 Goalkeeper.')
    if (counts.DEF !== 4) errs.push('You must pick exactly 4 Defenders.')
    if (counts.MID !== 3) errs.push('You must pick exactly 3 Midfielders.')
    if (counts.FWD !== 3) errs.push('You must pick exactly 3 Forwards.')
    if (!captainValid) errs.push('Select a captain from your 11 players.')
    if (afterDeadline && !transfersEnabled && baseline.length > 0) errs.push('Transfer window closed. No changes allowed.')
    if (afterDeadline && transfersEnabled && baseline.length > 0 && transfersUsed>1) errs.push('Only 1 transfer allowed while transfers are enabled.')
    if (squadCost > budget) errs.push(`Budget exceeded: £${squadCost.toFixed(1)}M / £${budget.toFixed(1)}M`)
    return errs
  },[selected.length, counts, captainValid, afterDeadline, transfersEnabled, transfersUsed, squadCost, budget])

  function canPickByPosition(p: Player): boolean {
    const nc={...counts} as Record<Position,number>
    nc[p.position]++
    if(p.position==='GK'&&nc.GK>1)return false
    if(p.position==='DEF'&&nc.DEF>4)return false
    if(p.position==='MID'&&nc.MID>3)return false
    if(p.position==='FWD'&&nc.FWD>3)return false

    const newSquadCost = squadCost + p.price
    if (newSquadCost > budget) return false

    return selected.length < 11
  }

  function toggle(id:string, e: React.MouseEvent){
    e.preventDefault()
    e.stopPropagation()
    const p=pool.find(x=>x.id===id)!
    if(selected.includes(id)){
      if (baseline.length === 0) {
      } else if (hardDisabled || (afterDeadline && transfersEnabled && transferUsed)) {
        return
      }
      setSelected(prev=>prev.filter(x=>x!==id))
      if(captainId===id) setCaptainId('')
      setBank(prev => prev + p.price)
      return
    }
    if (canPickByPosition(p)) {
      const simulate = [...selected, id]
      if (afterDeadline) {
        if (baseline.length === 0) {
          if (simulate.length > 11) return
        } else if (transfersEnabled) {
          const base = new Set(baseline)
          let diff = 0
          for (const pid of simulate) if (!base.has(pid)) diff++
          for (const pid of base) if (!simulate.includes(pid)) diff++
          const used = Math.ceil(diff/2)
          if (used>1) return
        } else {
          return
        }
      }
      setBank(prev => prev - p.price)
      setSelected(prev=>[...prev,id])
    }
  }

  async function saveTeam(){
    if(!user||!canSave) return;

    let nextBank = bank
    let nextBuy = { ...buyPrices }

    if (baseline.length===0 && selected.length===11){
      for (const p of selectedPlayers){
        nextBuy[p.id] = p.price
      }
    } else {
      const baseSet = new Set(baseline)
      const nowSet = new Set(selected)

      for (const removed of baseline){
        if (!nowSet.has(removed)){
          const p = pool.find(x=>x.id===removed)
          if (p){
            nextBank += p.price
            delete nextBuy[removed]
          }
        }
      }

      for (const added of selected){
        if (!baseSet.has(added)){
          const p = pool.find(x=>x.id===added)
          if (p){
            nextBuy[added] = p.price
            nextBank -= p.price
          }
        }
      }

      nextBank = Math.max(0, nextBank)
    }

    const payload: any = {
      id: user.id,
      userId: user.id,
      displayName: user.displayName,
      players: selected,
      captainId,
      bank: parseFloat(nextBank.toFixed(1)),
      budget: BUDGET_LIMIT,
      buyPrices: nextBuy,
      tripleCaptainUsed,
      tripleCaptainPending,
      updatedAt: Date.now()
    }

    if (baseline.length===0 && selected.length===11) {
      payload.createdAt = Date.now()
    }

    if (afterDeadline && transfersEnabled && transfersUsed>0) payload.transferUsed = true
    await setDoc(doc(db,'teams',user.id), payload, { merge: true })
    setBaseline(selected); setBaselineCaptain(captainId); setBank(payload.bank); setBuyPrices(nextBuy); if (payload.transferUsed) setTransferUsed(true); alert('Team saved!')
  }

  function resetTeam(){
    setSelected(baseline)
    setCaptainId(baselineCaptain)
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

  function PosList({ pos, title }:{ pos: Position, title: string }){ 
    return (
      <div className="card">
        <button
          type="button"
          className={`pos-header ${collapsedPositions[pos] ? 'collapsed' : ''}`}
          onClick={() => setCollapsedPositions(prev => ({...prev, [pos]: !prev[pos]}))}
          aria-expanded={!collapsedPositions[pos]}
          aria-controls={`pos-${pos}`}
        >
          <h3 className="pos-title">{title} <span className="pos-count">{(counts as any)[pos]}/{(FORMATION as any)[pos]}</span></h3>
          <span className="caret" aria-hidden>▼</span>
        </button>
        {!collapsedPositions[pos] && (
          <div id={`pos-${pos}`} className="players-grid">
            {byPos[pos].map(p=>{
              const isSel=selected.includes(p.id)
              const disabled=(!isSel && !canPickByPosition(p)) || (isSel && (hardDisabled || (afterDeadline && transfersEnabled && transferUsed)))
              return (
                <div
                  key={p.id}
                  onClick={disabled ? undefined : (e)=>toggle(p.id, e)}
                  className={`player-card card ${isSel ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`player-stat ${isSel ? 'is-selected' : ''}`}>
                    <div className="stat-big">{p.pointsTotal}</div>
                    <div className="stat-label">Total</div>
                    <div className="stat-sub">Prev GW {p.prevGwPoints}</div>
                  </div>
                  <div className="player-meta">
                    <div className="player-name">{p.name}{isInjured(p.id) ? ' 🚑' : ''}</div>
                    <div className="player-team">{TEAM_LABEL[p.team]}</div>
                    <div className="player-price">£{p.price}M</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function FormationPitch(){
    const gk=selectedPlayers.filter(p=>p.position==='GK')
    const def=selectedPlayers.filter(p=>p.position==='DEF')
    const mid=selectedPlayers.filter(p=>p.position==='MID')
    const fwd=selectedPlayers.filter(p=>p.position==='FWD')

    const pitchRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
      const el = pitchRef.current
      if (!el) return

      const compute = () => {
        // For each row, compute its per-column width, then use the smallest across all rows
        const rows = Array.from(el.querySelectorAll<HTMLElement>('.row'))
        if (!rows.length) return
        const widths: number[] = []

        rows.forEach(row => {
          const styles = getComputedStyle(row)
          const gap = parseFloat(styles.gap || '10')
          const cols = Number(styles.getPropertyValue('--cols') || '1') || 1
          const colsWidth = row.clientWidth - gap * (cols - 1)
          const colWidth = Math.max(50, colsWidth / cols)
          widths.push(colWidth)
        })

        const minCol = Math.floor(Math.min(...widths))
        el.style.setProperty('--chip-max-global', `${minCol}px`)
        const scale = Math.max(0.64, Math.min(1, minCol / 160)) // 160px ≈ comfy base
        el.style.setProperty('--font-scale-global', `${scale}`)
      }

      const ro = new ResizeObserver(compute)
      ro.observe(el)
      Array.from(el.querySelectorAll<HTMLElement>('.row')).forEach(r => ro.observe(r))
      compute()

      return () => ro.disconnect()
    }, [])

    return (
      <div ref={pitchRef} className="card pitch">
        <div className="card-title-row">
          <h3>Team</h3>
          {!afterDeadline && (
            <div className="subtitle badge-time" title="Transfer deadline">
              {deadline.toLocaleDateString('en-GB')} 12:00 · {countdown || 'Deadline passed'}
            </div>
          )}
        </div>
        <div className="spacer-12"/>
        <div className="pitch-rows">
          <Row players={fwd} cols={3} />
          <Row players={mid} cols={3} />
          <Row players={def} cols={4} isDefenders />
          <Row players={gk} cols={1} />
        </div>
      </div>
    )
  }

  function Row({ players, cols, isDefenders = false }:{
    players: Player[], cols: number, isDefenders?: boolean
  }){
    // Fill with placeholders to always keep the exact number of columns
    const filled: (Player | undefined)[] = [...players]
    while (filled.length < cols) filled.push(undefined)

    return (
      <div
        className="row"
        style={{ ['--cols' as any]: cols }}
      >
        {filled.map((p, idx) => {
          if (!p) {
            return (
              <div key={`empty-${idx}`} className={`card chip chip--empty ${isDefenders ? 'chip--sm' : ''}`}>
                <div className="chip-placeholder" aria-hidden="true">
                  <span className="chip-placeholder-dot" />
                  <span className="chip-placeholder-dot" />
                  <span className="chip-placeholder-dot" />
                </div>
              </div>
            )
          }

          return (
            <div key={p.id} className={`card chip ${isDefenders ? 'chip--sm' : ''}`}>
              {captainId===p.id && (<div className="captain">C</div>)}
              <div className={`chip-name ${isDefenders ? 'chip-name--sm' : ''}`}>{p.name}{isInjured(p.id) ? ' 🚑' : ''}</div>
              <div className="subtitle chip-pos">{p.position}</div>
              <div className="chip-prev">Prev GW: {p.prevGwPoints}</div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="layout">
      <div className="left">

        {afterDeadline && transfersEnabled && transferUsed && (
          <div className="card notice notice--purple" role="status">
            You have made your change for this week. You can still change your captain.
          </div>
        )}
        {afterDeadline && !transfersEnabled && (
          <div className="card notice notice--purple" role="status">
            Changes can not be made currently, you will be notified when they can be done
          </div>
        )}
        <FormationPitch />
        
      </div>

      <div className="right">

        <div className="card">
          <div className="budget-row">
            <div className="subtitle">Budget</div>
            <div className="budget-amount" aria-live="polite">£{bank.toFixed(1)}M</div>
          </div>
          <div className="grid" style={{gridTemplateColumns:'1fr auto', alignItems:'center'}}>
            <div className="subtitle">Triple Captain</div>
            {tripleCaptainUsed ? (
              <button className="btn secondary" disabled title="Already used">Used</button>
            ) : tripleCaptainPending ? (
              <button className="btn secondary" disabled title="Will apply on next scoring">Activated</button>
            ) : tripleCaptainConfirm ? (
              <button
                className="btn"
                disabled={!captainValid}
                title={!captainValid ? 'Select a captain first' : 'Confirm triple captain for next scoring'}
                onClick={async ()=>{
                  if (!captainValid || !user) return
                  setTripleCaptainPending(true)
                  setTripleCaptainConfirm(false)
                  await setDoc(doc(db,'teams',user.id), { tripleCaptainPending: true }, { merge: true })
                }}
              >
                Confirm?
              </button>
            ) : (
              <button
                className="btn"
                disabled={!captainValid}
                title={!captainValid ? 'Select a captain first' : 'Triples next scoring for your captain'}
                onClick={()=> setTripleCaptainConfirm(true)}
              >
                Activate?
              </button>
            )}
          </div>
          <label className="subtitle label" htmlFor="captain">Captain</label>
          <select id="captain" className="input" value={captainId} onChange={e=>setCaptainId(e.target.value)}>
            <option value="">Select your captain</option>
            {selectedPlayers.map(p=> <option key={p.id} value={p.id}>{p.name}{isInjured(p.id) ? ' 🚑' : ''} — {p.position}</option>)}
          </select>
        </div>

        <div className="card">
          {!canSave && (
            <div className="errors" role="alert">
              <b>Fix the issues below to save your team:</b>
              <ul>
                {errorMessages.map((e,i)=> <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          <div className="actions sticky-actions">
            <button disabled={hardDisabled || !canSave} className="btn" onClick={saveTeam}>Save Team</button>
            <button disabled={!hasChanges} className="btn secondary" onClick={resetTeam}>Reset</button>
          </div>
        </div>

        <PosList pos="GK" title="Goalkeepers" />
        <PosList pos="DEF" title="Defenders" />
        <PosList pos="MID" title="Midfielders" />
        <PosList pos="FWD" title="Forwards" />

      </div>

    </div>
  )
}
