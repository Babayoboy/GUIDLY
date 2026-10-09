import { getIceConfig } from './ice-config-core.js'

const json = (res, status, body) => {
  res.status(status)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })
  const result = await getIceConfig(req.headers.authorization || '', process.env)
  return json(res, result.status, result.body)
}
