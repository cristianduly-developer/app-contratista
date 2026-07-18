import { createClient } from '@supabase/supabase-js'

const MAX_FIELD = 2000

function truncar(val, max = MAX_FIELD) {
  if (val == null) return null
  const s = String(val)
  return s.length > max ? s.slice(0, max) : s
}

export default async function handler(req, res) {
  const origin = req.headers['origin'] || ''
  const allowed = process.env.APP_ORIGIN || 'https://contratista.solucionesmdp.com.ar'
  const localDev = /^https?:\/\/localhost(:\d+)?$/.test(origin)
  if (origin === allowed || localDev) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-app-id, x-app-key')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const contentLength = parseInt(req.headers['content-length'] || '0', 10)
  if (contentLength > 8192) return res.status(413).json({ ok: false, error: 'payload_too_large' })

  const appKey = req.headers['x-app-key']
  if (!process.env.ERROR_REPORT_KEY || appKey !== process.env.ERROR_REPORT_KEY) {
    return res.status(401).json({ ok: false })
  }

  try {
    const central = createClient(process.env.CENTRAL_URL, process.env.CENTRAL_SERVICE_KEY)
    const { error } = await central.from('errores_apps').insert({
      app_id: 'app-contratista',
      mensaje: truncar(req.body?.mensaje) || 'Sin mensaje',
      stack: truncar(req.body?.stack),
      pantalla: truncar(req.body?.pantalla, 500),
      accion: truncar(req.body?.accion, 500),
      user_email: truncar(req.body?.user_email, 320),
      org_id: truncar(req.body?.org_id, 100),
      navegador: truncar(req.body?.navegador, 500),
      dispositivo: truncar(req.body?.dispositivo, 20),
      metadata: req.body?.metadata ? truncar(JSON.stringify(req.body.metadata), MAX_FIELD) : null,
    })
    if (error) console.error('[reportarError]', error)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[reportarError]', err)
    return res.status(500).json({ ok: false })
  }
}
