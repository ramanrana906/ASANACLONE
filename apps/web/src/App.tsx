import { useState } from 'react'
import { Gear } from '@phosphor-icons/react'
import './components/brand/Brand.css'
import './components/auth/AuthForms.css'
import './components/workspace/Workspace.css'
import './components/settings/Settings.css'
import { useHealth } from './hooks/useHealth'
import { useAuth } from './hooks/AuthContext'
import { useWorkspaces } from './hooks/WorkspaceContext'
import { WorkspaceProvider } from './hooks/useWorkspaces'
import { LoginForm } from './components/auth/LoginForm'
import { SignupForm } from './components/auth/SignupForm'
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm'
import { ResetPasswordForm } from './components/auth/ResetPasswordForm'
import { VerifyEmailStatus } from './components/auth/VerifyEmailStatus'
import { VerificationBanner } from './components/auth/VerificationBanner'
import { BrandPanel } from './components/brand/BrandPanel'
import { Logotype } from './components/brand/Logo'
import { WorkspaceSwitcher } from './components/workspace/WorkspaceSwitcher'
import { CreateFirstWorkspace } from './components/workspace/CreateFirstWorkspace'
import { SettingsModal } from './components/settings/SettingsModal'

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

function AuthenticatedApp() {
  const { user, logout } = useAuth()
  const { workspaces, isLoading: workspacesLoading, currentWorkspace } = useWorkspaces()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data: health, isLoading: healthLoading, error: healthError } = useHealth()

  if (workspacesLoading) {
    return (
      <div className="app-main">
        <p aria-live="polite">Loading…</p>
      </div>
    )
  }

  if (workspaces.length === 0) {
    return <CreateFirstWorkspace />
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__logo">
          <Logotype size={24} />
        </div>
        <WorkspaceSwitcher />
        <div className="app-sidebar__spacer" />
        <div className="app-sidebar__footer">
          <button type="button" onClick={() => setSettingsOpen(true)}>
            <Gear size={16} weight="bold" style={{ marginRight: 8, verticalAlign: -2 }} />
            Settings
          </button>
          <div className="app-sidebar__user">
            <span>{user?.name}</span>
            <button type="button" onClick={() => logout()}>
              Log out
            </button>
          </div>
        </div>
      </aside>
      <div className="app-content">
        {user && !user.emailVerified && <VerificationBanner />}
        <main className="app-main">
          <p aria-live="polite">
            {healthLoading && 'Checking API…'}
            {healthError && `Error: ${healthError.message}`}
            {health && `${currentWorkspace?.name} — API says: ${health.message}`}
          </p>
        </main>
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

function App() {
  const { isAuthenticated, isLoading } = useAuth()
  const [initialRoute] = useState(getInitialRoute)
  const [authView, setAuthView] = useState<AuthView>(initialRoute.view)

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
    <WorkspaceProvider>
      <AuthenticatedApp />
    </WorkspaceProvider>
  )
}

export default App
