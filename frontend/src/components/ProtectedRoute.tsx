import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from '../api/types'
import { needsTermsAcceptance, useAuth } from '../store/authStore'
import { Spinner } from './Screen'

/**
 * Bloque l'accès à une page si l'utilisateur n'est pas connecté ou n'a pas le bon rôle.
 * ⚠️ C'est du confort d'affichage : la VRAIE sécurité est dans Supabase (RLS + fonctions SQL).
 */
export function ProtectedRoute({ role, children }: { role: Role | Role[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session || !profile) return <Navigate to="/login" replace />
  if (needsTermsAcceptance(profile)) return <Navigate to="/conditions" replace />
  if (!(Array.isArray(role) ? role : [role]).includes(profile.role)) return <Navigate to="/" replace />
  return <>{children}</>
}
