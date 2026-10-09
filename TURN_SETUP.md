# WebRTC TURN Setup

Calls now use the Vercel endpoint at `/api/ice-config` by default. It validates the signed-in Supabase user, then requests short-lived ICE credentials from Metered on the server. Provider secrets stay server-side. When valid TURN credentials are returned, Guidly routes media through TURN instead of depending on a direct peer-to-peer path. This is more reliable across mobile carrier NATs and restrictive Wi-Fi, but uses relay bandwidth.

## Configure Vercel

1. Create a Metered account and enable its Open Relay TURN service. Copy the TURN REST API key and the Metered app domain (for example, `yourapp.metered.live`). Ensure the returned ICE server list includes TURN over TCP/TLS on port 443; Open Relay supports TCP/TLS on 443 for networks that block UDP.
2. In Vercel Project Settings → Environment Variables, add:
   - `METERED_DOMAIN`: the Metered app hostname, without `https://`.
   - `METERED_API_KEY`: the TURN REST API key. Do not prefix this with `VITE_`.
   - `SUPABASE_URL`: your Supabase project URL.
   - `SUPABASE_ANON_KEY`: your Supabase anon/publishable key.
3. Redeploy the Vercel app. The route returns temporary ICE credentials only to a valid signed-in user.
4. Test a call between two devices on different networks. On the browser's WebRTC internals, check that the selected candidate pair is `relay` to confirm TURN is being used.

`VITE_ICE_CONFIG_URL` is optional if you provide a different HTTPS endpoint returning `{ "iceServers": [...] }` with at least one `turn:` or `turns:` URL, username, and credential. If the default Vercel route is not deployed (for example, running plain `npm run dev`), or relay credentials cannot be fetched, Guidly falls back to Google STUN and warns that restrictive networks may fail. No internet calling service can guarantee connectivity on networks that block all outbound STUN/TURN traffic, including TCP/TLS port 443. For local end-to-end calls, deploy a preview or run with a compatible Vercel Functions development server.
