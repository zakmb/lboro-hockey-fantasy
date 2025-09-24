import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Player, TeamCode, Position } from '../types'
import { TEAM_LABEL } from '../types'
import { db } from '../lib/firebase'
import { collection, onSnapshot, doc, setDoc, getDoc, getDocs, writeBatch, increment } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import './TeamBuilder.css'
import { useInjuries } from '../contexts/InjuriesContext'

const TEAMS: TeamCode[] = ['Men1','Men2','Men3','Men4','Men5']
const FORMATION = { GK: 1, DEF: 4, MID: 3, FWD: 3 } as const
const BUDGET_LIMIT = 100

function getDeadline(): Date {
  const d = new Date(2025, 8, 26, 21, 0, 0, 0)
  return d
}

export default function TeamBuilder(){
  const { user } = useAuth()
  const { isInjured } = useInjuries()
  const prevTransfersEnabledRef = useRef<boolean | null>(null)
  const [pool, setPool] = useState<Player[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [captainId, setCaptainId] = useState<string>('')
  const [baseline, setBaseline] = useState<string[]>([])
  const [baselineCaptain, setBaselineCaptain] = useState<string>('')
  const [transfersEnabled, setTransfersEnabled] = useState<boolean>(false)
  const [deadline, setDeadline] = useState<Date>(getDeadline())
  const [freeTransfers, setFreeTransfers] = useState<number>(1)
  const [wildcardUsed, setWildcardUsed] = useState<boolean>(false)
  const [wildcardPending, setWildcardPending] = useState<boolean>(false)
  const [wildcardConfirm, setWildcardConfirm] = useState<boolean>(false)
  const [transferPointsDeduction, setTransferPointsDeduction] = useState<number>(0)
  const [bank, setBank] = useState<number>(100)
  const [collapsedPositions, setCollapsedPositions] = useState<Record<Position,boolean>>({GK:false,DEF:false,MID:false,FWD:false})
  const [tripleCaptainUsed, setTripleCaptainUsed] = useState<boolean>(false)
  const [tripleCaptainPending, setTripleCaptainPending] = useState<boolean>(false)
  const [tripleCaptainConfirm, setTripleCaptainConfirm] = useState<boolean>(false)


  useEffect(()=>{
    const unsubPlayers = onSnapshot(collection(db,'players'), snap=>{
      const list: Player[] = []
      snap.forEach(d=> list.push(d.data() as Player))
      setPool(list)
    })
    const unsubConfig = onSnapshot(doc(db,'config','league'), async (s)=>{
      const data = s.data() as any
      if (data?.transfersEnabled !== undefined){
        const next = !!data.transfersEnabled
        const prev = prevTransfersEnabledRef.current
        setTransfersEnabled(next)
        if (prev !== null && prev === false && next === true){
          try{
            const batch = writeBatch(db)
            const teamsSnap = await getDocs(collection(db,'teams'))
            teamsSnap.forEach(docSnap=>{
              batch.set(doc(db,'teams',docSnap.id), {
                transferPointsDeduction: 0
              }, { merge: true })
            })
            await batch.commit()
          }catch(err){
            console.error('Failed to reset transfer system for all teams', err)
          }
        }
        
        prevTransfersEnabledRef.current = next
      }
    })
    return ()=>{ unsubPlayers(); unsubConfig() }
  },[])

  useEffect(()=>{
    if(!user) return
    const ref = doc(db,'teams',user.id)
    getDoc(ref).then(s=>{
      const data = s.data() as any
      if (data?.players && Array.isArray(data.players)) { setSelected(data.players as string[]); setBaseline(data.players as string[]) }
      if (data?.captainId) { setCaptainId(data.captainId as string); setBaselineCaptain(data.captainId as string) }
      if (typeof data?.freeTransfers === 'number') setFreeTransfers(data.freeTransfers)
      else setFreeTransfers(1)
      if (data?.wildcardUsed !== undefined) setWildcardUsed(!!data.wildcardUsed)
      if (data?.wildcardPending !== undefined) setWildcardPending(!!data.wildcardPending)
      if (typeof data?.transferPointsDeduction === 'number') setTransferPointsDeduction(data.transferPointsDeduction)
      else setTransferPointsDeduction(0)
      if (typeof data?.bank === 'number') setBank(data.bank)
      else setBank(100)
      if (data?.tripleCaptainUsed !== undefined) setTripleCaptainUsed(!!data.tripleCaptainUsed)
      if (data?.tripleCaptainPending !== undefined) setTripleCaptainPending(!!data.tripleCaptainPending)
    })
    const unsub = onSnapshot(ref,(s)=>{
      const data = s.data() as any
      if (data?.players && Array.isArray(data.players)) { setSelected(data.players as string[]); setBaseline(data.players as string[]) }
      if (data?.captainId) { setCaptainId(data.captainId as string); setBaselineCaptain(data.captainId as string) }
      if (typeof data?.freeTransfers === 'number') setFreeTransfers(data.freeTransfers)
      else setFreeTransfers(1)
      if (data?.wildcardUsed !== undefined) setWildcardUsed(!!data.wildcardUsed)
      if (data?.wildcardPending !== undefined) setWildcardPending(!!data.wildcardPending)
      if (typeof data?.transferPointsDeduction === 'number') setTransferPointsDeduction(data.transferPointsDeduction)
      else setTransferPointsDeduction(0)
      if (typeof data?.bank === 'number') setBank(data.bank)
      else setBank(100)
      if (data?.tripleCaptainUsed !== undefined) setTripleCaptainUsed(!!data.tripleCaptainUsed)
      if (data?.tripleCaptainPending !== undefined) setTripleCaptainPending(!!data.tripleCaptainPending)
    })
    return unsub
  },[user])

  // default player pool removed; pool now reflects DB only

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

  const liveFreeTransfers = useMemo(() => {
    if (!afterDeadline) return '∞'
    if (wildcardPending) return '∞'
    if (baseline.length === 0) return freeTransfers
    return Math.max(0, freeTransfers - transfersUsed)
  }, [afterDeadline, freeTransfers, transfersUsed, wildcardPending, baseline.length])

  const liveTransferPointsDeduction = useMemo(() => {
    if (!afterDeadline) return 0
    if (wildcardPending) return 0
    if (baseline.length === 0) return transferPointsDeduction
    const transfersOverFree = Math.max(0, transfersUsed - freeTransfers)
    return transferPointsDeduction + (transfersOverFree * 4)
  }, [afterDeadline, transfersUsed, freeTransfers, wildcardPending, baseline.length, transferPointsDeduction])

  const meetsFormation = (counts.GK===1 && counts.DEF===4 && counts.MID===3 && counts.FWD===3)
  const captainValid = captainId && selected.includes(captainId)

  const deadlinePolicyOk = useMemo(()=>{
    if (!afterDeadline) return true
    if (baseline.length === 0) return captainValid
    if (!transfersEnabled) return JSON.stringify(selected.sort())===JSON.stringify(baseline.sort()) && captainValid
    return captainValid
  },[afterDeadline,transfersEnabled,baseline,selected,captainValid])

  const hasChanges = useMemo(() => {
    const playersChanged = JSON.stringify(selected.sort()) !== JSON.stringify(baseline.sort())
    const captainChanged = captainId !== baselineCaptain
    return playersChanged || captainChanged
  }, [selected, baseline, captainId, baselineCaptain])

  const canSave = selected.length===11 && meetsFormation && captainValid && deadlinePolicyOk && squadCost <= budget
  const hardDisabled = afterDeadline && !transfersEnabled && baseline.length > 0
  const controlsDisabled = hardDisabled

  const errorMessages = useMemo(()=>{
    const errs: string[] = []
    if (selected.length !== 11) errs.push('You must select exactly 11 players.')
    if (counts.GK !== 1) errs.push('You must pick exactly 1 Goalkeeper.')
    if (counts.DEF !== 4) errs.push('You must pick exactly 4 Defenders.')
    if (counts.MID !== 3) errs.push('You must pick exactly 3 Midfielders.')
    if (counts.FWD !== 3) errs.push('You must pick exactly 3 Forwards.')
    if (!captainValid) errs.push('Select a captain from your 11 players.')
    if (afterDeadline && !transfersEnabled && baseline.length > 0) errs.push('Transfer window closed. No changes allowed.')
    if (liveTransferPointsDeduction > 0) {
      errs.push(`${liveTransferPointsDeduction / 4} transfer${liveTransferPointsDeduction / 4 > 1 ? 's' : ''} over free limit will cost ${liveTransferPointsDeduction} points at gameweek end.`)
    }
    if (squadCost > budget) errs.push(`Budget exceeded: £${squadCost.toFixed(1)}M / £${budget.toFixed(1)}M`)
    return errs
  },[selected.length, counts, captainValid, afterDeadline, transfersEnabled, liveTransferPointsDeduction, squadCost, budget])

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
      } else if (hardDisabled) {
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
        } else if (!transfersEnabled) {
          return
        }
      }
      setBank(prev => prev - p.price)
      setSelected(prev=>[...prev,id])
    }
  }

  async function saveTeam(){
    if(!user||!canSave) return;

    const currentSquadCost = selectedPlayers.reduce((total, p) => total + p.price, 0)
    const nextBank = BUDGET_LIMIT - currentSquadCost

    const payload: any = {
      id: user.id,
      userId: user.id,
      displayName: user.displayName,
      players: selected,
      captainId,
      bank: parseFloat(nextBank.toFixed(1)),
      budget: BUDGET_LIMIT,
      tripleCaptainUsed,
      tripleCaptainPending,
      freeTransfers,
      wildcardUsed,
      wildcardPending,
      transferPointsDeduction,
      updatedAt: Date.now()
    }

    if (baseline.length===0 && selected.length===11) {
      payload.createdAt = Date.now()
    }

    if (afterDeadline && transfersEnabled && transfersUsed>0) {
      if (wildcardPending) {
        payload.transferPointsDeduction = 0
      } else {
        const transfersToDeduct = Math.min(transfersUsed, freeTransfers)
        payload.freeTransfers = Math.max(0, freeTransfers - transfersToDeduct)
        const transfersOverFree = Math.max(0, transfersUsed - freeTransfers)
        payload.transferPointsDeduction = transferPointsDeduction + (transfersOverFree * 4)
      }
    }
    // Compute transfer deltas against baseline and update player transfer metrics
    try {
      const added = selected.filter(id => !baseline.includes(id))
      const removed = baseline.filter(id => !selected.includes(id))
      if (added.length || removed.length) {
        const batch = writeBatch(db)
        for (const id of added) {
          batch.set(doc(db,'players',id), { transfersIn: increment(1), updatedAt: Date.now() } as any, { merge: true })
        }
        for (const id of removed) {
          batch.set(doc(db,'players',id), { transfersOut: increment(1), updatedAt: Date.now() } as any, { merge: true })
        }
        await batch.commit()
      }
    } catch (err) {
      console.error('Failed to update player transfer metrics', err)
    }

    await setDoc(doc(db,'teams',user.id), payload, { merge: true })
    setBaseline(selected); setBaselineCaptain(captainId); setBank(payload.bank); 
    if (payload.freeTransfers !== undefined) setFreeTransfers(payload.freeTransfers)
    if (payload.wildcardUsed !== undefined) setWildcardUsed(payload.wildcardUsed)
    if (payload.wildcardPending !== undefined) setWildcardPending(payload.wildcardPending)
    if (payload.transferPointsDeduction !== undefined) setTransferPointsDeduction(payload.transferPointsDeduction)
    alert('Team saved!')
  }

  function resetTeam(){
    setSelected(baseline)
    setCaptainId(baselineCaptain)
    const baselinePlayers = baseline.map(id => pool.find(p => p.id === id)).filter(Boolean)
    const baselineCost = baselinePlayers.reduce((total, p) => total + (p?.price || 0), 0)
    setBank(BUDGET_LIMIT - baselineCost)
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
              const disabled=(!isSel && !canPickByPosition(p)) || (isSel && hardDisabled)
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
        const scale = Math.max(0.64, Math.min(1, minCol / 160))
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
            <CountdownBadge deadline={deadline} />
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
              <div className="subtitle chip-pos">{p.position} - £{p.price}M</div>
              <div className="chip-prev">Prev GW: {p.prevGwPoints}</div>
            </div>
          )
        })}
      </div>
    )
  }

  function CountdownBadge({ deadline }: { deadline: Date }){
    const [tick, setTick] = useState(0)
    const [label, setLabel] = useState<string>('')
    useEffect(()=>{
      const compute = ()=>{
        const now = Date.now()
        const diff = deadline.getTime() - now
        if (diff <= 0) { setLabel('Deadline passed'); return }
        const d = Math.floor(diff/86400000)
        const h = Math.floor((diff%86400000)/3600000)
        const m = Math.floor((diff%3600000)/60000)
        const s = Math.floor((diff%60000)/1000)
        setLabel(`${d}d ${h}h ${m}m ${s}s`)
      }
      compute()
      const id = setInterval(()=>{ setTick(v=>v+1); compute() }, 1000)
      return ()=> clearInterval(id)
    },[deadline])
    const time = useMemo(()=> deadline.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), [deadline])
    return (
      <div className="subtitle badge-time" title="Transfer deadline" aria-live="polite">
        {deadline.toLocaleDateString('en-GB')} {time} · {label || '—'}
      </div>
    )
  }

  return (
    <div className="layout">
      <div className="left">

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
          
        <br/>
          {(tripleCaptainPending || wildcardPending) && (
            <div className="card notice notice--blue" role="status" style={{marginBottom: '12px'}}>
              <strong>Chip Active:</strong> Only one chip can be used per week. The other chip is blocked.
            </div>
          )}
          {!tripleCaptainUsed && !wildcardUsed && !tripleCaptainPending && !wildcardPending && (
            <div className="card notice notice--yellow" role="status" style={{marginBottom: '12px'}}>
              <strong>Note:</strong> You can only use one chip (Triple Captain or Wildcard) per week.
            </div>
          )}
          <br/>
          
          <div className="grid" style={{gridTemplateColumns:'1fr auto', alignItems:'center'}}>
            <div className="subtitle">Triple Captain</div>
            {tripleCaptainUsed ? (
              <button className="btn secondary" disabled title="Already used">Used</button>
            ) : tripleCaptainPending ? (
              <button className="btn secondary" disabled title="Will apply on next scoring">Activated</button>
            ) : wildcardPending ? (
              <button className="btn secondary" disabled title="Cannot use with wildcard active" style={{opacity: 0.5, backgroundColor: 'var(--color-red-light)'}}>
                Blocked by Wildcard
              </button>
            ) : tripleCaptainConfirm ? (
              <button
                className={`btn ${(!captainValid || controlsDisabled) ? 'btn--disabled' : ''}`}
                disabled={!captainValid || controlsDisabled}
                title={!captainValid ? 'Select a captain first' : controlsDisabled ? 'Transfer window is closed' : 'Confirm triple captain for next scoring'}
                onClick={async ()=>{
                  if (!captainValid || !user || controlsDisabled) return
                  setTripleCaptainPending(true)
                  setTripleCaptainConfirm(false)
                  await setDoc(doc(db,'teams',user.id), { tripleCaptainPending: true }, { merge: true })
                }}
              >
                Confirm?
              </button>
            ) : (
              <button
                className={`btn ${(!captainValid || controlsDisabled) ? 'btn--disabled' : ''}`}
                disabled={!captainValid || controlsDisabled}
                title={!captainValid ? 'Select a captain first' : controlsDisabled ? 'Transfer window is closed' : 'Triples next scoring for your captain'}
                onClick={()=> setTripleCaptainConfirm(true)}
              >
                Activate?
              </button>
            )}
          </div>
          
          <br/>

          <div className="grid" style={{gridTemplateColumns:'1fr auto', alignItems:'center'}}>
            <div className="subtitle">Wildcard</div>
            {wildcardUsed ? (
              <button className="btn secondary" disabled title="Already used">Used</button>
            ) : wildcardPending ? (
              <button className="btn secondary" disabled title="Will apply on next save">Activated</button>
            ) : tripleCaptainPending ? (
              <button className="btn secondary" disabled title="Cannot use with triple captain active" style={{opacity: 0.5, backgroundColor: 'var(--color-red-light)'}}>
                Blocked by Triple Captain
              </button>
            ) : wildcardConfirm ? (
              <button
                className={`btn ${controlsDisabled ? 'btn--disabled' : ''}`}
                disabled={controlsDisabled}
                title={controlsDisabled ? 'Transfer window is closed' : 'Confirm wildcard for unlimited transfers this week'}
                onClick={async ()=>{
                  if (!user || controlsDisabled) return
                  setWildcardPending(true)
                  setWildcardConfirm(false)
                  await setDoc(doc(db,'teams',user.id), { wildcardPending: true }, { merge: true })
                }}
              >
                Confirm?
              </button>
            ) : (
              <button
                className={`btn ${controlsDisabled ? 'btn--disabled' : ''}`}
                disabled={controlsDisabled}
                title={controlsDisabled ? 'Transfer window is closed' : 'Allows unlimited transfers with no point deductions for one week'}
                onClick={()=> setWildcardConfirm(true)}
              >
                Activate?
              </button>
            )}
          </div>

          <br/>
          
          <div className="grid" style={{gridTemplateColumns:'1fr auto', alignItems:'center'}}>
            <div className="subtitle">Free Transfers</div>
            <div className="budget-amount">{liveFreeTransfers}</div>
          </div>

          <br/>
          
          <div className="grid" style={{gridTemplateColumns:'1fr auto', alignItems:'center'}}>
            <div className="subtitle">Gameweeks Point Deduction</div>
            <div className="budget-amount" style={{color: liveTransferPointsDeduction > 0 ? 'var(--color-red)' : 'var(--muted)'}}>
              {liveTransferPointsDeduction > 0 ? `-${liveTransferPointsDeduction}` : '0'}
            </div>
          </div>

        <br/>

          <label className="subtitle label" htmlFor="captain">Captain</label>
          <select 
            id="captain" 
            className={`input ${controlsDisabled ? 'input--disabled' : ''}`} 
            value={captainId} 
            onChange={e=>setCaptainId(e.target.value)} 
            disabled={controlsDisabled}
          >
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
            <button 
              disabled={hardDisabled || !canSave} 
              className={`btn ${(hardDisabled || !canSave) ? 'btn--disabled' : ''}`}
              onClick={saveTeam}
            >
              Save Team
            </button>
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
