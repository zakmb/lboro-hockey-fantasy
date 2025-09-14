import React from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { InjuriesProvider } from './contexts/InjuriesContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PageLoader } from './components/LoadingSpinner'
import Login from './pages/Login'
import Register from './pages/Register'
import TeamBuilder from './pages/TeamBuilder'
import Admin from './pages/Admin'
import LeagueTable from './pages/LeagueTable'
import PlayerStats from './pages/PlayerStats'
import { isAdmin } from './config/adminEmails'

// bring in shared core styles (tokens, buttons, cards, container, etc.)
import './index.css'

// placeholder logo – put your PNG in: src/assets/logo.png
import logo from './assets/logo.png'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader message="Authenticating..." />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function useHideOnScroll() {
  const [hidden, setHidden] = React.useState(false)
  const [atTop, setAtTop] = React.useState(true)
  const lastY = React.useRef(0)
  const ticking = React.useRef(false)

  React.useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const y = window.scrollY || window.pageYOffset
        setAtTop(y <= 4)
        if (y > lastY.current && y > 48) {
          // scrolling down past header
          setHidden(true)
        } else {
          // scrolling up
          setHidden(false)
        }
        lastY.current = y
        ticking.current = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return { hidden, atTop }
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const showAdmin = !!(user && isAdmin(user.email))
  const { hidden, atTop } = useHideOnScroll()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const location = useLocation()

  const navRef = React.useRef<HTMLElement | null>(null)
  const burgerRef = React.useRef<HTMLButtonElement | null>(null)
  const linksRef = React.useRef<HTMLElement | null>(null)

  // close mobile menu on route change
  React.useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // close menu when clicking outside or pressing Esc
  React.useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (!menuOpen) return
      const insideBurger = burgerRef.current?.contains(target)
      const insideLinks = linksRef.current?.contains(target)
      const insideNav = navRef.current?.contains(target)
      if (!insideBurger && !insideLinks && !insideNav) {
        setMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown, { passive: true })
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  return (
    <>
      {user && (
        <header
          ref={navRef}
          className={[
            'site-nav',
            hidden ? 'site-nav--hidden' : 'site-nav--visible',
            atTop ? 'site-nav--top' : '',
            showAdmin ? 'site-nav--admin' : ''
          ].join(' ')}
        >
          <div className="container site-nav__inner">
            <Link to="/team" className="site-nav__brand" aria-label="Home">
              <img src={logo} alt="" className="site-nav__logo" />
              <span className="site-nav__title">Loughborough Fantasy</span>
            </Link>

            <button
              ref={burgerRef}
              className={['site-nav__hamburger', menuOpen ? 'is-open' : ''].join(' ')}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="primary-navigation"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="hhamburger">
				<span className="hhamburger-bar" />
				<span className="hhamburger-bar" />
				<span className="hhamburger-bar" />
			  </span>
            </button>

            <nav
              id="primary-navigation"
              ref={linksRef}
              className={['site-nav__links', menuOpen ? 'is-open' : ''].join(' ')}
            >
              <Link to="/team" className="site-nav__link">My Team</Link>
              <Link to="/league" className="site-nav__link">League Table</Link>
              <Link to="/stats" className="site-nav__link">Player Stats</Link>
              {showAdmin && <Link to="/admin" className="site-nav__link">Admin</Link>}
              <button className="btn site-nav__logout" onClick={logout}>Logout</button>
            </nav>
          </div>
        </header>
      )}
 
      {/* spacer to prevent content jump under fixed header */}
      <div className="nav-spacer" />

      <main className="container">
        {children}
      </main>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <InjuriesProvider>
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
        </InjuriesProvider>
      </AuthProvider>

      {/* ===== Local styles appended at end of file as requested ===== */}
      <style>{appStyles}</style>
    </ErrorBoundary>
  )
}

