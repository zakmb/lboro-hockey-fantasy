import React, { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { TEAM_LABEL } from '../types'
import type { Player } from '../types'
import { useInjuries } from '../contexts/InjuriesContext'

type SortField = 'name' | 'team' | 'position' | 'pointsTotal' | 'prevGwPoints' | 'goals' | 'cleanSheets' | 'greenCards' | 'yellow5Cards' | 'yellow10Cards' | 'redCards' | 'manOfTheMatchCount' | 'price'
type SortDirection = 'asc' | 'desc'

export default function PlayerStats() {
	const [players, setPlayers] = useState<Player[]>([])
	const [loading, setLoading] = useState(true)
	const [sortField, setSortField] = useState<SortField>('pointsTotal')
	const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
	const { isInjured } = useInjuries()

	useEffect(() => {
		const unsub = onSnapshot(collection(db, 'players'), (snapshot) => {
			const playersList: Player[] = []
			snapshot.forEach((doc) => {
				const data = doc.data() as Player
				playersList.push({
					...data,
					id: doc.id
				})
			})
			setPlayers(playersList)
			setLoading(false)
		})

		return unsub
	}, [])

	function handleSort(field: SortField) {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
		} else {
			setSortField(field)
			setSortDirection('desc')
		}
	}

	function getSortedPlayers(): Player[] {
		return [...players].sort((a, b) => {
			let aValue: any = a[sortField]
			let bValue: any = b[sortField]

			if (typeof aValue === 'number' && typeof bValue === 'number') {
				return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
			}

			if (sortField === 'position') {
				const positionOrder = { 'GK': 1, 'DEF': 2, 'MID': 3, 'FWD': 4 }
				const aPos = positionOrder[aValue as keyof typeof positionOrder] || 0
				const bPos = positionOrder[bValue as keyof typeof positionOrder] || 0
				return sortDirection === 'asc' ? aPos - bPos : bPos - aPos
			}

			if (typeof aValue === 'string' && typeof bValue === 'string') {
				aValue = aValue.toLowerCase()
				bValue = bValue.toLowerCase()
				if (sortDirection === 'asc') {
					return aValue.localeCompare(bValue)
				} else {
					return bValue.localeCompare(aValue)
				}
			}

			return 0
		})
	}

	function getSortIcon(field: SortField) {
		if (sortField !== field) return '↕️'
		return sortDirection === 'asc' ? '↑' : '↓'
	}

	function getPositionStyle(position: string) {
		const styles = {
			GK: { bg: '#fef3c7', color: '#92400e' },
			DEF: { bg: '#dbeafe', color: '#1e40af' },
			MID: { bg: '#d1fae5', color: '#065f46' },
			FWD: { bg: '#fce7f3', color: '#be185d' }
		}
		return styles[position as keyof typeof styles] || styles.FWD
	}

	if (loading) {
		return (
			<div className="card">
				<h2>Loading Player Stats...</h2>
			</div>
		)
	}

	const sortedPlayers = getSortedPlayers()

	return (
		<div className="card">
			<h2>Player Statistics</h2>
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
							<th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
								<button 
									onClick={() => handleSort('name')}
									style={{
										background: 'none',
										border: 'none',
										color: 'white',
										cursor: 'pointer',
										fontWeight: '600',
										display: 'flex',
										alignItems: 'center',
										gap: '4px'
									}}
								>
									Name {getSortIcon('name')}
								</button>
							</th>
							<th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
								<button 
									onClick={() => handleSort('team')}
									style={{
										background: 'none',
										border: 'none',
										color: 'white',
										cursor: 'pointer',
										fontWeight: '600',
										display: 'flex',
										alignItems: 'center',
										gap: '4px'
									}}
								>
									Team {getSortIcon('team')}
								</button>
							</th>
							<th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
								<button 
									onClick={() => handleSort('position')}
									style={{
										background: 'none',
										border: 'none',
										color: 'white',
										cursor: 'pointer',
										fontWeight: '600',
										display: 'flex',
										alignItems: 'center',
										gap: '4px'
									}}
								>
									Pos {getSortIcon('position')}
								</button>
							</th>
							<th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
								<button 
									onClick={() => handleSort('pointsTotal')}
									style={{
										background: 'none',
										border: 'none',
										color: 'white',
										cursor: 'pointer',
										fontWeight: '600',
										display: 'flex',
										alignItems: 'center',
										gap: '4px'
									}}
								>
									Total Pts {getSortIcon('pointsTotal')}
								</button>
							</th>
							<th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
								<button 
									onClick={() => handleSort('prevGwPoints')}
									style={{
										background: 'none',
										border: 'none',
										color: 'white',
										cursor: 'pointer',
										fontWeight: '600',
										display: 'flex',
										alignItems: 'center',
										gap: '4px'
									}}
								>
									Prev GW {getSortIcon('prevGwPoints')}
								</button>
							</th>
							<th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
								<button 
									onClick={() => handleSort('goals')}
									style={{
										background: 'none',
										border: 'none',
										color: 'white',
										cursor: 'pointer',
										fontWeight: '600',
										display: 'flex',
										alignItems: 'center',
										gap: '4px'
									}}
								>
									Goals {getSortIcon('goals')}
								</button>
							</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
                                <button 
                                    onClick={() => handleSort('manOfTheMatchCount')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    MoM {getSortIcon('manOfTheMatchCount')}
                                </button>
                            </th>
							<th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
								<button 
									onClick={() => handleSort('cleanSheets')}
									style={{
										background: 'none',
										border: 'none',
										color: 'white',
										cursor: 'pointer',
										fontWeight: '600',
										display: 'flex',
										alignItems: 'center',
										gap: '4px'
									}}
								>
									Clean Sheets {getSortIcon('cleanSheets')}
								</button>
							</th>
							<th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
								<button 
									onClick={() => handleSort('greenCards')}
									style={{
										background: 'none',
										border: 'none',
										color: 'white',
										cursor: 'pointer',
										fontWeight: '600',
										display: 'flex',
										alignItems: 'center',
										gap: '4px'
									}}
								>
									Green {getSortIcon('greenCards')}
								</button>
							</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
                                <button 
                                    onClick={() => handleSort('yellow5Cards')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    5m yellow {getSortIcon('yellow5Cards')}
                                </button>
                            </th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
                                <button 
                                    onClick={() => handleSort('yellow10Cards')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    10m yellow {getSortIcon('yellow10Cards')}
                                </button>
                            </th>
							<th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
								<button 
									onClick={() => handleSort('redCards')}
									style={{
										background: 'none',
										border: 'none',
										color: 'white',
										cursor: 'pointer',
										fontWeight: '600',
										display: 'flex',
										alignItems: 'center',
										gap: '4px'
									}}
								>
									Red {getSortIcon('redCards')}
								</button>
							</th>
							<th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
								<button 
									onClick={() => handleSort('price')}
									style={{
										background: 'none',
										border: 'none',
										color: 'white',
										cursor: 'pointer',
										fontWeight: '600',
										display: 'flex',
										alignItems: 'center',
										gap: '4px'
									}}
								>
									Price {getSortIcon('price')}
								</button>
							</th>
						</tr>
					</thead>
					<tbody>
						{sortedPlayers.map((player, index) => (
							<tr key={player.id} style={{
								background: index % 2 === 0 ? '#f9fafb' : 'white',
								borderBottom: '1px solid #e5e7eb'
							}}>
								<td style={{ padding: '12px', fontWeight: '600' }}>
									{player.name}{isInjured(player.id) ? ' 🚑' : ''}
								</td>
								<td style={{ padding: '12px', textAlign: 'center' }}>
									{TEAM_LABEL[player.team]}
								</td>
								<td style={{ padding: '12px', textAlign: 'center' }}>
									<span style={{
										padding: '4px 8px',
										borderRadius: '12px',
										fontSize: '11px',
										fontWeight: '600',
										...getPositionStyle(player.position)
									}}>
										{player.position}
									</span>
								</td>
								<td style={{ 
									padding: '12px', 
									textAlign: 'center',
									fontWeight: '600',
									fontSize: '16px',
									color: 'var(--primary)'
								}}>
									{player.pointsTotal || 0}
								</td>
								<td style={{ 
									padding: '12px', 
									textAlign: 'center',
									fontWeight: '500'
								}}>
									{player.prevGwPoints || 0}
								</td>
								<td style={{ 
									padding: '12px', 
									textAlign: 'center',
									fontWeight: '600',
									color: '#059669'
								}}>
									{player.goals || 0}
								</td>
                                <td style={{ 
                                    padding: '12px', 
                                    textAlign: 'center',
                                    fontWeight: '600',
                                    color: '#0ea5e9'
                                }}>
                                    {player.manOfTheMatchCount || 0}
                                </td>
								<td style={{ 
									padding: '12px', 
									textAlign: 'center',
									fontWeight: '600',
									color: '#7c3aed'
								}}>
									{player.cleanSheets || 0}
								</td>
								<td style={{ 
									padding: '12px', 
									textAlign: 'center',
									fontWeight: '600',
									color: '#059669'
								}}>
									{player.greenCards || 0}
								</td>
                                <td style={{ 
                                    padding: '12px', 
                                    textAlign: 'center',
                                    fontWeight: '600',
                                    color: '#d97706'
                                }}>
                                    {player.yellow5Cards || 0}
                                </td>
                                <td style={{ 
                                    padding: '12px', 
                                    textAlign: 'center',
                                    fontWeight: '600',
                                    color: '#b45309'
                                }}>
                                    {player.yellow10Cards || 0}
                                </td>
								<td style={{ 
									padding: '12px', 
									textAlign: 'center',
									fontWeight: '600',
									color: '#dc2626'
								}}>
									{player.redCards || 0}
								</td>
								<td style={{ 
									padding: '12px', 
									textAlign: 'center',
									fontWeight: '600',
									color: '#059669'
								}}>
									£{player.price}M
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
