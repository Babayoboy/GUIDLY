const json = (res, status, body) => {
  res.status(status)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  const authorization = req.headers.authorization || ''
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const meteredDomain = process.env.METERED_DOMAIN
  const meteredApiKey = process.env.METERED_API_KEY

  if (!accessToken) return json(res, 401, { error: 'Sign in to request call credentials.' })
  if (!supabaseUrl || !supabaseAnonKey || !meteredDomain || !meteredApiKey) {
    return json(res, 503, { error: 'TURN is not configured. Set Supabase and Metered environment variables in Vercel.' })
  }

  try {
    const authResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
    })
    if (!authResponse.ok) return json(res, 401, { error: 'Sign in again before starting a call.' })

    const domain = meteredDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const endpoint = new URL(`https://${domain}/api/v1/turn/credentials`)
    endpoint.searchParams.set('apiKey', meteredApiKey)
    const relayResponse = await fetch(endpoint, { headers: { Accept: 'application/json' } })
    const relayBody = await relayResponse.json()
    if (!relayResponse.ok) {
      return json(res, 502, { error: 'TURN credential provider rejected the request.' })
    }

    const iceServers = Array.isArray(relayBody) ? relayBody : relayBody.iceServers
    if (!Array.isArray(iceServers) || !iceServers.length) {
      return json(res, 502, { error: 'TURN provider returned no ICE servers.' })
    }
    const hasRelay = iceServers.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
      return urls.some((url) => typeof url === 'string' && /^turns?:/i.test(url))
    })
    if (!hasRelay) return json(res, 502, { error: 'TURN provider returned no turn: or turns: relay URL.' })
    return json(res, 200, { iceServers })
  } catch {
    return json(res, 502, { error: 'Could not retrieve TURN credentials.' })
  }
}
