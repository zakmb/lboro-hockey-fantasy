import { describe, it, expect } from 'vitest'
import { createTeamUpdateData } from '../utils'

describe('createTeamUpdateData', () => {
  it('should create update data with correct structure', () => {
    const mockTeam = {
      players: ['player1', 'player2', 'player3'],
      captainId: 'player1',
      bank: 50.5,
      budget: 100,
      tripleCaptainUsed: false,
      tripleCaptainPending: false,
      freeTransfers: 1,
      wildcardUsed: false,
      wildcardPending: false,
      transferPointsDeduction: 0,
      teamPointsTotal: 100,
      teamPrevGwPoints: 10,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    const result = createTeamUpdateData(mockTeam)

    expect(result).toHaveProperty('freeTransfers')
    expect(result.freeTransfers).toBe(2) // Should increment by 1, cap at 3
    expect(result).not.toHaveProperty('createdAt')
  })

  it('should handle team with minimal data', () => {
    const minimalTeam = {
      players: [],
      captainId: '',
      bank: 100,
      budget: 100,
      tripleCaptainUsed: false,
      tripleCaptainPending: false,
      freeTransfers: 1,
      wildcardUsed: false,
      wildcardPending: false,
      transferPointsDeduction: 0,
      teamPointsTotal: 0,
      teamPrevGwPoints: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    const result = createTeamUpdateData(minimalTeam)

    expect(result).toHaveProperty('freeTransfers')
    expect(result.freeTransfers).toBe(2) // Should increment by 1, cap at 3
  })
})
