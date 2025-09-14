import React, { memo } from 'react'
import type { Player, Position } from '../types'

interface MemoizedPlayerCardProps {
  player: Player
  isSelected: boolean
  isInjured: boolean
  isCaptain: boolean
  onSelect: (playerId: string) => void
  onCaptainSelect: (playerId: string) => void
  showStats?: boolean
}

/**
 * Memoized player card component to prevent unnecessary re-renders
 * Only re-renders when player data, selection state, or injury status changes
 */
export const MemoizedPlayerCard = memo<MemoizedPlayerCardProps>(({
  player,
  isSelected,
  isInjured,
  isCaptain,
  onSelect,
  onCaptainSelect,
  showStats = false
}) => {
  const handleClick = () => {
    if (!isInjured) {
      onSelect(player.id)
    }
  }

  const handleCaptainClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSelected && !isInjured) {
      onCaptainSelect(player.id)
    }
  }

  return (
    <div 
      className={`card inner ${isSelected ? 'selected' : ''} ${isInjured ? 'injured' : ''}`}
      onClick={handleClick}
      style={{ 
        cursor: isInjured ? 'not-allowed' : 'pointer',
        opacity: isInjured ? 0.6 : 1
      }}
    >
      <div className="card-header">
        <div>
          <div className="text-title-sm">
            {player.name}{isInjured ? ' 🚑' : ''}
          </div>
          <div className="text-sm text-muted">
            £{player.price}M • {player.position}
            {showStats && (
              <>
                {' • '}GW: {player.pointsGw} • Total: {player.pointsTotal}
              </>
            )}
          </div>
        </div>
        {isSelected && (
          <button
            className={`btn ${isCaptain ? 'primary' : 'secondary'}`}
            onClick={handleCaptainClick}
            disabled={isInjured}
          >
            {isCaptain ? 'Captain' : 'Set Captain'}
          </button>
        )}
      </div>
    </div>
  )
})

MemoizedPlayerCard.displayName = 'MemoizedPlayerCard'
