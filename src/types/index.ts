export interface Player {
  id: string;
  name: string;
  position: PlayerPosition;
  team: string;
  price: number;
  points: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  form: number;
  selectedBy: number;
  imageUrl?: string;
}

export type PlayerPosition = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';

export interface FantasyTeam {
  id: string;
  userId: string;
  name: string;
  players: {
    goalkeeper: Player[];
    defenders: Player[];
    midfielders: Player[];
    forwards: Player[];
  };
  captain: Player;
  viceCaptain: Player;
  //TODO: Remove references to formation
  formation: string;
  totalValue: number;
  bank: number;
  totalPoints: number;
  gameweekPoints: number;
  rank: number;
  transfers: number;
  transfersRemaining: number;
}

export interface League {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  members: string[];
  isPrivate: boolean;
  joinCode?: string;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  teamId?: string;
  leagues: string[];
  totalPoints: number;
  rank: number;
}

export interface Gameweek {
  id: string;
  number: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isFinished: boolean;
  fixtures: Fixture[];
}

export interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  date: Date;
  isFinished: boolean;
  playerStats: PlayerFixtureStats[];
}

export interface PlayerFixtureStats {
  playerId: string;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  yellowCard: boolean;
  redCard: boolean;
  bonusPoints: number;
  totalPoints: number;
}

export interface Transfer {
  id: string;
  teamId: string;
  playerOut: Player;
  playerIn: Player;
  gameweek: number;
  timestamp: Date;
  cost: number;
}

