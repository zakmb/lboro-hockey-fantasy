import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Register from '../Register'
import { useAuth } from '../../contexts/AuthContext'

// Mock the useAuth hook
vi.mock('../../contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Register Component', () => {
  const mockRegister = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
    })
  })

  it('renders registration form', () => {
    renderWithRouter(<Register />)
    
    expect(screen.getByText('Create Account')).toBeInTheDocument()
    expect(screen.getByText("After sign up you'll pick your 11 and a captain.")).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Display Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    renderWithRouter(<Register />)
    
    const form = screen.getByRole('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
      expect(screen.getByText('Display name is required')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    renderWithRouter(<Register />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const form = screen.getByRole('form')
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('shows validation error for short password', async () => {
    renderWithRouter(<Register />)
    
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: 'Register' })
    
    fireEvent.change(passwordInput, { target: { value: '123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument()
    })
  })

  it('shows validation error for short display name', async () => {
    renderWithRouter(<Register />)
    
    const displayNameInput = screen.getByPlaceholderText('Display Name')
    const submitButton = screen.getByRole('button', { name: 'Register' })
    
    fireEvent.change(displayNameInput, { target: { value: 'A' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Display name must be at least 2 characters long')).toBeInTheDocument()
    })
  })

  it('calls register with correct data on valid form submission', async () => {
    renderWithRouter(<Register />)
    
    const displayNameInput = screen.getByPlaceholderText('Display Name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: 'Register' })
    
    fireEvent.change(displayNameInput, { target: { value: 'John Doe' } })
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('john@example.com', 'password123', 'John Doe')
    })
  })

  it('navigates to team page on successful registration', async () => {
    mockRegister.mockResolvedValue(undefined)
    
    renderWithRouter(<Register />)
    
    const displayNameInput = screen.getByPlaceholderText('Display Name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: 'Register' })
    
    fireEvent.change(displayNameInput, { target: { value: 'John Doe' } })
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/team?onboarding=1')
    })
  })

  it('shows specific error for email already in use', async () => {
    const error = new Error('Email already in use') as any
    error.code = 'auth/email-already-in-use'
    mockRegister.mockRejectedValue(error)
    
    renderWithRouter(<Register />)
    
    const displayNameInput = screen.getByPlaceholderText('Display Name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: 'Register' })
    
    fireEvent.change(displayNameInput, { target: { value: 'John Doe' } })
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('This email is already registered. Please try logging in instead.')).toBeInTheDocument()
    })
  })

  it('shows specific error for weak password', async () => {
    const error = new Error('Weak password') as any
    error.code = 'auth/weak-password'
    mockRegister.mockRejectedValue(error)
    
    renderWithRouter(<Register />)
    
    const displayNameInput = screen.getByPlaceholderText('Display Name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: 'Register' })
    
    fireEvent.change(displayNameInput, { target: { value: 'John Doe' } })
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Password is too weak. Please choose a stronger password.')).toBeInTheDocument()
    })
  })

  it('disables form inputs during loading', async () => {
    mockRegister.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    renderWithRouter(<Register />)
    
    const displayNameInput = screen.getByPlaceholderText('Display Name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: 'Register' })
    
    fireEvent.change(displayNameInput, { target: { value: 'John Doe' } })
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(displayNameInput).toBeDisabled()
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
  })
})
