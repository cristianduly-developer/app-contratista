import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Crown, Zap, Shield } from 'lucide-react'
import { usePlan } from '../../lib/PlanContext'
import { useAuth } from '../../lib/useAuth'
import { verificarSuscripcion } from '../../lib/useSuscripcion'
import { supabase } from '../../lib/supabase'

const WA_SOPORTE = '5492236965481'

const PLAN_META = {
  basico:      { label: 'Básico',      color: '#6B7280', icon: Shield, emoji: '🔩' },
  profesional: { label: 'Profesional', color: '#F97316', icon: Zap,    emoji: '⚡' },
  premium:     { label: 'Premium',     color: '#A855F7', icon: Crown,  emoji: '🚀' },
}

const FEATURES_LIST = [
  { label: 'Obras activas',       basico: '3',    profesional: '6',          premium: 'Ilimitadas' },
  { label: 'Gremios',             basico: '5',    profesional: '8',          premium: 'Ilimitados' },
  { label: 'Calculadora por m²',  basico: true,   profesional: true,         premium: true },
  { label: 'Pagos y cobros',      basico: true,   profesional: true,         premium: true },
  { label: 'Vista viernes',       basico: true,   profesional: true,         premium: true },
  { label: 'Links públicos',      basico: false,  profesional: true,         premium: true },
  { label: 'Fotos de obra',       basico: false,  profesional: true,         premium: true },
  { label: 'Notas y alertas',     basico: true,   profesional: true,         premium: true },
  { label: 'Materiales por obra', basico: true,   profesional: true,         premium: true },
  { label: 'Soporte prioritario', basico: false,  profesional: false,        premium: true },
]

export default function MiPlan() {
  const navigate = useNavigate()
  const { plan } = usePlan()
  const { user } = useAuth()
  const [sus, setSus] = useState(null)
  const [planes, setPlanes] = useState([])
  const [procesando, setProcesando] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    verificarSuscripcion().then(setSus)
    fetch('/api/planes-precios').then(r => r.json()).then(d => {
      if (d.planes) setPlanes(d.planes)
    }).catch(() => {})
  }, [])

  const meta = PLAN_META[plan] || PLAN_META.basico
  const Icon = meta.icon
  const diasRestantes = sus?.dias_restantes
  const esDemo = sus?.estado === 'demo'
  const esActivo = sus?.estado === 'activo'

  async function suscribirse(planElegido) {
    setProcesando(true)
    setMsg(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/mp-crear-suscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan: planElegido }),
      })
      const d = await r.json()
      if (d.init_point) { window.location.href = d.init_point }
      else setMsg({ tipo: 'error', texto: d.error || 'No se pudo iniciar el pago.' })
    } catch { setMsg({ tipo: 'error', texto: 'Error de conexión.' }) }
    setProcesando(false)
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0A0A0F' }}>
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: '#0A0A0F' }}>
        <button onClick={() => navigate(-1)} aria-label="Volver"
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <ArrowLeft size={18} color="#9CA3AF" />
        </button>
        <h1 className="text-white font-bold text-[18px]">Mi plan</h1>
      </div>

      <div className="px-4">
        {/* Plan actual */}
        <div className="rounded-2xl p-5 mb-4 text-center"
          style={{ background: meta.color + '12', border: `1px solid ${meta.color}30` }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: meta.color + '20' }}>
            <span className="text-3xl">{meta.emoji}</span>
          </div>
          <h2 className="font-bold text-[20px] mb-1" style={{ color: meta.color }}>
            Plan {meta.label}
          </h2>
          {esDemo && diasRestantes != null && (
            <p className="text-yellow-400 text-[13px] font-semibold">
              Demo · {diasRestantes} día{diasRestantes !== 1 ? 's' : ''} restante{diasRestantes !== 1 ? 's' : ''}
            </p>
          )}
          {esActivo && (
            <p className="text-green-400 text-[12px]">Suscripción activa</p>
          )}
          {!esDemo && !esActivo && sus?.estado && (
            <p className="text-gray-400 text-[12px]">{sus.estado}</p>
          )}
        </div>

        {/* Tabla de features */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <div className="grid grid-cols-4 gap-0 px-3 py-2 border-b" style={{ borderColor: '#2A2A3A' }}>
            <span className="text-gray-500 text-[10px] font-semibold">Función</span>
            {['basico', 'profesional', 'premium'].map(p => {
              const m = PLAN_META[p]
              return (
                <span key={p} className="text-center text-[10px] font-bold"
                  style={{ color: plan === p ? m.color : '#6B7280' }}>
                  {m.label}
                  {plan === p && <span className="block text-[8px]">← Tu plan</span>}
                </span>
              )
            })}
          </div>
          {FEATURES_LIST.map((f, i) => (
            <div key={i} className="grid grid-cols-4 gap-0 px-3 py-2.5 border-b last:border-0"
              style={{ borderColor: '#1E1E2E' }}>
              <span className="text-gray-400 text-[11px]">{f.label}</span>
              {['basico', 'profesional', 'premium'].map(p => {
                const val = f[p]
                return (
                  <div key={p} className="text-center">
                    {val === true ? (
                      <Check size={14} className="mx-auto" color="#22C55E" />
                    ) : val === false ? (
                      <span className="text-gray-500 text-[12px]">—</span>
                    ) : (
                      <span className="text-white text-[11px] font-medium">{val}</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Precios + botón suscribirse */}
        {planes.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {planes.map(p => {
              const m = PLAN_META[p.plan]
              if (!m) return null
              const esMio = plan === p.plan && esActivo
              return (
                <div key={p.plan} className="rounded-xl p-3"
                  style={{
                    background: esMio ? m.color + '15' : '#13131A',
                    border: `1px solid ${esMio ? m.color : '#2A2A3A'}`,
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{m.emoji}</span>
                      <span className="font-semibold text-[13px]" style={{ color: m.color }}>{m.label}</span>
                    </div>
                    <span className="text-white font-bold text-[14px]">
                      ${Number(p.precio_mensual).toLocaleString('es-AR')}
                      <span className="text-gray-500 font-normal text-[11px]">/mes</span>
                    </span>
                  </div>
                  {!esMio && (
                    <button onClick={() => suscribirse(p.plan)}
                      disabled={procesando}
                      className="w-full mt-2 py-2 rounded-lg font-bold text-[12px] text-white"
                      style={{ background: m.color, opacity: procesando ? 0.6 : 1 }}>
                      {procesando ? '...' : 'Suscribirme'}
                    </button>
                  )}
                  {esMio && (
                    <p className="text-center text-green-400 text-[11px] mt-2 font-semibold">Plan actual</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {msg && (
          <div className="rounded-xl p-3 mb-3 text-center text-[12px]"
            style={{ background: msg.tipo === 'error' ? '#7F1D1D' : '#14532D', color: 'white' }}>
            {msg.texto}
          </div>
        )}

        <p className="text-gray-500 text-[10px] text-center mb-3">
          El pago se procesa por Mercado Pago. Se renueva automáticamente cada mes.
        </p>

        <a href={`https://wa.me/${WA_SOPORTE}?text=${encodeURIComponent('Hola, quiero consultar sobre mi plan de App Contratista')}`}
          target="_blank" rel="noopener noreferrer"
          className="w-full py-3 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 mb-3"
          style={{ background: '#13131A', border: '1px solid #2A2A3A', color: '#9CA3AF' }}>
          Consultar por WhatsApp
        </a>

        <p className="text-gray-500 text-[10px] text-center">
          Para cancelar tu suscripción, contactá a soporte
        </p>
      </div>
    </div>
  )
}
