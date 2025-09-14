import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { auth } from '../../lib/firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth'

// Mock Firebase Auth
vi.mock('firebase/auth')
vi.mock('../../lib/firebase', () => ({
  auth: {}
}))

const mockOnAuthStateChanged = vi.mocked(onAuthStateChanged)
const mockSignInWithEmailAndPassword = vi.mocked(signInWithEmailAndPassword)
const mockCreateUserWithEmailAndPassword = vi.mocked(createUserWithEmailAndPassword)
const mockSignOut = vi.mocked(signOut)
const mockUpdateProfile = vi.mocked(updateProfile)

// Test component that uses the auth context
function TestComponent() {
  const { user, loading, login, register, logout } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <div data-testid="user">{user ? `${user.displayName} (${user.email})` : 'No user'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => register('test@example.com', 'password', 'Test User')}>Register</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides loading state initially', () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      // Don't call callback immediately to test loading state
      return () => {}
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('provides user when authenticated', async () => {
    const mockUser = {
      uid: '123',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: vi.fn(),
      getIdToken: vi.fn(),
      getIdTokenResult: vi.fn(),
      reload: vi.fn(),
      toJSON: vi.fn()
    } as any

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      // Simulate auth state change
      setTimeout(() => {
        if (typeof callback === 'function') {
          callback(mockUser)
        } else {
          callback.next?.(mockUser)
        }
      }, 0)
      return () => {}
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Test User (test@example.com)')
    })
  })

  it('provides null user when not authenticated', async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      // Simulate no user
      setTimeout(() => {
        if (typeof callback === 'function') {
          callback(null)
        } else {
          callback.next?.(null)
        }
      }, 0)
      return () => {}
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user')
    })
  })

  it('calls signInWithEmailAndPassword on login', async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => {
        if (typeof callback === 'function') {
          callback(null)
        } else {
          callback.next?.(null)
        }
      }, 0)
      return () => {}
    })

    mockSignInWithEmailAndPassword.mockResolvedValue({} as any)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user')
    })

    const loginButton = screen.getByText('Login')
    loginButton.click()

    await waitFor(() => {
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'test@example.com', 'password')
    })
  })

  it('calls createUserWithEmailAndPassword and updateProfile on register', async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => {
        if (typeof callback === 'function') {
          callback(null)
        } else {
          callback.next?.(null)
        }
      }, 0)
      return () => {}
    })

    const mockCredential = {
      user: {
        uid: '123',
        email: 'test@example.com'
      }
    }

    mockCreateUserWithEmailAndPassword.mockResolvedValue(mockCredential as any)
    mockUpdateProfile.mockResolvedValue(undefined)

    // Mock auth.currentUser
    Object.defineProperty(auth, 'currentUser', {
      value: mockCredential.user,
      writable: true
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user')
    })

    const registerButton = screen.getByText('Register')
    registerButton.click()

    await waitFor(() => {
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'test@example.com', 'password')
      expect(mockUpdateProfile).toHaveBeenCalledWith(mockCredential.user, { displayName: 'Test User' })
    })
  })

  it('calls signOut on logout', async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => {
        if (typeof callback === 'function') {
          callback(null)
        } else {
          callback.next?.(null)
        }
      }, 0)
      return () => {}
    })

    mockSignOut.mockResolvedValue(undefined)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user')
    })

    const logoutButton = screen.getByText('Logout')
    logoutButton.click()

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith(auth)
    })
  })

  it('throws error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within AuthProvider')

    consoleSpy.mockRestore()
  })
})
