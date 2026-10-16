import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ConsoleLayout from './components/console/ConsoleLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Spinner } from './components/Screen'
import { ONBOARDING_KEY } from './lib/constants'
import { readItem } from './lib/storage'
import AcceptTerms from './pages/legal/AcceptTerms'
import LegalPage from './pages/legal/LegalPage'
import HelpPage from './pages/HelpPage'
import Login from './pages/Login'
import ManagerDashboard from './pages/ManagerDashboard'
import ManagerReports from './pages/ManagerReports'
import JournalPage from './pages/JournalPage'
import MoodEntry from './pages/MoodEntry'
import Onboarding from './pages/Onboarding'
import TeamPage from './pages/TeamPage'
import ActionsPage from './pages/console/ActionsPage'
import ConsoleHome from './pages/console/ConsoleHome'
import PeoplePage from './pages/console/PeoplePage'
import PowerPointPage from './pages/console/PowerPointPage'
import ReportsPage from './pages/console/ReportsPage'
import MyTeamPage from './pages/console/MyTeamPage'
import SharedReportsPage from './pages/console/SharedReportsPage'
import ResourcesPage from './pages/console/ResourcesPage'
import TeamDetailPage from './pages/console/TeamDetailPage'
import TeamsPage from './pages/console/TeamsPage'
import TopicsPage from './pages/console/TopicsPage'
import { needsTermsAcceptance, useAuth } from './store/authStore'

const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches

/** Page "/" : redirige vers le bon écran selon l'état de connexion et le rôle. */
function Home() {
  const { session, profile, loading } = useAuth()
  const onboardingDone = readItem(ONBOARDING_KEY) === 'true'

  if (loading) return <Spinner />
  if (!session || !profile) return <Navigate to="/login" replace />
  if (needsTermsAcceptance(profile)) return <Navigate to="/conditions" replace />
  if (profile.role === 'rh') return <Navigate to="/console" replace />
  // Manager : console web sur grand écran, vue mobile sinon
  if (profile.role === 'manager') return <Navigate to={isDesktop() ? '/console' : '/manager'} replace />
  return <Navigate to={onboardingDone ? '/mood' : '/onboarding'} replace />
}

export default function App() {
  const init = useAuth((s) => s.init)
  useEffect(() => {
    void init()
  }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/conditions" element={<AcceptTerms />} />
        <Route path="/aide" element={<HelpPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/legal/:slug" element={<LegalPage />} />
        <Route path="/onboarding" element={<ProtectedRoute role="employee"><Onboarding /></ProtectedRoute>} />
        <Route path="/mood" element={<ProtectedRoute role="employee"><MoodEntry /></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute role="employee"><TeamPage /></ProtectedRoute>} />
        <Route path="/journal" element={<ProtectedRoute role="employee"><JournalPage /></ProtectedRoute>} />
        <Route path="/manager" element={<ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>} />
        <Route path="/manager/rapports" element={<ProtectedRoute role="manager"><ManagerReports /></ProtectedRoute>} />
        <Route path="/console" element={<ProtectedRoute role={['manager', 'rh']}><ConsoleLayout /></ProtectedRoute>}>
          <Route index element={<ConsoleHome />} />
          <Route path="powerpoint" element={<PowerPointPage />} />
          <Route path="ressources" element={<ResourcesPage />} />
          <Route path="sujets" element={<TopicsPage />} />
          <Route path="actions" element={<ProtectedRoute role="manager"><ActionsPage /></ProtectedRoute>} />
          <Route path="rapports" element={<ProtectedRoute role="manager"><ReportsPage /></ProtectedRoute>} />
          <Route path="equipes" element={<ProtectedRoute role="rh"><TeamsPage /></ProtectedRoute>} />
          <Route path="equipes/:teamId" element={<ProtectedRoute role="rh"><TeamDetailPage /></ProtectedRoute>} />
          <Route path="personnes" element={<ProtectedRoute role="rh"><PeoplePage /></ProtectedRoute>} />
          <Route path="fiches" element={<ProtectedRoute role="rh"><SharedReportsPage /></ProtectedRoute>} />
          <Route path="mon-equipe" element={<ProtectedRoute role="manager"><MyTeamPage /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
