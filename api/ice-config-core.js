export async function getIceConfig(authorization, env) {
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  const meteredDomain = env.METERED_DOMAIN
  const meteredApiKey = env.METERED_API_KEY

  if (!accessToken) return { status: 401, body: { error: 'Sign in to request call credentials.' } }
  if (!supabaseUrl || !supabaseAnonKey || !meteredDomain || !meteredApiKey) {
    return { status: 503, body: { error: 'TURN is not configured. Set METERED_DOMAIN and METERED_API_KEY (plus Supabase URL and anon key) in the local .env and Vercel environment.' } }
  }

  try {
    const authResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
    })
    if (!authResponse.ok) return { status: 401, body: { error: 'Sign in again before starting a call.' } }

    const domain = meteredDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const endpoint = new URL(`https://${domain}/api/v1/turn/credentials`)
    endpoint.searchParams.set('apiKey', meteredApiKey)
    const relayResponse = await fetch(endpoint, { headers: { Accept: 'application/json' } })
    const relayBody = await relayResponse.json()
    if (!relayResponse.ok) return { status: 502, body: { error: 'TURN credential provider rejected the request.' } }

    const iceServers = Array.isArray(relayBody) ? relayBody : relayBody.iceServers
    if (!Array.isArray(iceServers) || !iceServers.length) {
      return { status: 502, body: { error: 'TURN provider returned no ICE servers.' } }
    }
    const hasRelay = iceServers.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
      return urls.some((url) => typeof url === 'string' && /^turns?:/i.test(url))
    })
    if (!hasRelay) return { status: 502, body: { error: 'TURN provider returned no turn: or turns: relay URL.' } }
    return { status: 200, body: { iceServers } }
  } catch {
    return { status: 502, body: { error: 'Could not retrieve TURN credentials from Metered.' } }
  }
}
