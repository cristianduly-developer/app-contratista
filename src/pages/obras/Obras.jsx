import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Search, Filter } from 'lucide-react'
import { supabase, mensajeErrorGuardado } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { usePlan } from '../../lib/PlanContext'
import { fmt, fmtFecha } from '../../lib/fmt'

const STATUS_LABELS = {
  presupuestada: { label: 'Presupuestada', color: '#6B7280', bg: '#6B728018' },
  en_ejecucion:  { label: 'En ejecución',  color: '#F97316', bg: '#F9731618' },
  finalizada:    { label: 'Finalizada',     color: '#22C55E', bg: '#22C55E18' },
}

const FILTROS = ['todas', 'presupuestada', 'en_ejecucion', 'finalizada']

export default function Obras() {
  const navigate = useNavigate()
  const { key } = useLocation()
  const { user } = useAuth()
  const { features } = usePlan()
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const [showFiltros, setShowFiltros] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from('obras_resumen')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setObras(data || [])
        setLoading(false)
      }).catch(() => { setLoading(false) })
  }, [user?.id, key])

  const obrasFiltradas = obras
    .filter(o => filtro === 'todas' || o.status === filtro)
    .filter(o => !buscar || o.nombre.toLowerCase().includes(buscar.toLowerCase())
      || (o.cliente_nombre || '').toLowerCase().includes(buscar.toLowerCase()))

  const activas = obras.filter(o => o.status !== 'finalizada').length
  const limiteAlcanzado = features.max_obras !== Infinity && obras.length >= features.max_obras

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0A0A0F' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-white font-bold text-[22px]">Obras</h1>
            <p className="text-gray-500 text-[12px]">{obras.length} obra{obras.length !== 1 ? 's' : ''} · {activas} activa{activas !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => limiteAlcanzado ? alert(`Tu plan permite hasta ${features.max_obras} obras. Mejorá tu plan para crear más.`) : navigate('/obras/nueva')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-[13px] text-white"
            style={{ background: limiteAlcanzado ? '#6B7280' : 'linear-gradient(135deg, #F97316, #EA580C)' }}>
            <Plus size={16} /> Nueva
          </button>
        </div>

        {/* Buscador */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
            <Search size={16} color="#6B7280" />
            <input type="text" value={buscar} onChange={e => setBuscar(e.target.value)}
              placeholder="Buscar obra o cliente..."
              className="flex-1 bg-transparent text-white text-[13px] outline-none" />
          </div>
          <button onClick={() => setShowFiltros(!showFiltros)}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: showFiltros ? '#F9731618' : '#13131A', border: `1px solid ${showFiltros ? '#F97316' : '#2A2A3A'}` }}>
            <Filter size={16} color={showFiltros ? '#F97316' : '#6B7280'} />
          </button>
        </div>

        {/* Filtros */}
        {showFiltros && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {FILTROS.map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0"
                style={{
                  background: filtro === f ? '#F9731620' : '#13131A',
                  color: filtro === f ? '#F97316' : '#9CA3AF',
                  border: `1px solid ${filtro === f ? '#F97316' : '#2A2A3A'}`
                }}>
                {f === 'todas' ? 'Todas' : STATUS_LABELS[f]?.label || f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="px-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#F97316' }} />
          </div>
        ) : obrasFiltradas.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
            <span className="text-4xl block mb-3">🏗</span>
            <p className="text-gray-400 text-[14px] mb-1">
              {obras.length === 0 ? 'No tenés obras todavía' : 'Sin resultados'}
            </p>
            <p className="text-gray-500 text-[12px]">
              {obras.length === 0 ? 'Creá tu primera obra para empezar' : 'Probá con otro filtro'}
            </p>
          </div>
        ) : obrasFiltradas.map(o => (
          <ObraCard key={o.id} obra={o} onClick={() => navigate(`/obras/${o.id}`)} />
        ))}
      </div>
    </div>
  )
}

function getUrgencia(obra) {
  if (!obra.fecha_fin_estimada || !['en_ejecucion', 'presupuestada'].includes(obra.status)) return null
  const hoy = new Date()
  const fin = new Date(obra.fecha_fin_estimada)
  const dias = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24))
  if (dias < 0) return { color: '#EF4444', bg: '#EF444410', border: '#EF444425', label: `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}` }
  if (dias <= 7) return { color: '#EF4444', bg: '#EF444410', border: '#EF444425', label: `${dias} día${dias !== 1 ? 's' : ''} restante${dias !== 1 ? 's' : ''}` }
  if (dias <= 30) return { color: '#EAB308', bg: '#EAB30808', border: '#EAB30820', label: `${dias} días restantes` }
  return { color: '#22C55E', bg: '#22C55E08', border: '#22C55E20', label: `${dias} días restantes` }
}

function ObraCard({ obra, onClick }) {
  const s = STATUS_LABELS[obra.status] || STATUS_LABELS.presupuestada
  const avance = obra.porcentaje_avance || 0
  const urgencia = getUrgencia(obra)

  return (
    <button onClick={onClick} className="w-full text-left rounded-2xl p-4 transition-all active:scale-[.98]"
      style={{ background: urgencia?.bg || '#13131A', border: `1px solid ${urgencia?.border || '#2A2A3A'}` }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-white font-semibold text-[14px] truncate">{obra.nombre}</h3>
          {obra.cliente_nombre && (
            <p className="text-gray-500 text-[11px] truncate">{obra.cliente_nombre}</p>
          )}
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{ color: s.color, background: s.bg }}>
          {s.label}
        </span>
      </div>

      {/* Barra de avance */}
      {obra.status === 'en_ejecucion' && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-gray-500">Avance</span>
            <span className="text-orange-400 font-semibold">{avance}%</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: '#2A2A3A' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${avance}%`, background: '#F97316' }} />
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-gray-500 text-[10px]">Inversor</p>
          <p className="text-white text-[12px] font-semibold">{fmt(obra.precio_inversor)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px]">Pagado</p>
          <p className="text-red-400 text-[12px] font-semibold">{fmt(obra.pagado_gremios)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px]">Ganancia</p>
          <p className={`text-[12px] font-semibold ${obra.ganancia_neta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmt(obra.ganancia_neta)}
          </p>
        </div>
      </div>

      {/* Fechas */}
      {(obra.fecha_inicio || obra.fecha_fin_estimada) && (
        <div className="flex gap-3 mt-2 text-[10px]">
          {obra.fecha_inicio && <span className="text-gray-500">Inicio: <span className="text-gray-400">{fmtFecha(obra.fecha_inicio)}</span></span>}
          {obra.fecha_fin_estimada && <span className="text-gray-500">Fin est.: <span className="text-gray-400">{fmtFecha(obra.fecha_fin_estimada)}</span></span>}
        </div>
      )}

      {/* Urgencia */}
      {urgencia && (
        <div className="mt-2 text-[10px] font-medium flex items-center gap-1" style={{ color: urgencia.color }}>
          <span>{urgencia.color === '#EF4444' ? '🔴' : urgencia.color === '#EAB308' ? '🟡' : '🟢'}</span>
          {urgencia.label}
        </div>
      )}

      {obra.alertas_pendientes > 0 && (
        <div className="mt-1 text-[10px] text-yellow-400 flex items-center gap-1">
          <span>⚠️</span> {obra.alertas_pendientes} alerta{obra.alertas_pendientes > 1 ? 's' : ''}
        </div>
      )}
    </button>
  )
}
