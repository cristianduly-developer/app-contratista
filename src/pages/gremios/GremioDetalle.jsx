import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit3, Phone, Link2, Copy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { usePlan } from '../../lib/PlanContext'
import { fmt, fmtFecha, waMe } from '../../lib/fmt'
import Spinner from '../../components/Spinner'

const STATUS_LABELS = {
  presupuestada: { label: 'Presupuestada', color: '#6B7280' },
  en_ejecucion:  { label: 'En ejecución',  color: '#F97316' },
  finalizada:    { label: 'Finalizada',     color: '#22C55E' },
}

export default function GremioDetalle() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const { features } = usePlan()

  const [gremio, setGremio] = useState(null)
  const [obras, setObras] = useState([])
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!user || !id) return
    Promise.all([
      supabase.from('gremios_resumen').select('*').eq('id', id).single(),
      supabase.from('obra_gremios').select('*, obras:obra_id(id, nombre, status, cliente_nombre, precio_inversor)').eq('gremio_id', id),
      supabase.from('pagos_gremios').select('*, obras:obra_id(nombre)').eq('gremio_id', id).order('fecha', { ascending: false }),
    ]).then(([gRes, ogRes, pRes]) => {
      setGremio(gRes.data)
      setObras(ogRes.data || [])
      setPagos(pRes.data || [])
      setLoading(false)
    }).catch(() => { setLoading(false) })
  }, [id, user?.id])

  if (loading) return <Spinner />

  if (!gremio) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ background: '#0A0A0F' }}>
        <p className="text-gray-400">Gremio no encontrado</p>
        <button onClick={() => navigate('/gremios')} className="text-orange-400 text-[13px] underline">Volver</button>
      </div>
    )
  }

  const activas = obras.filter(og => og.obras && og.obras.status !== 'finalizada')
  const historial = obras.filter(og => og.obras && og.obras.status === 'finalizada')

  function copiarLink() {
    const url = `${window.location.origin}/g/${gremio.token_link}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0A0A0F' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: '#0A0A0F' }}>
        <button onClick={() => navigate('/gremios')} aria-label="Volver"
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <ArrowLeft size={18} color="#9CA3AF" />
        </button>
        <h1 className="text-white font-bold text-[16px] flex-1 truncate">{gremio.nombre}</h1>
        <button onClick={() => navigate(`/gremios/${id}/editar`)} aria-label="Editar gremio"
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <Edit3 size={16} color="#F97316" />
        </button>
      </div>

      <div className="px-4">
        {/* Info */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: '#F9731618' }}>
              <span className="text-2xl">👷</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-[16px] truncate">{gremio.nombre}</h2>
              {gremio.tipo && <p className="text-gray-500 text-[12px]">{gremio.tipo}</p>}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="rounded-lg px-3 py-2" style={{ background: '#0A0A0F' }}>
              <p className="text-gray-500 text-[9px]">Acordado</p>
              <p className="text-white text-[13px] font-bold">{fmt(gremio.total_acordado)}</p>
            </div>
            <div className="rounded-lg px-3 py-2" style={{ background: '#0A0A0F' }}>
              <p className="text-gray-500 text-[9px]">Pagado</p>
              <p className="text-red-400 text-[13px] font-bold">{fmt(gremio.total_pagado)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {gremio.total_adicionales > 0 && (
              <div className="rounded-lg px-3 py-2" style={{ background: '#0A0A0F' }}>
                <p className="text-gray-500 text-[9px]">Adicionales</p>
                <p className="text-yellow-400 text-[13px] font-bold">{fmt(gremio.total_adicionales)}</p>
              </div>
            )}
            <div className="rounded-lg px-3 py-2" style={{ background: '#0A0A0F' }}>
              <p className="text-gray-500 text-[9px]">Saldo</p>
              <p className={`text-[13px] font-bold ${gremio.saldo_pendiente > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {fmt(gremio.saldo_pendiente)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {gremio.telefono && (
              <a href={waMe(gremio.telefono)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium"
                style={{ background: '#25D36618', color: '#25D366', border: '1px solid #25D36630' }}>
                <Phone size={14} /> WhatsApp
              </a>
            )}
            {features.links_publicos && gremio.token_link && (
              <button onClick={copiarLink}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium"
                style={{ background: '#3B82F618', color: '#3B82F6', border: '1px solid #3B82F630' }}>
                {copiado ? <><Copy size={14} /> Copiado!</> : <><Link2 size={14} /> Copiar link</>}
              </button>
            )}
          </div>
        </div>

        {/* Obras activas */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-[14px]">Obras activas</h2>
          <span className="text-gray-500 text-[11px]">{activas.length}</span>
        </div>

        {activas.length === 0 ? (
          <div className="rounded-xl p-4 text-center mb-4" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
            <p className="text-gray-500 text-[12px]">Sin obras activas</p>
          </div>
        ) : activas.map(og => (
          <ObraGremioCard key={og.id} og={og} pagos={pagos.filter(p => p.obra_id === og.obra_id)} onNavigate={() => navigate(`/obras/${og.obra_id}`)} />
        ))}

        {/* Historial */}
        {historial.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3 mt-4">
              <h2 className="text-white font-semibold text-[14px]">Historial</h2>
              <span className="text-gray-500 text-[11px]">{historial.length} obra{historial.length !== 1 ? 's' : ''}</span>
            </div>
            {historial.map(og => (
              <ObraGremioCard key={og.id} og={og} pagos={pagos.filter(p => p.obra_id === og.obra_id)} onNavigate={() => navigate(`/obras/${og.obra_id}`)} />
            ))}
          </>
        )}

        {/* Últimos pagos */}
        {pagos.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3 mt-4">
              <h2 className="text-white font-semibold text-[14px]">Últimos pagos</h2>
            </div>
            {pagos.slice(0, 10).map(p => (
              <div key={p.id} className="rounded-xl p-3 mb-2 flex items-center justify-between"
                style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
                <div>
                  <p className="text-white text-[13px] font-medium">{fmt(p.monto)}</p>
                  <p className="text-gray-500 text-[10px]">{p.obras?.nombre} · {fmtFecha(p.fecha)}</p>
                </div>
                <span className="text-gray-500 text-[10px] capitalize">{p.metodo}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function ObraGremioCard({ og, pagos, onNavigate }) {
  const obra = og.obras
  if (!obra) return null
  const st = STATUS_LABELS[obra.status] || STATUS_LABELS.presupuestada
  const pagado = pagos.reduce((s, p) => s + Number(p.monto || 0), 0)

  return (
    <button onClick={onNavigate}
      className="w-full text-left rounded-xl p-3 mb-2 active:scale-[.98] transition-all"
      style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-white text-[13px] font-semibold truncate flex-1 mr-2">{obra.nombre}</h3>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ color: st.color, background: st.color + '18' }}>
          {st.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <span className="text-gray-500">Acordado: </span>
          <span className="text-white font-medium">{fmt(og.monto_acordado)}</span>
        </div>
        <div>
          <span className="text-gray-500">Pagado: </span>
          <span className="text-red-400 font-medium">{fmt(pagado)}</span>
        </div>
      </div>
    </button>
  )
}
