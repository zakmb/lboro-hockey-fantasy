// Shared utility functions to reduce code duplication

export function handleFormError(error: unknown, setError: (error: string) => void, defaultMessage: string) {
  console.error('Form error:', error)
  setError(defaultMessage)
}

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
