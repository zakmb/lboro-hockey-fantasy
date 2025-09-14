import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Login from '../Login'
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

describe('Login Component', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('renders login form', () => {
    renderWithRouter(<Login />)
    
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    renderWithRouter(<Login />)
    
    const form = screen.getByRole('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    renderWithRouter(<Login />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const form = emailInput.closest('form')!
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('shows validation error for short password', async () => {
    renderWithRouter(<Login />)
    
    const passwordInput = screen.getByPlaceholderText('Password')
    const form = screen.getByRole('form')
    
    fireEvent.change(passwordInput, { target: { value: '123' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument()
    })
  })

  it('calls login with correct data on valid form submission', async () => {
    renderWithRouter(<Login />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const form = screen.getByRole('form')
    
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('john@example.com', 'password123')
    })
  })

  it('navigates to home page on successful login', async () => {
    mockLogin.mockResolvedValue(undefined)
    
    renderWithRouter(<Login />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const form = screen.getByRole('form')
    
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows specific error for user not found', async () => {
    const error = new Error('User not found') as any
    error.code = 'auth/user-not-found'
    mockLogin.mockRejectedValue(error)
    
    renderWithRouter(<Login />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const form = screen.getByRole('form')
    
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('No account found with this email address.')).toBeInTheDocument()
    })
  })

  it('shows specific error for wrong password', async () => {
    const error = new Error('Wrong password') as any
    error.code = 'auth/wrong-password'
    mockLogin.mockRejectedValue(error)
    
    renderWithRouter(<Login />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const form = screen.getByRole('form')
    
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Incorrect password. Please try again.')).toBeInTheDocument()
    })
  })

  it('shows specific error for too many requests', async () => {
    const error = new Error('Too many requests') as any
    error.code = 'auth/too-many-requests'
    mockLogin.mockRejectedValue(error)
    
    renderWithRouter(<Login />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const form = screen.getByRole('form')
    
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Too many failed attempts. Please try again later.')).toBeInTheDocument()
    })
  })

  it('disables form inputs during loading', async () => {
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    renderWithRouter(<Login />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    const form = screen.getByRole('form')
    
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
  })
})
