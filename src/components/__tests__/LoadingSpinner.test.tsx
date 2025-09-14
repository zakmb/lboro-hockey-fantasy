import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner, PageLoader, InlineLoader } from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByRole('status', { hidden: true })
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('w-8', 'h-8') // medium size
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders with custom size', () => {
    render(<LoadingSpinner size="large" />)
    
    const spinner = screen.getByRole('status', { hidden: true })
    expect(spinner).toHaveClass('w-12', 'h-12') // large size
  })

  it('renders with custom message', () => {
    render(<LoadingSpinner message="Please wait..." />)
    
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })

  it('renders without message when empty string provided', () => {
    render(<LoadingSpinner message="" />)
    
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />)
    
    const container = screen.getByRole('status', { hidden: true }).parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('has correct accessibility attributes', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByRole('status', { hidden: true })
    expect(spinner).toHaveAttribute('aria-label', 'Loading')
  })
})

describe('PageLoader', () => {
  it('renders with default message', () => {
    render(<PageLoader />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    // The PageLoader wraps LoadingSpinner in a min-h-screen container
    const pageContainer = screen.getByText('Loading...').closest('div')?.parentElement
    expect(pageContainer).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center')
  })

  it('renders with custom message', () => {
    render(<PageLoader message="Authenticating..." />)
    
    expect(screen.getByText('Authenticating...')).toBeInTheDocument()
  })
})

describe('InlineLoader', () => {
  it('renders inline spinner', () => {
    render(<InlineLoader />)
    
    const spinner = screen.getByRole('status', { hidden: true })
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('inline-block', 'w-4', 'h-4')
  })
})
