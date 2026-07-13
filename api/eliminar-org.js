import { createClient } from '@supabase/supabase-js'

async function findUserByEmail(supa, email) {
  const target = email?.toLowerCase()
  if (!target) return null
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return null
    const found = data.users.find(u => u.email?.toLowerCase() === target)
    if (found) return found
    if (data.users.length < 1000) break
  }
  return null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-app-key, x-internal-key')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const appKey = req.headers['x-app-key']
  const internalKey = req.headers['x-internal-key']
  const validAppKey = process.env.ERROR_REPORT_KEY && appKey === process.env.ERROR_REPORT_KEY
  const validInternal = process.env.INTERNAL_API_KEY && internalKey === process.env.INTERNAL_API_KEY
  if (!validAppKey && !validInternal) {
    console.error('[eliminar-org] auth fail, x-app-key:', !!appKey, 'x-internal-key:', !!internalKey)
    return res.status(401).json({ ok: false, error: 'no_auth' })
  }

  const { org_id, email } = req.body || {}
  if (!org_id) return res.status(400).json({ ok: false, error: 'org_id requerido' })

  try {
    let contactEmail = email
    if (!contactEmail) {
      const central = createClient(process.env.CENTRAL_URL, process.env.CENTRAL_SERVICE_KEY)
      const { data: org } = await central.from('organizaciones').select('email_contacto').eq('id', org_id).single()
      if (!org) return res.status(404).json({ ok: false, error: 'org no encontrada' })
      contactEmail = org.email_contacto
    }

    const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) { console.error('[eliminar-org] No service key found'); return res.status(500).json({ ok: false, error: 'missing_service_key' }) }
    const supa = createClient(process.env.VITE_SUPABASE_URL, serviceKey)

    const user = await findUserByEmail(supa, contactEmail)
    if (!user) return res.status(200).json({ ok: true, msg: 'usuario no encontrado en satellite' })

    const uid = user.id
    console.log('[eliminar-org] Borrando datos de uid:', uid, 'email:', contactEmail)

    const tablas = [
      ['fotos_obra', 'user_id'],
      ['notas_obra', 'user_id'],
      ['alertas_obra', 'user_id'],
      ['materiales_obra', 'user_id'],
      ['pagos_gremios', 'user_id'],
      ['cobros_inversor', 'user_id'],
      ['obra_gremios', 'user_id'],
      ['obras', 'user_id'],
      ['gremios', 'user_id'],
      ['precios_m2', 'user_id'],
      ['tenant_access', 'tenant_id'],
      ['perfiles', 'id'],
    ]

    for (const [tabla, col] of tablas) {
      const { error, count } = await supa.from(tabla).delete({ count: 'exact' }).eq(col, uid)
      if (error) console.error(`[eliminar-org] Error borrando ${tabla}:`, error.message)
      else console.log(`[eliminar-org] ${tabla}: ${count ?? '?'} rows deleted`)
    }

    const { error: authErr } = await supa.auth.admin.deleteUser(uid)
    if (authErr) console.error('[eliminar-org] Error borrando auth user:', authErr.message)
    else console.log('[eliminar-org] Auth user deleted')

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[eliminar-org]', err)
    return res.status(500).json({ ok: false, error: 'internal' })
  }
}
