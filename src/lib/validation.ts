/**
 * Validation utilities for form inputs and data
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validates an email address
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = []
  
  if (!email) {
    errors.push('Email is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates a password
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = []
  
  if (!password) {
    errors.push('Password is required')
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates a display name
 */
export function validateDisplayName(displayName: string): ValidationResult {
  const errors: string[] = []
  
  if (!displayName) {
    errors.push('Display name is required')
  } else if (displayName.length < 2) {
    errors.push('Display name must be at least 2 characters long')
  } else if (displayName.length > 50) {
    errors.push('Display name must be less than 50 characters')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates a player name
 */
export function validatePlayerName(name: string): ValidationResult {
  const errors: string[] = []
  
  if (!name) {
    errors.push('Player name is required')
  } else if (name.length < 2) {
    errors.push('Player name must be at least 2 characters long')
  } else if (name.length > 100) {
    errors.push('Player name must be less than 100 characters')
  } else if (!/^[a-zA-Z\s\-'\.]+$/.test(name)) {
    errors.push('Player name can only contain letters, spaces, hyphens, apostrophes, and periods')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates a player price
 */
export function validatePlayerPrice(price: number): ValidationResult {
  const errors: string[] = []
  
  if (price === undefined || price === null) {
    errors.push('Player price is required')
  } else if (price < 3.5) {
    errors.push('Player price must be at least £3.5M')
  } else if (price > 15) {
    errors.push('Player price must be at most £15M')
  } else if (Math.abs(price * 10 - Math.round(price * 10)) > 0.001) {
    errors.push('Player price must be in increments of £0.1M')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates team budget constraints
 */
export function validateTeamBudget(selectedPlayers: any[], budget: number): ValidationResult {
  const errors: string[] = []
  
  if (selectedPlayers.length !== 11) {
    errors.push('Team must have exactly 11 players')
  }
  
  const totalCost = selectedPlayers.reduce((sum, player) => sum + (player?.price || 0), 0)
  if (totalCost > budget) {
    errors.push(`Team cost (£${totalCost.toFixed(1)}M) exceeds budget (£${budget}M)`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates team composition
 */
export function validateTeamComposition(selectedPlayers: any[]): ValidationResult {
  const errors: string[] = []
  
  if (selectedPlayers.length !== 11) {
    errors.push('Team must have exactly 11 players')
    return { isValid: false, errors }
  }
  
  const positions = selectedPlayers.reduce((acc, player) => {
    acc[player.position] = (acc[player.position] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  if (positions.GK !== 1) {
    errors.push('Team must have exactly 1 goalkeeper')
  }
  
  if (positions.DEF < 3 || positions.DEF > 5) {
    errors.push('Team must have 3-5 defenders')
  }
  
  if (positions.MID < 3 || positions.MID > 5) {
    errors.push('Team must have 3-5 midfielders')
  }
  
  if (positions.FWD < 1 || positions.FWD > 3) {
    errors.push('Team must have 1-3 forwards')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Combines multiple validation results
 */
export function combineValidations(...validations: ValidationResult[]): ValidationResult {
  const allErrors = validations.flatMap(v => v.errors)
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}
