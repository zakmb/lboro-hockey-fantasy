// Shared utility functions to reduce code duplication

/**
 * Handles form errors by logging them and setting a user-friendly error message
 * @param error - The error object or message
 * @param setError - Function to set the error state
 * @param defaultMessage - Default error message to show to user
 */
export function handleFormError(error: unknown, setError: (error: string) => void, defaultMessage: string) {
  console.error('Form error:', error)
  setError(defaultMessage)
}

/**
 * Creates team update data for gameweek finalization
 * Handles wildcard usage and free transfer increments
 * @param data - Current team data
 * @returns Object with fields to update
 */
export function createTeamUpdateData(data: any) {
  const updateData: any = {}
  
  if (data?.wildcardPending) {
    updateData.wildcardUsed = true
    updateData.wildcardPending = false
  } 

  const currentFreeTransfers = data?.freeTransfers || 0
  updateData.freeTransfers = Math.min(currentFreeTransfers + 1, 3) // Increase by 1, cap at 3
  return updateData
}