/* ---------- Styles (kept at the end of the code file) ---------- */
const appStyles = `
/* header sizing */
:root {
  --nav-height: 100px;
}

/* full-width professional banner, attached to top, hides on scroll down */
.site-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--nav-height);
  background: var(--primary);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 10px 24px rgba(92, 45, 145, 0.06);
  z-index: 100;
  transform: translateY(0);
  transition: transform .28s ease, background-color .2s ease, box-shadow .2s ease, border-color .2s ease;
}

.site-nav--top {
  box-shadow: 0 8px 18px rgba(92, 45, 145, 0.05);
}

.site-nav--hidden {
  transform: translateY(-100%);
}

.site-nav--visible {
  transform: translateY(0);
}

.site-nav__inner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  height: var(--nav-height);
  padding: 0 12px;
}

/* brand (logo + title) */
.site-nav__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #FFFFFF; 
}

.site-nav__logo {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  object-fit: contain;
}

.site-nav__title {
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: .2px;
}

/* links row */
.site-nav__links {
  display: flex;
  align-items: center;
  justify-self: end;
  gap: 8px;
}

.site-nav__link {
  padding: 6px 10px;
  border-radius: 10px;
  color: var(--surface);
  transition: background-color .2s ease, color .2s ease;
  text-decoration: none;
}
.site-nav__link:hover {
  background: var(--accent);
  color: var(--surface);
}

/* wins against .btn and .btn:hover from index.css */
.site-nav .site-nav__links .btn.site-nav__logout {
  background: var(--accent);
  color: var(--surface);
  border-color: transparent;
}

/* make sure hover doesn't flip back to primary */
.site-nav .site-nav__links .btn.site-nav__logout:hover {
  background: var(--accent);
  color: var(--surface);
  opacity: 0.92; /* optional feedback */
}

/* focus-visible for accessibility */
.site-nav .site-nav__links .btn.site-nav__logout:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}




/* vertical hamburger (hidden on desktop) */
.site-nav__hamburger {
  display: none;
  appearance: none;
  background: transparent;
  border: 0;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
}

/* the icon container holds three tall thin bars side-by-side (|||) */
.hhamburger {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.hhamburger-bar {
  width: 20px;
  height: 2px;
  background: var(--accent);
  border-radius: 2px;
}

/* spacer equal to header height so content doesn't jump under fixed header */
.nav-spacer {
  height: var(--nav-height);
}

/* --- responsive behaviour --- */

/* tablets and down — center brand + title + hamburger as an even trio */
@media (max-width: 900px) {
  /* Center the trio in the middle of the screen with even spacing */
  .site-nav__inner {
    display: grid;
    grid-template-columns: auto auto auto;   /* logo|title|hamburger */
    justify-content: center;                 /* center the whole trio */
    align-items: center;
    column-gap: 50px;                        /* even spacing between the three */
  }

  /* ensure hamburger is visible on mobile */
  .site-nav__hamburger {
    display: inline-flex;
    justify-self: center;                    /* keep it participating in the centered trio */
  }

  /* brand bits stay compact and centered */
  .site-nav__brand {
    justify-self: center;
  }
  .site-nav__title {
    justify-self: center;
    white-space: nowrap;
  }

  /* mobile dropdown: full-width sheet, centrally aligned items */
  .site-nav__links {
    position: fixed;
    top: var(--nav-height);
    left: 0;
    right: 0;
	background: var(--surface);    border-bottom: 1px solid var(--border);
    box-shadow: 0 10px 24px rgba(92, 45, 145, 0.06);
    padding: 14px 12px;
    display: none;                           /* closed by default */
    flex-direction: column;
    align-items: center;                     /* center the items as a column */
    gap: 10px;
    z-index: 95;
    text-align: center;                      /* center the text inside links/buttons */
  }

  .site-nav__links.is-open {
    display: flex;
  }
	.site-nav__link {
	padding: 6px 10px;
	border-radius: 10px;
	color: var(--accent);
	transition: background-color .2s ease, color .2s ease;
	text-decoration: none;
	}


  /* make each link and the logout button centered with a tidy width */
  .site-nav__link,
  .btn.site-nav__logout {
    width: min(260px, 90%);
    margin: 0 auto;                          /* center within the dropdown */
  }

  /* optional: subtle separation for the logout button */
  .btn.site-nav__logout {
    margin-top: 6px;
  }
}

/* small phones – slightly tighter header */
@media (max-width: 480px) {
  :root { --nav-height: 56px; }
  .site-nav__logo { width: 30px; height: 30px; }
  .site-nav__title { font-size: 1rem; }
}

/* optional: widen desktop link spacing a touch */
@media (min-width: 1200px) {
  .site-nav__links { gap: 10px; }
}

/* variant if admin link is present */
.site-nav--admin .site-nav__links { gap: 10px; }



  `