import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, Component } from 'react'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="bg-card border border-red-500/20 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-400 font-semibold mb-2">Something went wrong</p>
          <p className="text-sm text-muted mb-4">{this.state.error.message}</p>
          <button onClick={() => { this.setState({ error: null }); window.location.href = '/dashboard' }}
            className="px-4 py-2 bg-accent text-white text-sm rounded-lg">Go to Dashboard</button>
        </div>
      </div>
    )
    return this.props.children
  }
}
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Spinner from './components/ui/Spinner'

const Landing = lazy(() => import('./pages/Landing'))
const Auth = lazy(() => import('./pages/Auth'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))
const EditProfile = lazy(() => import('./pages/EditProfile'))
const Games = lazy(() => import('./pages/Games'))
const GameQueue = lazy(() => import('./pages/GameQueue'))
const Messages = lazy(() => import('./pages/Messages'))
const Chat = lazy(() => import('./pages/Chat'))
const Teams = lazy(() => import('./pages/Teams'))
const TeamProfile = lazy(() => import('./pages/TeamProfile'))
const CreateTeam = lazy(() => import('./pages/CreateTeam'))
const Tournaments = lazy(() => import('./pages/Tournaments'))
const TournamentDetail = lazy(() => import('./pages/TournamentDetail'))
const CreateTournament = lazy(() => import('./pages/CreateTournament'))
const EditTournament = lazy(() => import('./pages/EditTournament'))
const Discover = lazy(() => import('./pages/Discover'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Friends = lazy(() => import('./pages/Friends'))
const Settings = lazy(() => import('./pages/Settings'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const Search = lazy(() => import('./pages/Search'))
const Notifications = lazy(() => import('./pages/Notifications'))

const PageLoader = () => (
  <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
    <Spinner size="lg" />
  </div>
)

const Protect = ({ children }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
)

export default function App() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/dashboard" element={<Protect><Dashboard /></Protect>} />
        <Route path="/profile/edit" element={<Protect><EditProfile /></Protect>} />
        <Route path="/profile/:username" element={<Layout><Profile /></Layout>} />
        <Route path="/games" element={<Protect><Games /></Protect>} />
        <Route path="/games/:slug/queue" element={<Protect><GameQueue /></Protect>} />
        <Route path="/messages" element={<Protect><Messages /></Protect>} />
        <Route path="/messages/:id" element={<Protect><Chat /></Protect>} />
        <Route path="/teams" element={<Protect><Teams /></Protect>} />
        <Route path="/teams/create" element={<Protect><CreateTeam /></Protect>} />
        <Route path="/teams/:id" element={<Protect><TeamProfile /></Protect>} />
        <Route path="/tournaments" element={<Protect><Tournaments /></Protect>} />
        <Route path="/tournaments/create" element={<Protect><CreateTournament /></Protect>} />
        <Route path="/tournaments/:id" element={<Protect><TournamentDetail /></Protect>} />
        <Route path="/tournaments/:id/edit" element={<Protect><EditTournament /></Protect>} />
        <Route path="/discover" element={<Protect><Discover /></Protect>} />
        <Route path="/friends" element={<Protect><Friends /></Protect>} />
        <Route path="/onboarding" element={<Protect><Onboarding /></Protect>} />
        <Route path="/settings" element={<Protect><Settings /></Protect>} />
        <Route path="/leaderboard" element={<Protect><Leaderboard /></Protect>} />
        <Route path="/search" element={<Protect><Search /></Protect>} />
        <Route path="/notifications" element={<Protect><Notifications /></Protect>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
