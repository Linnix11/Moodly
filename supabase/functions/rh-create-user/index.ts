// =====================================================================
//  WORKZEN : création d'un compte par la RH (Edge Function)
//  La création d'un compte demande la clé secrète (service role) : elle
//  reste ici, côté serveur, et n'est jamais envoyée au navigateur.
//  Déploiement : Supabase > Edge Functions > Deploy a new function >
//  « Via Editor », nom « rh-create-user », coller ce fichier.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2.117.3'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ROLES = ['employee', 'manager', 'rh']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'Méthode non autorisée' })

  // Clé secrète : secret « WORKZEN_SECRET_KEY » (Edge Functions > Secrets) si défini,
  // sinon la clé service_role fournie automatiquement par Supabase
  const secretKey = Deno.env.get('WORKZEN_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!secretKey) return reply(500, { error: 'Clé secrète absente : ajoute le secret WORKZEN_SECRET_KEY' })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 1. L'appelant doit être connecté ET avoir le rôle RH
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return reply(401, { error: 'Non connecté' })
  const { data: caller, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !caller.user) return reply(401, { error: 'Session expirée : reconnecte-toi' })
  const { data: me } = await admin.from('profiles').select('role').eq('id', caller.user.id).maybeSingle()
  if (me?.role !== 'rh') return reply(403, { error: 'Accès réservé aux RH' })

  // 2. Validation des champs
  let body: { email?: unknown; password?: unknown; full_name?: unknown; role?: unknown; team_id?: unknown }
  try {
    body = await req.json()
  } catch {
    return reply(400, { error: 'Requête invalide' })
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
  const role = typeof body.role === 'string' ? body.role : ''
  const teamId = body.team_id === null || body.team_id === undefined ? null : Number(body.team_id)

  if (!EMAIL_RE.test(email)) return reply(400, { error: 'Email invalide' })
  if (password.length < 8) return reply(400, { error: 'Le mot de passe doit faire au moins 8 caractères' })
  if (fullName.length > 80) return reply(400, { error: 'Nom trop long (80 caractères maximum)' })
  if (!ROLES.includes(role)) return reply(400, { error: 'Rôle invalide' })
  if (teamId !== null) {
    if (!Number.isInteger(teamId)) return reply(400, { error: 'Équipe invalide' })
    const { data: team } = await admin.from('teams').select('id').eq('id', teamId).maybeSingle()
    if (!team) return reply(400, { error: "Cette équipe n'existe plus. Actualise la page." })
  }

  // 3. Création du compte (déjà confirmé) ; le trigger handle_new_user crée le profil
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
  })
  if (createError || !created.user) {
    if (createError?.code === 'email_exists' || createError?.message.includes('already been registered')) {
      return reply(409, { error: 'Un compte existe déjà avec cet email' })
    }
    if (createError?.code === 'weak_password') {
      return reply(400, { error: 'Mot de passe trop faible pour la politique du projet Supabase' })
    }
    console.error('createUser', createError)
    return reply(500, { error: 'Création du compte impossible' })
  }

  // 4. Rôle et équipe (upsert au cas où le trigger n'existerait pas)
  const { error: profileError } = await admin.from('profiles').upsert({
    id: created.user.id,
    full_name: fullName || null,
    role,
    team_id: teamId,
  })
  if (profileError) {
    // On annule pour ne pas laisser un compte à moitié configuré
    await admin.auth.admin.deleteUser(created.user.id)
    console.error('profile', profileError)
    return reply(500, { error: 'Création du compte impossible' })
  }

  return reply(200, { user_id: created.user.id })
})
