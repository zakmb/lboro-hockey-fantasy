import React from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import TeamBuilder from './pages/TeamBuilder'
import Admin from './pages/Admin'
import LeagueTable from './pages/LeagueTable'
import PlayerStats from './pages/PlayerStats'
import { isAdmin } from './config/adminEmails'

function Protected({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth()
	if (loading) return <div className="container">Loading...</div>
	if (!user) return <Navigate to="/login" replace />
	return <>{children}</>
}

function Shell({ children }: { children: React.ReactNode }) {
	const { user, logout } = useAuth()
	const showAdmin = user && isAdmin(user.email)
	
	return (
		<div className="container">
			{user && (
				<nav className="app" style={{gridTemplateColumns: showAdmin ? '1fr auto auto auto auto auto auto' : '1fr auto auto auto auto'}}>
					<h3 style={{margin:0}}>Loughborough Fantasy</h3>
					<Link to="/team">My Team</Link>
					<Link to="/league">League Table</Link>
					<Link to="/stats">Player Stats</Link>
					{showAdmin && <Link to="/admin">Admin</Link>}
					<button className="btn ghost" onClick={logout}>Logout</button>
				</nav>
			)}
			<div style={{height:12}}/>
			{children}
		</div>
	)
}

export default function App() {
	return (
		<AuthProvider>
			<Shell>
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					<Route path="/" element={<Navigate to="/team" replace />} />
					<Route path="/team" element={<Protected><TeamBuilder /></Protected>} />
					<Route path="/league" element={<Protected><LeagueTable /></Protected>} />
					<Route path="/stats" element={<Protected><PlayerStats /></Protected>} />
					<Route path="/admin" element={<Protected><Admin /></Protected>} />
					<Route path="*" element={<Navigate to="/team" replace />} />
				</Routes>
			</Shell>
		</AuthProvider>
	)
}
