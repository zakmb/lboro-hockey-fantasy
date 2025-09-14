import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { validateEmail, validatePassword, combineValidations } from '../lib/validation'
import { LoadingSpinner } from '../components/LoadingSpinner'

export default function Login(){
	const { login } = useAuth()
	const nav = useNavigate()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
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
		
		const combinedValidation = combineValidations(emailValidation, passwordValidation)
		
		if (!combinedValidation.isValid) {
			setValidationErrors(combinedValidation.errors)
			return
		}
		
		try{ 
			setLoading(true)
			await login(email, password)
			nav('/') 
		} catch(err: any){ 
			console.error('Login error:', err)
			// Handle specific Firebase errors
			if (err.code === 'auth/user-not-found') {
				setError('No account found with this email address.')
			} else if (err.code === 'auth/wrong-password') {
				setError('Incorrect password. Please try again.')
			} else if (err.code === 'auth/invalid-email') {
				setError('Please enter a valid email address.')
			} else if (err.code === 'auth/too-many-requests') {
				setError('Too many failed attempts. Please try again later.')
			} else {
				setError('Failed to sign in. Please try again.')
			}
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="card" style={{maxWidth:420, margin:'64px auto'}}>
			<h2>Sign In</h2>
			<form onSubmit={onSubmit} className="grid" role="form">
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
					{loading ? <LoadingSpinner size="small" message="" /> : 'Sign In'}
				</button>
			</form>
			<p style={{marginTop:8}}>No account? <Link to="/register">Register</Link></p>
		</div>
	)
}

