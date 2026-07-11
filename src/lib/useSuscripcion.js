import { supabase } from './supabase'

export async function verificarSuscripcion({ esLogin = false } = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return null

    const params = new URLSearchParams()
    if (esLogin) params.set('login', '1')

    const res = await fetch(`/api/verificar-acceso?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (!res.ok) return null
    const data = await res.json()
    return data
  } catch {
    return null
  }
}
