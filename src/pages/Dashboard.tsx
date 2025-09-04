import React from 'react'
import { Link } from 'react-router-dom'

export default function Dashboard(){
	return (
		<div className="grid" style={{gap:24}}>
			<div className="card">
				<h2>Global League</h2>
				<p>All managers play in one league. Transfers can be enabled by the admin.</p>
				<div style={{display:'flex',gap:8}}>
					<Link to="/team" className="btn">Build Your Team</Link>
					<Link to="/admin" className="btn secondary">Admin</Link>
				</div>
			</div>
		</div>
	)
}
