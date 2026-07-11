import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, RefreshCw, Link2 } from 'lucide-react'
import { supabase, mensajeErrorGuardado } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { usePlan } from '../../lib/PlanContext'

const TIPOS = [
  'Albañilería', 'Electricidad', 'Plomería', 'Pintura', 'Carpintería',
  'Gas', 'Aire acondicionado', 'Herrería / Aluminio', 'Durlock', 'Pisos',
]

export default function GremioForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const { features } = usePlan()
  const esEditar = !!id

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [tokenLink, setTokenLink] = useState('')
  const [loading, setLoading] = useState(esEditar)
  const [guardando, setGuardando] = useState(false)
  const [regenerando, setRegenerando] = useState(false)

  useEffect(() => {
    if (!esEditar || !user) return
    supabase.from('gremios').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) {
          setNombre(data.nombre || '')
          setTipo(data.tipo || '')
          setTelefono(data.telefono || '')
          setTokenLink(data.token_link || '')
        }
        setLoading(false)
      })
  }, [id, user?.id])

  async function guardar() {
    if (!nombre.trim()) return
    setGuardando(true)

    if (esEditar) {
      const { error } = await supabase.from('gremios').update({
        nombre: nombre.trim(), tipo: tipo.trim(), telefono: telefono.trim(),
      }).eq('id', id)
      if (error) { mensajeErrorGuardado(error); setGuardando(false); return }
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Gremio actualizado', type: 'success' } }))
      navigate('/gremios')
    } else {
      const { error } = await supabase.from('gremios').insert({
        user_id: user.id, nombre: nombre.trim(), tipo: tipo.trim(), telefono: telefono.trim(),
      })
      if (error) { mensajeErrorGuardado(error); setGuardando(false); return }
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Gremio creado', type: 'success' } }))
      navigate('/gremios')
    }
  }

  async function regenerarToken() {
    setRegenerando(true)
    const { data, error } = await supabase.rpc('regenerar_token_gremio', { p_gremio_id: id })
    if (error) { mensajeErrorGuardado(error) }
    else { setTokenLink(data); window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Link regenerado', type: 'success' } })) }
    setRegenerando(false)
  }

  function copiarLink() {
    const url = `${window.location.origin}/g/${tokenLink}`
    navigator.clipboard.writeText(url)
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Link copiado', type: 'success' } }))
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#F97316' }} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0A0A0F' }}>
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: '#0A0A0F' }}>
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <ArrowLeft size={18} color="#9CA3AF" />
        </button>
        <h1 className="text-white font-bold text-[18px] flex-1">
          {esEditar ? 'Editar gremio' : 'Nuevo gremio'}
        </h1>
        <button onClick={guardar} disabled={guardando || !nombre.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold disabled:opacity-40"
          style={{ background: '#F9731618', color: '#F97316', border: '1px solid #F9731630' }}>
          <Save size={14} />
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="px-4 flex flex-col gap-3">
        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Nombre *</label>
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Juan Gómez"
            className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
            style={{ background: '#13131A', border: '1px solid #2A2A3A' }} />
        </div>

        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Tipo / Especialidad</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)}
            className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none appearance-none"
            style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
            <option value="">Seleccionar...</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            <option value="otro">Otro</option>
          </select>
        </div>

        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Teléfono / WhatsApp</label>
          <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
            placeholder="Ej: 223 456-7890"
            className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
            style={{ background: '#13131A', border: '1px solid #2A2A3A' }} />
        </div>

        {/* Link público */}
        {esEditar && features.links_publicos && tokenLink && (
          <div className="rounded-2xl p-4 mt-2" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
            <div className="flex items-center gap-2 mb-2">
              <Link2 size={16} color="#3B82F6" />
              <span className="text-white text-[13px] font-semibold">Link público</span>
            </div>
            <p className="text-gray-500 text-[11px] mb-3 break-all">
              {window.location.origin}/g/{tokenLink}
            </p>
            <div className="flex gap-2">
              <button onClick={copiarLink}
                className="flex-1 py-2 rounded-lg text-[12px] font-semibold"
                style={{ background: '#3B82F618', color: '#3B82F6', border: '1px solid #3B82F630' }}>
                Copiar link
              </button>
              <button onClick={regenerarToken} disabled={regenerando}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] font-medium"
                style={{ background: '#EF444412', color: '#EF4444', border: '1px solid #EF444430' }}>
                <RefreshCw size={12} className={regenerando ? 'animate-spin' : ''} />
                Regenerar
              </button>
            </div>
            <p className="text-gray-600 text-[10px] mt-2">
              Regenerar invalida el link anterior. El gremio ve sus obras, pagos y fotos.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
