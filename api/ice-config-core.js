export async function getIceConfig(authorization, env) {
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  const turnUrls = (env.EXPRESSTURN_URLS || 'turn:free.expressturn.com:3478')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
  const turnUsername = env.EXPRESSTURN_USERNAME
  const turnPassword = env.EXPRESSTURN_PASSWORD

  if (!accessToken) return { status: 401, body: { error: 'Sign in to request call credentials.' } }
  if (!supabaseUrl || !supabaseAnonKey || !turnUrls.length || !turnUsername || !turnPassword) {
    return { status: 503, body: { error: 'ExpressTURN is not configured. Set EXPRESSTURN_USERNAME and EXPRESSTURN_PASSWORD (and Supabase URL and anon key) in the local .env and Vercel environment.' } }
  }

  try {
    const authResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
    })
    if (!authResponse.ok) return { status: 401, body: { error: 'Sign in again before starting a call.' } }

    const iceServers = [{ urls: turnUrls, username: turnUsername, credential: turnPassword }]
    return { status: 200, body: { iceServers } }
  } catch {
    return { status: 502, body: { error: 'Could not validate the signed-in user for ExpressTURN credentials.' } }
  }
}
