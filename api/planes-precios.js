import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const origin = req.headers['origin'] || ''
  const allowed = process.env.APP_ORIGIN || 'https://contratista.solucionesmdp.com.ar'
  const localDev = /^https?:\/\/localhost(:\d+)?$/.test(origin)
  if (origin === allowed || localDev) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ ok: false })

  if (!process.env.CENTRAL_URL || !process.env.CENTRAL_SERVICE_KEY) {
    return res.status(500).json({ ok: false, error: 'config_error' })
  }

  const central = createClient(process.env.CENTRAL_URL, process.env.CENTRAL_SERVICE_KEY)
  const { data, error } = await central
    .from('planes_precios')
    .select('plan, precio_mensual, beneficios')
    .eq('app_id', 'app-contratista')
    .order('precio_mensual')

  if (error) return res.status(500).json({ ok: false, error: 'db_error' })

  return res.status(200).json({ ok: true, planes: data || [] })
}
