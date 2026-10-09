import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { getIceConfig } from './api/ice-config-core.js'

const devIceConfig = (env) => ({
	name: 'guidly-dev-ice-config',
	configureServer(server) {
		server.middlewares.use('/api/ice-config', async (req, res) => {
			if (req.method !== 'GET') {
				res.statusCode = 405
				res.setHeader('Content-Type', 'application/json; charset=utf-8')
				res.end(JSON.stringify({ error: 'Method not allowed' }))
				return
			}
			const result = await getIceConfig(req.headers.authorization || '', env)
			res.statusCode = result.status
			res.setHeader('Content-Type', 'application/json; charset=utf-8')
			res.setHeader('Cache-Control', 'no-store, max-age=0')
			res.end(JSON.stringify(result.body))
		})
	},
})

export default defineConfig(({ mode }) => {
	const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
	return { plugins: [react(), devIceConfig(env)] }
})
