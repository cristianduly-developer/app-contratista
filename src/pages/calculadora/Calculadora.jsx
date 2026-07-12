import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, RefreshCw } from 'lucide-react'
import { supabase, mensajeErrorGuardado } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { fmt } from '../../lib/fmt'
import Spinner from '../../components/Spinner'

const GREMIOS_DEFAULT = [
  { emoji: '🧱', tipo: 'Albañilería' },
  { emoji: '⚡', tipo: 'Electricidad' },
  { emoji: '🔧', tipo: 'Plomería' },
  { emoji: '🎨', tipo: 'Pintura' },
  { emoji: '🪵', tipo: 'Carpintería' },
  { emoji: '🔥', tipo: 'Gas' },
  { emoji: '❄️', tipo: 'Aire acondicionado' },
  { emoji: '🪟', tipo: 'Herrería / Aluminio' },
]

export default function Calculadora() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [m2, setM2] = useState('')
  const [precios, setPrecios] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [nuevoTipo, setNuevoTipo] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('precios_m2')
      .select('tipo_gremio, precio_por_m2')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const saved = data || []
        const merged = GREMIOS_DEFAULT.map(g => {
          const found = saved.find(s => s.tipo_gremio === g.tipo)
          return { tipo: g.tipo, emoji: g.emoji, precio: found ? String(found.precio_por_m2) : '' }
        })
        const extras = saved
          .filter(s => !GREMIOS_DEFAULT.some(g => g.tipo === s.tipo_gremio))
          .map(s => ({ tipo: s.tipo_gremio, emoji: '🔨', precio: String(s.precio_por_m2) }))
        setPrecios([...merged, ...extras])
        setLoading(false)
      })
  }, [user?.id])

  function actualizarPrecio(idx, valor) {
    setPrecios(prev => prev.map((p, i) => i === idx ? { ...p, precio: valor } : p))
  }

  function eliminarGremio(idx) {
    setPrecios(prev => prev.filter((_, i) => i !== idx))
  }

  function agregarGremio() {
    const tipo = nuevoTipo.trim()
    if (!tipo || precios.some(p => p.tipo.toLowerCase() === tipo.toLowerCase())) return
    setPrecios(prev => [...prev, { tipo, emoji: '🔨', precio: '' }])
    setNuevoTipo('')
  }

  async function guardarPrecios() {
    setGuardando(true)
    const rows = precios
      .filter(p => p.precio && Number(p.precio) > 0)
      .map(p => ({ user_id: user.id, tipo_gremio: p.tipo, precio_por_m2: Number(p.precio) }))

    const { error } = await supabase
      .from('precios_m2')
      .upsert(rows, { onConflict: 'user_id,tipo_gremio' })

    if (error) {
      mensajeErrorGuardado(error)
    } else {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Precios guardados', type: 'success' } }))
    }
    setGuardando(false)
  }

  const m2Num = Number(m2) || 0
  const items = precios.filter(p => Number(p.precio) > 0)
  const totalPorM2 = items.reduce((s, p) => s + Number(p.precio), 0)
  const totalObra = totalPorM2 * m2Num

  if (loading) return <Spinner />

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0A0A0F' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: '#0A0A0F' }}>
        <button onClick={() => navigate(-1)} aria-label="Volver"
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <ArrowLeft size={18} color="#9CA3AF" />
        </button>
        <h1 className="text-white font-bold text-[18px] flex-1">Calculadora por m²</h1>
        <button onClick={guardarPrecios} disabled={guardando}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
          style={{ background: '#F9731618', color: '#F97316', border: '1px solid #F9731630' }}>
          <Save size={14} />
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="px-4">
        {/* Input m² */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <label className="text-gray-500 text-[11px] block mb-2">Metros cuadrados de la obra</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={m2}
              onChange={e => setM2(e.target.value)}
              placeholder="Ej: 120"
              className="flex-1 rounded-xl px-4 py-3 text-white text-[18px] font-bold outline-none"
              style={{ background: '#0A0A0F', border: '1px solid #2A2A3A' }}
            />
            <span className="text-gray-500 text-[14px] font-medium">m²</span>
          </div>
        </div>

        {/* Resumen rápido */}
        {m2Num > 0 && items.length > 0 && (
          <div className="rounded-2xl p-4 mb-4"
            style={{ background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.25)' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-[12px]">Total por m²</span>
              <span className="text-orange-400 font-bold text-[14px]">{fmt(totalPorM2)}/m²</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-[12px]">Costo total ({m2Num} m²)</span>
              <span className="text-white font-black text-[22px]">{fmt(totalObra)}</span>
            </div>
          </div>
        )}

        {/* Lista de gremios */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-[14px]">Precios por gremio</h2>
          <button onClick={() => setPrecios(prev => prev.map(p => ({ ...p, precio: '' })))}
            className="text-gray-500 text-[11px] flex items-center gap-1">
            <RefreshCw size={12} /> Limpiar
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {precios.map((p, i) => (
            <div key={p.tipo} className="flex items-center gap-2 px-3 py-3 rounded-2xl"
              style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
              <span className="text-lg w-7 text-center shrink-0">{p.emoji}</span>
              <span className="text-gray-300 text-[13px] flex-1 min-w-0 truncate">{p.tipo}</span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-gray-500 text-[12px]">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={p.precio}
                  onChange={e => actualizarPrecio(i, e.target.value)}
                  placeholder="0"
                  className="w-[72px] rounded-lg px-2 py-1.5 text-white text-[13px] text-right outline-none"
                  style={{ background: '#0A0A0F', border: '1px solid #2A2A3A' }}
                />
                <span className="text-gray-500 text-[10px]">/m²</span>
              </div>
              {m2Num > 0 && Number(p.precio) > 0 && (
                <span className="text-orange-400 text-[11px] font-semibold w-[60px] text-right shrink-0">
                  {fmt(Number(p.precio) * m2Num)}
                </span>
              )}
              {!GREMIOS_DEFAULT.some(g => g.tipo === p.tipo) && (
                <button onClick={() => eliminarGremio(i)} className="text-red-400/50 hover:text-red-400 ml-1 shrink-0">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Agregar gremio custom */}
        <div className="flex items-center gap-2 mb-6">
          <input
            type="text"
            value={nuevoTipo}
            onChange={e => setNuevoTipo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarGremio()}
            placeholder="Agregar gremio..."
            className="flex-1 rounded-xl px-3 py-2.5 text-white text-[13px] outline-none"
            style={{ background: '#13131A', border: '1px solid #2A2A3A' }}
          />
          <button onClick={agregarGremio} disabled={!nuevoTipo.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30"
            style={{ background: '#F9731618', border: '1px solid #F9731630' }}>
            <Plus size={18} color="#F97316" />
          </button>
        </div>

        {/* Desglose */}
        {m2Num > 0 && items.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
            <h3 className="text-white font-semibold text-[13px] mb-3">Desglose para {m2Num} m²</h3>
            <div className="flex flex-col gap-2">
              {items.map(p => (
                <div key={p.tipo} className="flex justify-between items-center">
                  <span className="text-gray-400 text-[12px] flex items-center gap-2">
                    <span>{p.emoji}</span>{p.tipo}
                  </span>
                  <span className="text-white text-[13px] font-medium">{fmt(Number(p.precio) * m2Num)}</span>
                </div>
              ))}
              <div className="border-t border-gray-800 pt-2 mt-1 flex justify-between items-center">
                <span className="text-orange-400 font-bold text-[13px]">Total estimado</span>
                <span className="text-orange-400 font-black text-[18px]">{fmt(totalObra)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
