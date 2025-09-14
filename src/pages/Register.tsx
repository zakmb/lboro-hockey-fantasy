import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { validateEmail, validatePassword, validateDisplayName, combineValidations } from '../lib/validation'
import { LoadingSpinner } from '../components/LoadingSpinner'

export default function Register(){
	const { register } = useAuth()
	const nav = useNavigate()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [displayName, setDisplayName] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const [validationErrors, setValidationErrors] = useState<string[]>([])

	async function onSubmit(e: React.FormEvent){
		e.preventDefault()
		
		// Clear previous errors
		setError('')
		setValidationErrors([])
		
		// Validate inputs
		const emailValidation = validateEmail(email)
		const passwordValidation = validatePassword(password)
		const displayNameValidation = validateDisplayName(displayName)
		
		const combinedValidation = combineValidations(emailValidation, passwordValidation, displayNameValidation)
		
		if (!combinedValidation.isValid) {
			setValidationErrors(combinedValidation.errors)
			return
		}
		
		try{ 
			setLoading(true)
			await register(email, password, displayName)
			nav('/team?onboarding=1') 
		} catch(err: any){ 
			console.error('Registration error:', err)
			// Handle specific Firebase errors
			if (err.code === 'auth/email-already-in-use') {
				setError('This email is already registered. Please try logging in instead.')
			} else if (err.code === 'auth/weak-password') {
				setError('Password is too weak. Please choose a stronger password.')
			} else if (err.code === 'auth/invalid-email') {
				setError('Please enter a valid email address.')
			} else {
				setError('Failed to create account. Please try again.')
			}
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="card" style={{maxWidth:420, margin:'64px auto'}}>
			<h2>Create Account</h2>
			<p className="subtitle">After sign up you'll pick your 11 and a captain.</p>
			<form onSubmit={onSubmit} className="grid" role="form">
				<input 
					className="input" 
					placeholder="Display Name" 
					value={displayName} 
					onChange={e=>setDisplayName(e.target.value)}
					disabled={loading}
				/>
				<input 
					className="input" 
					placeholder="Email" 
					type="email"
					value={email} 
					onChange={e=>setEmail(e.target.value)}
					disabled={loading}
				/>
				<input 
					className="input" 
					placeholder="Password" 
					type="password" 
					value={password} 
					onChange={e=>setPassword(e.target.value)}
					disabled={loading}
				/>
				{validationErrors.length > 0 && (
					<div style={{color:'#b91c1c'}}>
						{validationErrors.map((err, index) => (
							<div key={index}>{err}</div>
						))}
					</div>
				)}
				{error && <div style={{color:'#b91c1c'}}>{error}</div>}
				<button className="btn" disabled={loading}>
					{loading ? <LoadingSpinner size="small" message="" /> : 'Register'}
				</button>
			</form>
			<p style={{marginTop:8}}>Already have an account? <Link to="/login">Sign in</Link></p>
		</div>
	)
}

