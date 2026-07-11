import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-app-id, x-app-key')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const appKey = req.headers['x-app-key']
  if (process.env.ERROR_REPORT_KEY && appKey !== process.env.ERROR_REPORT_KEY) {
    return res.status(401).json({ ok: false })
  }

  try {
    const central = createClient(process.env.CENTRAL_URL, process.env.CENTRAL_SERVICE_KEY)
    const { error } = await central.from('errores_apps').insert({
      app_id: 'app-contratista',
      mensaje: req.body?.mensaje || 'Sin mensaje',
      stack: req.body?.stack || null,
      pantalla: req.body?.pantalla || null,
      accion: req.body?.accion || null,
      user_email: req.body?.user_email || null,
      org_id: req.body?.org_id || null,
      navegador: req.body?.navegador || null,
      dispositivo: req.body?.dispositivo || null,
      metadata: req.body?.metadata || null,
    })
    if (error) console.error('[reportarError]', error)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[reportarError]', err)
    return res.status(500).json({ ok: false })
  }
}
