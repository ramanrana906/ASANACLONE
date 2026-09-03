import { useEffect, useState } from 'react'
import { Gear, SidebarSimple, SignOut, Users } from '@phosphor-icons/react'
import './components/brand/Brand.css'
import './components/auth/AuthForms.css'
import './components/workspace/Workspace.css'
import './components/settings/Settings.css'
import './components/people/People.css'
import './components/projects/Projects.css'
import './components/common/Common.css'
import './components/layout/Layout.css'
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
import { LogoMark, Logotype } from './components/brand/Logo'
import { WorkspaceSwitcher } from './components/workspace/WorkspaceSwitcher'
import { CreateFirstWorkspace } from './components/workspace/CreateFirstWorkspace'
import { SettingsModal } from './components/settings/SettingsModal'
import { PeopleModal } from './components/people/PeopleModal'
import { AcceptInviteStatus } from './components/people/AcceptInviteStatus'
import { ProjectsList } from './components/projects/ProjectsList'
import { ProjectPage } from './components/projects/ProjectPage'
import { ProjectNav } from './components/projects/ProjectNav'
import { Avatar } from './components/common/Avatar'
import { TopBar } from './components/layout/TopBar'
import { CommandPalette } from './components/layout/CommandPalette'
import type { Workspace } from '@asanaClone/shared'

const SIDEBAR_COLLAPSED_KEY = 'clearing.sidebarCollapsed'

type AuthView = 'login' | 'signup' | 'forgot' | 'reset'

function getInitialRoute(): {
  view: AuthView
  verifyToken?: string
  resetToken?: string
  inviteToken?: string
} {
  const path = window.location.pathname
  const token = new URLSearchParams(window.location.search).get('token') ?? undefined

  if (path === '/verify-email' && token) {
    return { view: 'login', verifyToken: token }
  }
  if (path === '/reset-password' && token) {
    return { view: 'reset', resetToken: token }
  }
  if (path === '/accept-invite' && token) {
    return { view: 'login', inviteToken: token }
  }
  return { view: 'login' }
}

interface WorkspaceShellProps {
  workspace: Workspace
  userName: string
  userId: number
  emailVerified: boolean
  onOpenSettings: () => void
  onOpenPeople: () => void
  onLogout: () => void
}

function WorkspaceShell({
  workspace,
  userName,
  userId,
  emailVerified,
  onOpenSettings,
  onOpenPeople,
  onLogout,
}: WorkspaceShellProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1',
  )
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="app-shell">
      <aside className={collapsed ? 'app-sidebar app-sidebar--collapsed' : 'app-sidebar'}>
        <div className="app-sidebar__top">
          <div className="app-sidebar__logo">
            {collapsed ? <LogoMark size={22} /> : <Logotype size={22} />}
          </div>
          <button
            type="button"
            className="app-sidebar__collapse-toggle"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <SidebarSimple size={16} weight="bold" />
          </button>
        </div>

        <WorkspaceSwitcher collapsed={collapsed} />

        <button
          type="button"
          className="app-sidebar__nav-button"
          onClick={onOpenPeople}
          title="People"
        >
          <Users size={16} weight="bold" />
          {!collapsed && <span>People</span>}
        </button>

        <ProjectNav
          workspaceId={workspace.id}
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
          collapsed={collapsed}
        />

        <div className="app-sidebar__spacer" />
        <div className="app-sidebar__footer">
          <button type="button" onClick={onOpenSettings} title="Settings">
            <Gear size={16} weight="bold" />
            {!collapsed && <span>Settings</span>}
          </button>
          <div className="app-sidebar__user">
            <Avatar name={userName} userKey={userId} size={26} />
            {!collapsed && <span className="app-sidebar__user-name">{userName}</span>}
            {!collapsed && (
              <button type="button" onClick={onLogout} title="Log out" aria-label="Log out">
                <SignOut size={16} weight="bold" />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              type="button"
              className="app-sidebar__logout-collapsed"
              onClick={onLogout}
              title="Log out"
              aria-label="Log out"
            >
              <SignOut size={16} weight="bold" />
            </button>
          )}
        </div>
      </aside>
      <div className="app-content">
        {!emailVerified && <VerificationBanner />}
        <TopBar
          workspaceName={workspace.name}
          projectId={selectedProjectId}
          onOpenSearch={() => setPaletteOpen(true)}
        />
        <main className="app-main app-main--top">
          {selectedProjectId ? (
            <ProjectPage projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
          ) : (
            <ProjectsList
              workspaceId={workspace.id}
              workspaceName={workspace.name}
              onOpenProject={setSelectedProjectId}
            />
          )}
        </main>
      </div>
      {paletteOpen && (
        <CommandPalette
          workspaceId={workspace.id}
          onClose={() => setPaletteOpen(false)}
          onSelectProject={setSelectedProjectId}
          onSelectPerson={onOpenPeople}
        />
      )}
    </div>
  )
}

function AuthenticatedApp() {
  const { user, logout } = useAuth()
  const { workspaces, isLoading: workspacesLoading, currentWorkspace } = useWorkspaces()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [peopleOpen, setPeopleOpen] = useState(false)

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

  if (!currentWorkspace || !user) {
    return (
      <div className="app-main">
        <p aria-live="polite">Loading…</p>
      </div>
    )
  }

  return (
    <>
      <WorkspaceShell
        key={currentWorkspace.id}
        workspace={currentWorkspace}
        userName={user.name}
        userId={user.id}
        emailVerified={user.emailVerified}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPeople={() => setPeopleOpen(true)}
        onLogout={() => logout()}
      />
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {peopleOpen && (
        <PeopleModal workspaceId={currentWorkspace.id} onClose={() => setPeopleOpen(false)} />
      )}
    </>
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

  if (initialRoute.inviteToken) {
    return (
      <div className="app-main">
        <AcceptInviteStatus token={initialRoute.inviteToken} />
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
