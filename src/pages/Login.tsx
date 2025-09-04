import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login(){
	const { login } = useAuth()
	const nav = useNavigate()
	const [email,setEmail]=useState('')
	const [password,setPassword]=useState('')
	const [error,setError]=useState('')

	async function onSubmit(e:React.FormEvent){
		e.preventDefault()
		try{ setError(''); await login(email,password); nav('/') }catch(err){ setError('Failed to sign in') }
	}

	return (
		<div className="card" style={{maxWidth:420, margin:'64px auto'}}>
			<h2>Sign In</h2>
			<form onSubmit={onSubmit} className="grid">
				<input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
				<input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
				{error && <div style={{color:'#b91c1c'}}>{error}</div>}
				<button className="btn">Sign In</button>
			</form>
			<p style={{marginTop:8}}>No account? <Link to="/register">Register</Link></p>
		</div>
	)
}

