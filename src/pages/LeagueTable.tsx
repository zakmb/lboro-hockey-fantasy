


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
  monthlyPoints?: Record<string, number>
  gameweekPoints?: Record<string, number>
}

interface GameweekWinner {
  gameweek: number
  points: number
  teamNames: string[]
}

export default function LeagueTable() {
  const [teams, setTeams] = useState<TeamData[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState<string>('all')

  useEffect(() => {
    const unsubTeams = onSnapshot(
      collection(db, 'teams'),
      (snapshot) => {
        const teamsList: TeamData[] = []

        snapshot.forEach((teamDocument) => {
          const data = teamDocument.data() as TeamData

          if (data.players && data.players.length === 11) {
            teamsList.push({
              ...data,
              id: teamDocument.id,
              displayName:
                data.displayName?.trim() ||
                `Team ${
                  typeof data.userId === 'string' && data.userId.length > 0
                    ? data.userId.slice(-4)
                    : teamDocument.id.slice(-4)
                }`,
              teamPointsTotal: data.teamPointsTotal || 0,
              teamPrevGwPoints: data.teamPrevGwPoints || 0,
              teamPointsGw: data.teamPointsGw || 0,
              monthlyPoints: data.monthlyPoints || {},
              gameweekPoints: data.gameweekPoints || {}
            })
          }
        })

        teamsList.sort(
          (a, b) => (b.teamPointsTotal || 0) - (a.teamPointsTotal || 0)
        )

        setTeams(teamsList)
        setLoading(false)
      },
      (error) => {
        console.error('Failed to load league table:', error)
        setLoading(false)
      }
    )

    return () => {
      unsubTeams()
    }
  }, [])

  function getTeamName(team: TeamData): string {
    if (team.displayName?.trim()) {
      return team.displayName.trim()
    }

    const fallbackId =
      typeof team.userId === 'string' && team.userId.length > 0
        ? team.userId
        : team.id

    return `Team ${fallbackId.slice(-4)}`
  }

  const monthsAvailable = useMemo(() => {
    const availableMonths = new Set<string>()

    teams.forEach((team) => {
      Object.keys(team.monthlyPoints || {}).forEach((monthKey) => {
        availableMonths.add(monthKey)
      })
    })

    return Array.from(availableMonths).sort((a, b) => a.localeCompare(b))
  }, [teams])

  const rows = useMemo(() => {
    if (month === 'all') {
      return teams.map((team) => ({
        id: team.id,
        name: getTeamName(team),
        total: team.teamPointsTotal || 0,
        prev: team.teamPrevGwPoints || 0
      }))
    }

    return teams
      .map((team) => ({
        id: team.id,
        name: getTeamName(team),
        total: Number(team.monthlyPoints?.[month]) || 0,
        prev: team.teamPrevGwPoints || 0
      }))
      .sort((a, b) => b.total - a.total)
  }, [teams, month])

  const gameweekWinners = useMemo<GameweekWinner[]>(() => {
    const gameweeks = new Set<number>()

    teams.forEach((team) => {
      Object.keys(team.gameweekPoints || {}).forEach((gameweekKey) => {
        const gameweek = Number(gameweekKey)

        if (Number.isInteger(gameweek) && gameweek > 0) {
          gameweeks.add(gameweek)
        }
      })
    })

    return Array.from(gameweeks)
      .sort((a, b) => b - a)
      .map((gameweek) => {
        const scores = teams
          .map((team) => {
            const points = Number(
              team.gameweekPoints?.[String(gameweek)]
            )

            return {
              teamName: getTeamName(team),
              points
            }
          })
          .filter(({ points }) => Number.isFinite(points))

        if (scores.length === 0) {
          return null
        }

        const highestPoints = Math.max(
          ...scores.map(({ points }) => points)
        )

        return {
          gameweek,
          points: highestPoints,
          teamNames: scores
            .filter(({ points }) => points === highestPoints)
            .map(({ teamName }) => teamName)
            .sort((a, b) => a.localeCompare(b))
        }
      })
      .filter(
        (winner): winner is GameweekWinner => winner !== null
      )
  }, [teams])

  if (loading) {
    return (
      <div className="card">
        <h2>Loading League Table...</h2>
      </div>
    )
  }

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h2>Gameweek Top Teams</h2>
            <p className="subtitle" style={{ marginTop: 4 }}>
              Highest fantasy score in each finalized gameweek
            </p>
          </div>
        </div>

        {gameweekWinners.length === 0 ? (
          <p className="subtitle" style={{ marginTop: 16 }}>
            No gameweek results have been recorded yet.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: '16px'
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    fontWeight: '600'
                  }}
                >
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e7eb'
                    }}
                  >
                    Gameweek
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e7eb'
                    }}
                  >
                    Top Team
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '2px solid #e5e7eb'
                    }}
                  >
                    Points
                  </th>
                </tr>
              </thead>

              <tbody>
                {gameweekWinners.map((winner, index) => (
                  <tr
                    key={winner.gameweek}
                    style={{
                      background:
                        index % 2 === 0 ? '#f9fafb' : 'white',
                      borderBottom: '1px solid #e5e7eb'
                    }}
                  >
                    <td
                      style={{
                        padding: '12px',
                        fontWeight: '700',
                        color: 'var(--primary)'
                      }}
                    >
                      GW {winner.gameweek}
                    </td>

                    <td style={{ padding: '12px', fontWeight: '600' }}>
                      {winner.teamNames.join(' / ')}
                      {winner.teamNames.length > 1 && (
                        <span
                          className="subtitle"
                          style={{ marginLeft: 8 }}
                        >
                          (tie)
                        </span>
                      )}
                    </td>

                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '700',
                        fontSize: '18px',
                        color: 'var(--primary)'
                      }}
                    >
                      {winner.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>League Table</h2>

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center'
            }}
          >
            <label className="subtitle" htmlFor="month">
              View
            </label>

            <select
              id="month"
              className="input"
              style={{ maxWidth: 220 }}
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            >
              <option value="all">All-time total</option>
              {monthsAvailable.map((availableMonth) => (
                <option key={availableMonth} value={availableMonth}>
                  {availableMonth}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '16px'
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'var(--primary)',
                  color: 'white',
                  fontWeight: '600'
                }}
              >
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '2px solid #e5e7eb'
                  }}
                >
                  Pos
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '2px solid #e5e7eb'
                  }}
                >
                  Team
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    borderBottom: '2px solid #e5e7eb'
                  }}
                >
                  {month === 'all'
                    ? 'Total Points'
                    : `${month} Points`}
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    borderBottom: '2px solid #e5e7eb'
                  }}
                >
                  Prev GW
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  style={{
                    background:
                      index % 2 === 0 ? '#f9fafb' : 'white',
                    borderBottom: '1px solid #e5e7eb'
                  }}
                >
                  <td
                    style={{
                      padding: '12px',
                      fontWeight: '600',
                      color:
                        index < 3
                          ? '#059669'
                          : index < 6
                            ? '#d97706'
                            : '#6b7280'
                    }}
                  >
                    {index + 1}
                  </td>

                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '600' }}>
                      {row.name}
                    </div>
                  </td>

                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: '18px',
                      color: 'var(--primary)'
                    }}
                  >
                    {row.total}
                  </td>

                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '500'
                    }}
                  >
                    {row.prev}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
