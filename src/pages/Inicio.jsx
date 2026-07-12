import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Briefcase, Users, DollarSign, TrendingUp, AlertTriangle, Plus, Calculator } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { fmt, fmtCorto } from '../lib/fmt'
import Spinner from '../components/Spinner'

export default function Inicio({ plan }) {
  const navigate = useNavigate()
  const { key } = useLocation()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      supabase.from('obras_resumen').select('*').eq('user_id', user.id),
      supabase.from('gremios_resumen').select('*').eq('user_id', user.id),
      supabase.from('alertas_obra').select('id').eq('user_id', user.id).eq('resuelta', false),
    ]).then(([obrasRes, gremiosRes, alertasRes]) => {
      const obras = obrasRes.data || []
      const gremios = gremiosRes.data || []
      const alertas = alertasRes.data || []

      const presupuestadas = obras.filter(o => o.status === 'presupuestada')
      const activas = obras.filter(o => o.status === 'en_ejecucion')
      const totalInversor = obras.reduce((s, o) => s + Number(o.precio_inversor || 0), 0)
      const totalCobrado = obras.reduce((s, o) => s + Number(o.cobrado_inversor || 0), 0)
      const totalPagado = obras.reduce((s, o) => s + Number(o.pagado_gremios || 0), 0)
      const totalMateriales = obras.reduce((s, o) => s + Number(o.total_materiales || 0), 0)
      const gananciaTotal = totalCobrado - totalPagado - totalMateriales
      const pendienteCobrar = totalInversor - totalCobrado
      const pendientePagar = gremios.reduce((s, g) => s + Number(g.saldo_pendiente || 0), 0)

      const hoy = new Date()
      const obrasVencidas = obras.filter(o =>
        o.fecha_fin_estimada && ['en_ejecucion', 'presupuestada'].includes(o.status) &&
        new Date(o.fecha_fin_estimada) < hoy
      )

      setData({
        obras, gremios, presupuestadas, activas, alertas: alertas.length,
        totalInversor, totalCobrado, totalPagado, totalMateriales,
        gananciaTotal, pendienteCobrar, pendientePagar,
        obrasVencidas,
      })
      setLoading(false)
    }).catch(() => { setLoading(false) })
  }, [user?.id, key])

  if (loading) return <Spinner />

  const d = data
  const nombre = user?.user_metadata?.full_name?.split(' ')[0] || 'Contratista'

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0A0A0F' }}>
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-white font-bold text-[22px]">Hola, {nombre}</h1>
        <p className="text-gray-500 text-[12px]">
          {d.activas.length} obra{d.activas.length !== 1 ? 's' : ''} en ejecución · {d.gremios.length} gremio{d.gremios.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="px-4">
        {/* Posición financiera */}
        <div className="rounded-2xl p-4 mb-4"
          style={{ background: 'rgba(249,115,22,.06)', border: '1px solid rgba(249,115,22,.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} color="#F97316" />
            <span className="text-orange-400 text-[12px] font-semibold">Posición financiera</span>
          </div>
          <div className="text-center mb-3">
            <p className="text-gray-500 text-[10px] mb-0.5">Ganancia neta acumulada</p>
            <p className={`font-black text-[28px] ${d.gananciaTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmt(d.gananciaTotal)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniKPI label="Por cobrar" value={fmtCorto(d.pendienteCobrar)} color="#3B82F6" />
            <MiniKPI label="Por pagar gremios" value={fmtCorto(d.pendientePagar)} color="#EF4444" />
            <MiniKPI label="Total cobrado" value={fmtCorto(d.totalCobrado)} color="#22C55E" />
            <MiniKPI label="Total materiales" value={fmtCorto(d.totalMateriales)} color="#A855F7" />
          </div>
        </div>

        {/* Obras vencidas */}
        {d.obrasVencidas.length > 0 && (
          <div className="rounded-xl p-3 mb-3 flex items-start gap-2"
            style={{ background: '#EF444412', border: '1px solid #EF444430' }}>
            <AlertTriangle size={16} color="#EF4444" className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 text-[12px] font-medium mb-1">
                {d.obrasVencidas.length} obra{d.obrasVencidas.length > 1 ? 's' : ''} pasó la fecha de entrega
              </p>
              {d.obrasVencidas.map(o => (
                <p key={o.id} className="text-red-300/70 text-[11px]">• {o.nombre}</p>
              ))}
            </div>
          </div>
        )}

        {/* Alertas */}
        {d.alertas > 0 && (
          <div className="rounded-xl p-3 mb-4 flex items-center gap-2"
            style={{ background: '#EF444412', border: '1px solid #EF444430' }}>
            <AlertTriangle size={16} color="#EF4444" />
            <span className="text-red-400 text-[12px] font-medium flex-1">
              {d.alertas} alerta{d.alertas > 1 ? 's' : ''} pendiente{d.alertas > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <QuickAction icon={Plus} label="Nueva obra" color="#F97316" onClick={() => navigate('/obras/nueva')} />
          <QuickAction icon={Calculator} label="Calculadora" color="#3B82F6" onClick={() => navigate('/calculadora')} />
        </div>

        {/* Obras presupuestadas */}
        {d.presupuestadas.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-[14px]">Presupuestadas</h2>
              <button onClick={() => navigate('/obras')} className="text-orange-400 text-[12px] font-medium">Ver todas</button>
            </div>
            {d.presupuestadas.map(o => (
              <button key={o.id} onClick={() => navigate(`/obras/${o.id}`)}
                className="w-full text-left rounded-xl p-3 mb-2 active:scale-[.98] transition-all"
                style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white text-[13px] font-semibold truncate flex-1 mr-2">{o.nombre}</h3>
                  <span className="text-gray-400 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#6B728018' }}>Presupuestada</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Inversor: <span className="text-white font-medium">{fmtCorto(o.precio_inversor)}</span></span>
                  {o.cliente_nombre && <span className="text-gray-500">{o.cliente_nombre}</span>}
                </div>
              </button>
            ))}
          </>
        )}

        {/* Obras en ejecución */}
        <div className="flex items-center justify-between mb-3 mt-2">
          <h2 className="text-white font-semibold text-[14px]">En ejecución</h2>
          <button onClick={() => navigate('/obras')} className="text-orange-400 text-[12px] font-medium">Ver todas</button>
        </div>

        {d.activas.length === 0 ? (
          <div className="rounded-2xl p-6 text-center mb-4" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
            <p className="text-gray-500 text-[13px]">No hay obras en ejecución</p>
          </div>
        ) : d.activas.map(o => (
          <button key={o.id} onClick={() => navigate(`/obras/${o.id}`)}
            className="w-full text-left rounded-xl p-3 mb-2 active:scale-[.98] transition-all"
            style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-white text-[13px] font-semibold truncate flex-1 mr-2">{o.nombre}</h3>
              <span className="text-orange-400 text-[11px] font-bold">{o.porcentaje_avance || 0}%</span>
            </div>
            <div className="h-1 rounded-full mb-2" style={{ background: '#2A2A3A' }}>
              <div className="h-full rounded-full" style={{ width: `${o.porcentaje_avance || 0}%`, background: '#F97316' }} />
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Inversor: <span className="text-white font-medium">{fmtCorto(o.precio_inversor)}</span></span>
              <span className="text-gray-500">Ganancia: <span className={o.ganancia_neta >= 0 ? 'text-green-400' : 'text-red-400'}>{fmtCorto(o.ganancia_neta)}</span></span>
            </div>
          </button>
        ))}

        {/* Gremios con saldo */}
        {d.gremios.filter(g => g.saldo_pendiente > 0).length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3 mt-4">
              <h2 className="text-white font-semibold text-[14px]">Gremios con saldo pendiente</h2>
              <button onClick={() => navigate('/gremios')} className="text-orange-400 text-[12px] font-medium">Ver todos</button>
            </div>
            {d.gremios.filter(g => g.saldo_pendiente > 0).slice(0, 5).map(g => (
              <div key={g.id} className="rounded-xl p-3 mb-2 flex items-center justify-between"
                style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">👷</span>
                  <div>
                    <p className="text-white text-[13px] font-medium">{g.nombre}</p>
                    {g.tipo && <p className="text-gray-500 text-[10px]">{g.tipo}</p>}
                  </div>
                </div>
                <span className="text-yellow-400 font-bold text-[13px]">{fmt(g.saldo_pendiente)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function MiniKPI({ label, value, color }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: '#0A0A0F' }}>
      <p className="text-gray-500 text-[9px]">{label}</p>
      <p className="font-bold text-[13px]" style={{ color }}>{value}</p>
    </div>
  )
}

function QuickAction({ icon: Icon, label, color, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-4 py-3 rounded-xl active:scale-[.98] transition-all"
      style={{ background: color + '12', border: `1px solid ${color}30` }}>
      <Icon size={16} color={color} />
      <span className="text-[12px] font-semibold" style={{ color }}>{label}</span>
    </button>
  )
}
