import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register(){
	const { register } = useAuth()
	const nav = useNavigate()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [displayName, setDisplayName] = useState('')
	const [error, setError] = useState('')

	async function onSubmit(e: React.FormEvent){
		e.preventDefault()
		try{ 
			setError('')
			await register(email, password, displayName)
			nav('/team?onboarding=1') 
		} catch(err){ 
			setError('Failed to register') 
		}
	}

	return (
		<div className="card" style={{maxWidth:420, margin:'64px auto'}}>
			<h2>Create Account</h2>
			<p className="subtitle">After sign up you'll pick your 11 and a captain.</p>
			<form onSubmit={onSubmit} className="grid">
				<input className="input" placeholder="Display Name" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
				<input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
				<input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
				{error && <div style={{color:'#b91c1c'}}>{error}</div>}
				<button className="btn">Register</button>
			</form>
			<p style={{marginTop:8}}>Already have an account? <Link to="/login">Sign in</Link></p>
		</div>
	)
}

