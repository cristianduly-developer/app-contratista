import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Phone, Link2, Copy, RefreshCw } from 'lucide-react'
import { supabase, mensajeErrorGuardado } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { usePlan } from '../../lib/PlanContext'
import { fmt, waMe } from '../../lib/fmt'

export default function Gremios() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { features } = usePlan()
  const [gremios, setGremios] = useState([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('gremios_resumen')
      .select('*')
      .eq('user_id', user.id)
      .order('nombre')
      .then(({ data }) => {
        setGremios(data || [])
        setLoading(false)
      })
  }, [user?.id])

  const filtrados = gremios.filter(g =>
    !buscar || g.nombre.toLowerCase().includes(buscar.toLowerCase())
    || (g.tipo || '').toLowerCase().includes(buscar.toLowerCase())
  )

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0A0A0F' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-white font-bold text-[22px]">Gremios</h1>
            <p className="text-gray-500 text-[12px]">{gremios.length} gremio{gremios.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => {
              const limite = features.max_gremios
              if (limite !== Infinity && gremios.length >= limite) { alert(`Tu plan permite hasta ${limite} gremios. Mejorá tu plan para agregar más.`); return }
              navigate('/gremios/nuevo')
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-[13px] text-white"
            style={{ background: features.max_gremios !== Infinity && gremios.length >= features.max_gremios ? '#6B7280' : 'linear-gradient(135deg, #F97316, #EA580C)' }}>
            <Plus size={16} /> Nuevo
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <Search size={16} color="#6B7280" />
          <input type="text" value={buscar} onChange={e => setBuscar(e.target.value)}
            placeholder="Buscar gremio..."
            className="flex-1 bg-transparent text-white text-[13px] outline-none" />
        </div>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#F97316' }} />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
            <span className="text-4xl block mb-3">👷</span>
            <p className="text-gray-400 text-[14px] mb-1">
              {gremios.length === 0 ? 'No tenés gremios' : 'Sin resultados'}
            </p>
            <p className="text-gray-600 text-[12px]">
              {gremios.length === 0 ? 'Agregá tu primer subcontratista' : 'Probá con otro nombre'}
            </p>
          </div>
        ) : filtrados.map(g => (
          <GremioCard key={g.id} gremio={g} features={features}
            onEdit={() => navigate(`/gremios/${g.id}/editar`)} />
        ))}
      </div>
    </div>
  )
}

function GremioCard({ gremio, features, onEdit }) {
  const [copiado, setCopiado] = useState(false)

  function copiarLink() {
    const url = `${window.location.origin}/g/${gremio.token_link}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#F9731618' }}>
            <span className="text-xl">👷</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-[14px] truncate">{gremio.nombre}</h3>
            {gremio.tipo && <p className="text-gray-500 text-[11px]">{gremio.tipo}</p>}
          </div>
        </div>
        <button onClick={onEdit} className="text-gray-500 text-[11px] underline shrink-0 ml-2">Editar</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <p className="text-gray-600 text-[10px]">Acordado</p>
          <p className="text-white text-[12px] font-semibold">{fmt(gremio.total_acordado)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-[10px]">Pagado</p>
          <p className="text-red-400 text-[12px] font-semibold">{fmt(gremio.total_pagado)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-[10px]">Saldo</p>
          <p className={`text-[12px] font-semibold ${gremio.saldo_pendiente > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {fmt(gremio.saldo_pendiente)}
          </p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        {gremio.telefono && (
          <a href={waMe(gremio.telefono)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium"
            style={{ background: '#25D36618', color: '#25D366', border: '1px solid #25D36630' }}>
            <Phone size={12} /> WhatsApp
          </a>
        )}
        {features.links_publicos && gremio.token_link && (
          <button onClick={copiarLink}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium"
            style={{ background: '#3B82F618', color: '#3B82F6', border: '1px solid #3B82F630' }}>
            {copiado ? <><Copy size={12} /> Copiado!</> : <><Link2 size={12} /> Copiar link</>}
          </button>
        )}
      </div>

      {gremio.obras_activas > 0 && (
        <p className="text-gray-600 text-[10px] mt-2">{gremio.obras_activas} obra{gremio.obras_activas > 1 ? 's' : ''} activa{gremio.obras_activas > 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
