import { useState } from 'react'
import './components/brand/Brand.css'
import './components/auth/AuthForms.css'
import { useHealth } from './hooks/useHealth'
import { useAuth } from './hooks/AuthContext'
import { LoginForm } from './components/auth/LoginForm'
import { SignupForm } from './components/auth/SignupForm'
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm'
import { ResetPasswordForm } from './components/auth/ResetPasswordForm'
import { VerifyEmailStatus } from './components/auth/VerifyEmailStatus'
import { VerificationBanner } from './components/auth/VerificationBanner'
import { BrandPanel } from './components/brand/BrandPanel'
import { Logotype } from './components/brand/Logo'

type AuthView = 'login' | 'signup' | 'forgot' | 'reset'

function getInitialRoute(): { view: AuthView; verifyToken?: string; resetToken?: string } {
  const path = window.location.pathname
  const token = new URLSearchParams(window.location.search).get('token') ?? undefined

  if (path === '/verify-email' && token) {
    return { view: 'login', verifyToken: token }
  }
  if (path === '/reset-password' && token) {
    return { view: 'reset', resetToken: token }
  }
  return { view: 'login' }
}

function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [initialRoute] = useState(getInitialRoute)
  const [authView, setAuthView] = useState<AuthView>(initialRoute.view)
  const { data: health, isLoading: healthLoading, error: healthError } = useHealth()

  if (initialRoute.verifyToken) {
    return (
      <div className="app-main">
        <VerifyEmailStatus token={initialRoute.verifyToken} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="app-main">
        <p aria-live="polite">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <BrandPanel />
        <div className="auth-page__form">
          {authView === 'login' && (
            <LoginForm
              onSwitchToSignup={() => setAuthView('signup')}
              onSwitchToForgotPassword={() => setAuthView('forgot')}
            />
          )}
          {authView === 'signup' && <SignupForm onSwitchToLogin={() => setAuthView('login')} />}
          {authView === 'forgot' && (
            <ForgotPasswordForm onSwitchToLogin={() => setAuthView('login')} />
          )}
          {authView === 'reset' && initialRoute.resetToken && (
            <ResetPasswordForm
              token={initialRoute.resetToken}
              onSwitchToLogin={() => setAuthView('login')}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <header className="app-header">
        <Logotype size={26} />
        <div className="app-header__user">
          <p>
            Signed in as <strong>{user?.name}</strong> ({user?.role})
          </p>
          <button onClick={() => logout()}>Log out</button>
        </div>
      </header>
      {user && !user.emailVerified && <VerificationBanner />}
      <main className="app-main">
        <p aria-live="polite">
          {healthLoading && "Checking API…"}
          {healthError && `Error: ${healthError.message}`}
          {health && `API says: ${health.message}`}
        </p>
      </main>
    </>
  )
}

export default App
