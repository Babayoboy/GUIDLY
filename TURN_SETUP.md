# ExpressTURN Setup

The call credential endpoint uses the ExpressTURN server shown in your dashboard. It validates the signed-in Supabase user, then returns ICE configuration to that user. TURN credentials stay on the server until needed by the browser's WebRTC connection.

The default TURN URL is `turn:free.expressturn.com:3478`. Override it with `EXPRESSTURN_URLS` if ExpressTURN provides additional URLs, separated by commas.

## Local development

Add these variables to the ignored local `.env` file, using the **rotated** ExpressTURN credentials:

```dotenv
EXPRESSTURN_URLS=turn:free.expressturn.com:3478
EXPRESSTURN_USERNAME=your-express-turn-username
EXPRESSTURN_PASSWORD=your-rotated-express-turn-password
```

Keep them unprefixed (not `VITE_`) so Vite doesn't bundle them into the browser. Restart `npm run dev` after setting the variables. The Vite middleware serves `/api/ice-config` locally.

## Vercel deployment

In Vercel Project Settings → Environment Variables, add:

- `EXPRESSTURN_URLS` = `turn:free.expressturn.com:3478` (optional; this is the default)
- `EXPRESSTURN_USERNAME` = the ExpressTURN username
- `EXPRESSTURN_PASSWORD` = the ExpressTURN password
- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_ANON_KEY` = your Supabase anon/publishable key

Redeploy after saving the variables. Since the username and password in the screenshot were exposed, rotate them in ExpressTURN before adding the replacement values.

## Network limitations

Guidly sets relay-only ICE when the endpoint returns the configured TURN URL, so media goes through ExpressTURN instead of trying a direct peer path. The shown URL uses port `3478`; networks that block that port may still prevent calls. Ask ExpressTURN whether your account supports TCP/TLS relay on port `443`, and add those URLs to `EXPRESSTURN_URLS` if available. No service can guarantee calls on a network that blocks every TURN route.
