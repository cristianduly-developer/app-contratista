import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { supabase, mensajeErrorGuardado } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'

const STATUS_OPTS = [
  { value: 'presupuestada', label: 'Presupuestada' },
  { value: 'en_ejecucion',  label: 'En ejecución' },
  { value: 'finalizada',    label: 'Finalizada' },
  { value: 'cobrada',       label: 'Cobrada' },
]

export default function ObraForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const esEditar = !!id

  const [form, setForm] = useState({
    nombre: '', direccion: '', m2: '', cliente_nombre: '',
    precio_inversor: '', status: 'presupuestada',
    fecha_inicio: '', fecha_fin_estimada: '', notas: '',
  })
  const [loading, setLoading] = useState(esEditar)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!esEditar || !user) return
    supabase.from('obras').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) setForm({
          nombre: data.nombre || '',
          direccion: data.direccion || '',
          m2: data.m2 ? String(data.m2) : '',
          cliente_nombre: data.cliente_nombre || '',
          precio_inversor: data.precio_inversor ? String(data.precio_inversor) : '',
          status: data.status || 'presupuestada',
          fecha_inicio: data.fecha_inicio || '',
          fecha_fin_estimada: data.fecha_fin_estimada || '',
          notas: data.notas || '',
        })
        setLoading(false)
      })
  }, [id, user?.id])

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function guardar() {
    if (!form.nombre.trim()) return
    setGuardando(true)

    if (esEditar) {
      const { error } = await supabase.from('obras').update({
        nombre: form.nombre.trim(),
        direccion: form.direccion.trim(),
        m2: Number(form.m2) || 0,
        cliente_nombre: form.cliente_nombre.trim(),
        precio_inversor: Number(form.precio_inversor) || 0,
        status: form.status,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin_estimada: form.fecha_fin_estimada || null,
        notas: form.notas.trim(),
      }).eq('id', id)

      if (error) { mensajeErrorGuardado(error); setGuardando(false); return }
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Obra actualizada', type: 'success' } }))
      navigate(`/obras/${id}`)
    } else {
      const { data, error } = await supabase.rpc('crear_obra_con_limite', {
        p_user_id: user.id,
        p_nombre: form.nombre.trim(),
        p_direccion: form.direccion.trim(),
        p_m2: Number(form.m2) || 0,
        p_cliente_nombre: form.cliente_nombre.trim(),
        p_precio_inversor: Number(form.precio_inversor) || 0,
        p_fecha_inicio: form.fecha_inicio || null,
        p_fecha_fin_est: form.fecha_fin_estimada || null,
      })

      if (error) {
        if (error.message?.includes('LIMITE_PLAN')) {
          window.dispatchEvent(new CustomEvent('app:toast', {
            detail: { msg: 'Alcanzaste el límite de obras de tu plan. Mejorá tu plan para agregar más.', type: 'error' }
          }))
        } else {
          mensajeErrorGuardado(error)
        }
        setGuardando(false)
        return
      }
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Obra creada', type: 'success' } }))
      navigate(`/obras/${data?.id}`)
    }
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
          {esEditar ? 'Editar obra' : 'Nueva obra'}
        </h1>
        <button onClick={guardar} disabled={guardando || !form.nombre.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold disabled:opacity-40"
          style={{ background: '#F9731618', color: '#F97316', border: '1px solid #F9731630' }}>
          <Save size={14} />
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="px-4 flex flex-col gap-3">
        <Campo label="Nombre de la obra *" value={form.nombre} onChange={v => set('nombre', v)} placeholder="Ej: Casa Pérez — Mar del Plata" />
        <Campo label="Dirección" value={form.direccion} onChange={v => set('direccion', v)} placeholder="Ej: Av. Colón 1234" />
        <Campo label="Cliente / Inversor" value={form.cliente_nombre} onChange={v => set('cliente_nombre', v)} placeholder="Nombre del cliente" />

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Metros cuadrados" value={form.m2} onChange={v => set('m2', v)} placeholder="0" type="number" />
          <Campo label="Precio inversor ($)" value={form.precio_inversor} onChange={v => set('precio_inversor', v)} placeholder="0" type="number" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Fecha inicio" value={form.fecha_inicio} onChange={v => set('fecha_inicio', v)} type="date" />
          <Campo label="Fecha fin estimada" value={form.fecha_fin_estimada} onChange={v => set('fecha_fin_estimada', v)} type="date" />
        </div>

        {esEditar && (
          <div>
            <label className="text-gray-500 text-[11px] block mb-1">Estado</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none appearance-none"
              style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Notas</label>
          <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
            placeholder="Notas internas..."
            rows={3}
            className="w-full rounded-2xl px-4 py-3 text-white text-[14px] outline-none resize-none"
            style={{ background: '#13131A', border: '1px solid #2A2A3A' }} />
        </div>
      </div>
    </div>
  )
}

function Campo({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-gray-500 text-[11px] block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
        style={{ background: '#13131A', border: '1px solid #2A2A3A' }} />
    </div>
  )
}
