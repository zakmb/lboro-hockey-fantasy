export type TeamCode = 'Men1' | 'Men2' | 'Men3' | 'Men4' | 'Men5'
export type Position = 'GK' | 'DEF' | 'MID' | 'FWD'

export const TEAM_LABEL: Record<TeamCode, string> = {
	Men1: "Men's 1s",
	Men2: "Men's 2s",
	Men3: "Men's 3s",
	Men4: "Men's 4s",
	Men5: "Men's 5s"
}

export interface Player {
	id: string
	name: string
	team: TeamCode
	position: Position
	price: number
	pointsTotal: number
	pointsGw: number
	prevGwPoints: number
	goals: number
	assists: number
	cleanSheets: number
	greenCards: number
	yellowCards: number
	redCards: number
	createdAt: number
	updatedAt: number
}

export interface UserProfile {
	id: string
	email: string
	displayName: string
	isAdmin?: boolean
}

export interface FantasyTeam {
	id: string
	userId: string
	players: string[]
	budget: number
	createdAt: number
	updatedAt: number
}

export interface LeagueSettings {
	transfersEnabled: boolean
	minPerTeams: Record<TeamCode, number>
    //TODO: Remove references to budgetStart
	budgetStart: number
}

export interface League {
	id: 'global'
	name: string
	settings: LeagueSettings
}
