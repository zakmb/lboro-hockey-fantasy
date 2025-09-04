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
	const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null)
	const [showPopup, setShowPopup] = useState(false)

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

	function getTeamPlayers(teamPlayers: string[]): PlayerData[] {
		return teamPlayers.map(playerId => 
			players.find(p => p.id === playerId)
		).filter(Boolean) as PlayerData[]
	}

	function handleTeamClick(team: TeamData) {
		setSelectedTeam(team)
		setShowPopup(true)
	}

	function closePopup() {
		setShowPopup(false)
		setSelectedTeam(null)
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
										<div 
											style={{ 
												fontWeight: '600',
												cursor: 'pointer',
												padding: '4px 8px',
												borderRadius: '6px',
												transition: 'background-color 0.2s ease'
											}}
											onClick={() => handleTeamClick(team)}
											onMouseEnter={(e) => {
												e.currentTarget.style.backgroundColor = '#f3f4f6'
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.backgroundColor = 'transparent'
											}}
										>
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

			{/* Team Details Popup */}
			{showPopup && selectedTeam && (
				<div style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'rgba(0, 0, 0, 0.5)',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					zIndex: 1000
				}} onClick={closePopup}>
					<div style={{
						background: 'white',
						borderRadius: '12px',
						padding: '24px',
						maxWidth: '600px',
						maxHeight: '80vh',
						overflow: 'auto',
						boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
					}} onClick={(e) => e.stopPropagation()}>
						<div style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: '20px'
						}}>
							<h2 style={{ margin: 0, color: 'var(--primary)' }}>{getTeamName(selectedTeam)}</h2>
							<button 
								onClick={closePopup}
								style={{
									background: 'none',
									border: 'none',
									fontSize: '24px',
									cursor: 'pointer',
									color: '#6b7280',
									padding: '4px',
									borderRadius: '4px',
									transition: 'background-color 0.2s ease'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = '#f3f4f6'
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = 'transparent'
								}}
							>
								×
							</button>
						</div>

						{/* Team Formation Display */}
						<div style={{ marginBottom: '20px' }}>
							<div style={{ display: 'grid', gap: '12px' }}>
								{/* Forwards */}
								<div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
									{getTeamPlayers(selectedTeam.players)
										.filter(p => p.position === 'FWD')
										.map(player => (
											<div key={player.id} style={{
												background: '#fce7f3',
												border: '2px solid #be185d',
												borderRadius: '8px',
												padding: '12px',
												minWidth: '120px',
												textAlign: 'center',
												position: 'relative'
											}}>
												{selectedTeam.captainId === player.id && (
													<div style={{
														position: 'absolute',
														top: '4px',
														right: '4px',
														background: 'var(--primary)',
														color: 'white',
														borderRadius: '50%',
														width: '20px',
														height: '20px',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														fontSize: '12px',
														fontWeight: 'bold'
													}}>
														C
													</div>
												)}
												<div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
													{player.name}
												</div>
												<div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
													{player.position} • {TEAM_LABEL[player.team]}
												</div>
												<div style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>
													£{player.price}M
												</div>
												<div style={{ fontSize: '11px', color: '#6b7280' }}>
													Total: {player.pointsTotal || 0}
												</div>
												<div style={{ fontSize: '11px', color: '#6b7280' }}>
													Prev GW: {player.prevGwPoints || 0}
												</div>
											</div>
										))}
								</div>

								{/* Midfielders */}
								<div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
									{getTeamPlayers(selectedTeam.players)
										.filter(p => p.position === 'MID')
										.map(player => (
											<div key={player.id} style={{
												background: '#d1fae5',
												border: '2px solid #065f46',
												borderRadius: '8px',
												padding: '12px',
												minWidth: '120px',
												textAlign: 'center',
												position: 'relative'
											}}>
												{selectedTeam.captainId === player.id && (
													<div style={{
														position: 'absolute',
														top: '4px',
														right: '4px',
														background: 'var(--primary)',
														color: 'white',
														borderRadius: '50%',
														width: '20px',
														height: '20px',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														fontSize: '12px',
														fontWeight: 'bold'
													}}>
														C
													</div>
												)}
												<div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
													{player.name}
												</div>
												<div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
													{player.position} • {TEAM_LABEL[player.team]}
												</div>
												<div style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>
													£{player.price}M
												</div>
												<div style={{ fontSize: '11px', color: '#6b7280' }}>
													Total: {player.pointsTotal || 0}
												</div>
												<div style={{ fontSize: '11px', color: '#6b7280' }}>
													Prev GW: {player.prevGwPoints || 0}
												</div>
											</div>
										))}
								</div>

								{/* Defenders */}
								<div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
									{getTeamPlayers(selectedTeam.players)
										.filter(p => p.position === 'DEF')
										.map(player => (
											<div key={player.id} style={{
												background: '#dbeafe',
												border: '2px solid #1e40af',
												borderRadius: '8px',
												padding: '12px',
												minWidth: '120px',
												textAlign: 'center',
												position: 'relative'
											}}>
												{selectedTeam.captainId === player.id && (
													<div style={{
														position: 'absolute',
														top: '4px',
														right: '4px',
														background: 'var(--primary)',
														color: 'white',
														borderRadius: '50%',
														width: '20px',
														height: '20px',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														fontSize: '12px',
														fontWeight: 'bold'
													}}>
														C
													</div>
												)}
												<div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
													{player.name}
												</div>
												<div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
													{player.position} • {TEAM_LABEL[player.team]}
												</div>
												<div style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>
													£{player.price}M
												</div>
												<div style={{ fontSize: '11px', color: '#6b7280' }}>
													Total: {player.pointsTotal || 0}
												</div>
												<div style={{ fontSize: '11px', color: '#6b7280' }}>
													Prev GW: {player.prevGwPoints || 0}
												</div>
											</div>
										))}
								</div>

								{/* Goalkeeper */}
								<div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
									{getTeamPlayers(selectedTeam.players)
										.filter(p => p.position === 'GK')
										.map(player => (
											<div key={player.id} style={{
												background: '#fef3c7',
												border: '2px solid #92400e',
												borderRadius: '8px',
												padding: '12px',
												minWidth: '120px',
												textAlign: 'center',
												position: 'relative'
											}}>
												{selectedTeam.captainId === player.id && (
													<div style={{
														position: 'absolute',
														top: '4px',
														right: '4px',
														background: 'var(--primary)',
														color: 'white',
														borderRadius: '50%',
														width: '20px',
														height: '20px',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														fontSize: '12px',
														fontWeight: 'bold'
													}}>
														C
													</div>
												)}
												<div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
													{player.name}
												</div>
												<div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
													{player.position} • {TEAM_LABEL[player.team]}
												</div>
												<div style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>
													£{player.price}M
												</div>
												<div style={{ fontSize: '11px', color: '#6b7280' }}>
													Total: {player.pointsTotal || 0}
												</div>
												<div style={{ fontSize: '11px', color: '#6b7280' }}>
													Prev GW: {player.prevGwPoints || 0}
												</div>
											</div>
										))}
								</div>
							</div>
						</div>

						{/* Team Summary */}
						<div style={{
							background: '#f9fafb',
							borderRadius: '8px',
							padding: '16px',
							border: '1px solid #e5e7eb'
						}}>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
								<div>
									<div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Points</div>
									<div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--primary)' }}>
										{selectedTeam.teamPointsTotal || 0}
									</div>
								</div>
								<div>
									<div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Previous Gameweek</div>
									<div style={{ fontSize: '20px', fontWeight: '600', color: '#059669' }}>
										{selectedTeam.teamPrevGwPoints || 0}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
