import React, { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { TEAM_LABEL, TeamCode } from '../types'

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

interface PlayerData {
	id: string
	name: string
	team: TeamCode
	position: string
	pointsTotal: number
	prevGwPoints: number
	price: number
}

export default function LeagueTable() {
	const { user } = useAuth()
	const [teams, setTeams] = useState<TeamData[]>([])
	const [players, setPlayers] = useState<PlayerData[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		// Fetch all teams
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
			
			// Sort by total points (descending)
			teamsList.sort((a, b) => (b.teamPointsTotal || 0) - (a.teamPointsTotal || 0))
			setTeams(teamsList)
		})

		// Fetch all players for team details
		const unsubPlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
			const playersList: PlayerData[] = []
			snapshot.forEach((doc) => {
				const data = doc.data() as PlayerData
				playersList.push({
					...data,
					id: doc.id
				})
			})
			setPlayers(playersList)
			setLoading(false)
		})

		return () => {
			unsubTeams()
			unsubPlayers()
		}
	}, [])

	function getTeamName(team: TeamData): string {
		// Use the display name from the team data, fallback to "Team {userId}"
		return team.displayName || `Team ${team.userId.slice(-4)}`
	}

	if (loading) {
		return (
			<div className="card">
				<h2>Loading League Table...</h2>
			</div>
		)
	}

	return (
		<div className="card">
			<h2>League Table</h2>
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
							<th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>Total Points</th>
							<th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>Prev GW</th>
						</tr>
					</thead>
					<tbody>
						{teams.map((team, index) => {
							return (
								<tr key={team.id} style={{
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
											{getTeamName(team)}
										</div>
									</td>
									<td style={{ 
										padding: '12px', 
										textAlign: 'center',
										fontWeight: '600',
										fontSize: '18px',
										color: 'var(--primary)'
									}}>
										{team.teamPointsTotal || 0}
									</td>
									<td style={{ 
										padding: '12px', 
										textAlign: 'center',
										fontWeight: '500'
									}}>
										{team.teamPrevGwPoints || 0}
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
