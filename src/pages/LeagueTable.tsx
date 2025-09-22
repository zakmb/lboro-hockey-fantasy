import React, { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import { collection, onSnapshot } from 'firebase/firestore'

interface TeamData {
	id: string
	userId: string
	displayName: string
	players: string[]
	captainId: string
	teamPointsTotal: number
	teamPrevGwPoints: number
	teamPointsGw: number
	updatedAt: number
}


export default function LeagueTable() {
	const [teams, setTeams] = useState<TeamData[]>([])
	const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState<string>('all')

	useEffect(() => {
		const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
			const teamsList: TeamData[] = []
			snapshot.forEach((doc) => {
				const data = doc.data() as TeamData
				if (data.players && data.players.length === 11) {
					teamsList.push({
						...data,
						id: doc.id,
						displayName: data.displayName || `Team ${data.userId.slice(-4)}`,
						teamPointsTotal: data.teamPointsTotal || 0,
						teamPrevGwPoints: data.teamPrevGwPoints || 0,
						teamPointsGw: data.teamPointsGw || 0
					})
				}
			})
			
			teamsList.sort((a, b) => (b.teamPointsTotal || 0) - (a.teamPointsTotal || 0))
			setTeams(teamsList)
		})

		setLoading(false)

		return () => {
			unsubTeams()
		}
	}, [])

	function getTeamName(team: TeamData): string {
		return team.displayName || `Team ${team.userId.slice(-4)}`
	}

  const monthsAvailable = useMemo(()=>{
    const set = new Set<string>()
    teams.forEach(t=>{
      const mp: any = (t as any).monthlyPoints || {}
      Object.keys(mp).forEach(k=> set.add(k))
    })
    const arr = Array.from(set)
    arr.sort((a,b)=> a.localeCompare(b))
    return arr
  },[teams])

  const rows = useMemo(()=>{
    if (month==='all'){
      return teams.map(t=>({
        id: t.id,
        name: getTeamName(t),
        total: t.teamPointsTotal || 0,
        prev: t.teamPrevGwPoints || 0
      }))
    }
    return teams.map(t=>{
      const mp: any = (t as any).monthlyPoints || {}
      return {
        id: t.id,
        name: getTeamName(t),
        total: Number(mp[month]) || 0,
        prev: t.teamPrevGwPoints || 0
      }
    }).sort((a,b)=> b.total - a.total)
  },[teams, month])

	if (loading) {
		return (
			<div className="card">
				<h2>Loading League Table...</h2>
			</div>
		)
	}

	return (
		<div className="card">
			<div className="card-header">
				<h2>League Table</h2>
				<div style={{display:'flex', gap:8, alignItems:'center'}}>
					<label className="subtitle" htmlFor="month">View</label>
					<select id="month" className="input" style={{maxWidth:220}} value={month} onChange={e=> setMonth(e.target.value)}>
						<option value="all">All-time total</option>
						{monthsAvailable.map(m=> <option key={m} value={m}>{m}</option>)}
					</select>
				</div>
			</div>
			<div style={{ overflowX: 'auto' }}>
				<table style={{
					width: '100%',
					borderCollapse: 'collapse',
					marginTop: '16px'
				}}>
					<thead>
						<tr style={{
							background: 'var(--primary)',
							color: 'white',
							fontWeight: '600'
						}}>
							<th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Pos</th>
							<th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Team</th>
							<th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>{month==='all' ? 'Total Points' : `${month} Points`}</th>
							<th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>Prev GW</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row, index) => {
							return (
								<tr key={row.id} style={{
									background: index % 2 === 0 ? '#f9fafb' : 'white',
									borderBottom: '1px solid #e5e7eb'
								}}>
									<td style={{ 
										padding: '12px', 
										fontWeight: '600',
										color: index < 3 ? '#059669' : index < 6 ? '#d97706' : '#6b7280'
									}}>
										{index + 1}
									</td>
									<td style={{ padding: '12px' }}>
										<div style={{ fontWeight: '600' }}>
											{row.name}
										</div>
									</td>
									<td style={{ 
										padding: '12px', 
										textAlign: 'center',
										fontWeight: '600',
										fontSize: '18px',
										color: 'var(--primary)'
									}}>
										{row.total}
									</td>
									<td style={{ 
										padding: '12px', 
										textAlign: 'center',
										fontWeight: '500'
									}}>
										{row.prev}
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
		</div>
	)
}
