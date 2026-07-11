import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import * as Sentry from '@sentry/react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import { verificarSuscripcion } from './lib/useSuscripcion'
import { supabase } from './lib/supabase'

const WA_SOPORTE = '5492235767784'
import { PlanContext } from './lib/PlanContext'
import BottomNav from './components/ui/BottomNav'
import Sidebar from './components/ui/Sidebar'
import ErrorBoundary from './components/ui/ErrorBoundary'
import UpdatePrompt from './components/ui/UpdatePrompt'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'

const Inicio       = lazy(() => import('./pages/Inicio'))
const Obras        = lazy(() => import('./pages/obras/Obras'))
const Gremios      = lazy(() => import('./pages/gremios/Gremios'))
const VistaViernes = lazy(() => import('./pages/VistaViernes'))
const Mas          = lazy(() => import('./pages/mas/Mas'))
const Calculadora  = lazy(() => import('./pages/calculadora/Calculadora'))
const ObraForm     = lazy(() => import('./pages/obras/ObraForm'))
const ObraDetalle  = lazy(() => import('./pages/obras/ObraDetalle'))
const GremioForm    = lazy(() => import('./pages/gremios/GremioForm'))
const GremioPublico = lazy(() => import('./pages/gremios/GremioPublico'))
const MiPlan        = lazy(() => import('./pages/mas/MiPlan'))
const Configuracion = lazy(() => import('./pages/mas/Configuracion'))

export default function App() {
  const { user, loading, perfil } = useAuth()
  const [suscripcion, setSuscripcion] = useState(null)
  const [checkingAcceso, setCheckingAcceso] = useState(false)
  const [notif, setNotif] = useState(null)
  const notifTimer = useRef(null)
  const [onboardingVisto, setOnboardingVisto] = useState(
    () => !!localStorage.getItem('onboarding_seen')
  )

  const verificar = useCallback(() => {
    if (!user) { setSuscripcion(null); setCheckingAcceso(false); return }
    setCheckingAcceso(true)
    verificarSuscripcion().then(result => {
      setSuscripcion(result)
      setCheckingAcceso(false)
    })
  }, [user?.id])

  useEffect(() => { verificar() }, [verificar])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') verificarSuscripcion({ esLogin: true }).catch(() => {})
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(verificar, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user?.id])

  if (loading || (user && checkingAcceso)) return <Splash />

  const tieneAcceso   = !user ? false : suscripcion?.tiene_acceso === true
  const estadoSus     = suscripcion?.estado || null
  const diasRestantes = suscripcion?.dias_restantes ?? null
  const orgIdBloqueo  = suscripcion?.org_id || suscripcion?.ret_org_id || null
  const planRaw       = suscripcion?.plan || 'basico'
  const plan          = (planRaw === 'demo' || planRaw === 'trial' || planRaw === 'sincargo') ? 'profesional' : planRaw

  const nombreUsuario = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'ahí'

  function finalizarOnboarding() {
    localStorage.setItem('onboarding_seen', '1')
    setOnboardingVisto(true)
  }

  const pantalla = !tieneAcceso
    ? (suscripcion === null
        ? 'registro'
        : (estadoSus === 'demo' && (diasRestantes ?? 0) <= 0)
          ? 'demo_vencido'
          : (estadoSus === 'impago' || estadoSus === 'suspendido' || estadoSus === 'cancelado')
            ? 'suspendido'
            : 'registro')
    : 'app'

  return (
    <BrowserRouter>
      <ToastBanner />
      <UpdatePrompt />
      <ErrorBoundary>
      <Suspense fallback={<Splash />}>
      <Routes>
        {/* link público del gremio — sin auth */}
        <Route path="/g/:token" element={<GremioPublico />} />

        <Route path="*" element={
          !user ? (
            <div className="flex flex-col h-full items-center justify-center" style={{ background: '#0D0D14' }}>
              <div className="w-full max-w-md"><Login /></div>
            </div>
          ) : pantalla === 'registro' ? (
            <div className="flex flex-col h-full overflow-y-auto items-center" style={{ background: '#0D0D14' }}>
              <div className="w-full max-w-md"><PantallaRegistro email={user.email} onRegistrado={verificar} /></div>
            </div>
          ) : pantalla === 'demo_vencido' ? (
            <div className="flex flex-col h-full overflow-y-auto items-center" style={{ background: '#0D0D14' }}>
              <div className="w-full max-w-md">
                <SelectorPlanesMP orgId={orgIdBloqueo}
                  titulo="Tu prueba gratuita venció"
                  subtitulo="Activá un plan para seguir gestionando tus obras y gremios."
                  emoji="⏳"
                  onSignOut={() => supabase.auth.signOut()} />
              </div>
            </div>
          ) : pantalla === 'suspendido' ? (
            <div className="flex flex-col h-full overflow-y-auto items-center" style={{ background: '#0D0D14' }}>
              <div className="w-full max-w-md">
                <SelectorPlanesMP orgId={orgIdBloqueo}
                  titulo={estadoSus === 'impago' ? 'Suscripción vencida' : estadoSus === 'cancelado' ? 'Suscripción cancelada' : 'Cuenta suspendida'}
                  subtitulo={estadoSus === 'impago' ? 'Regularizá tu pago para reactivar el acceso.' : 'Reactivá tu suscripción para recuperar el acceso.'}
                  emoji={estadoSus === 'impago' ? '💳' : '🔒'}
                  onSignOut={() => supabase.auth.signOut()} />
              </div>
            </div>
          ) : !onboardingVisto && !perfil?.nombre ? (
            <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#0D0D14' }}>
              <Onboarding
                nombre={nombreUsuario}
                diasRestantes={diasRestantes}
                onFinalizar={finalizarOnboarding}
              />
            </div>
          ) : (
            <PlanContext.Provider value={plan}>
            <div className="flex h-full relative">
              <Sidebar plan={plan} estadoSus={estadoSus} diasRestantes={diasRestantes} />
              <div className="flex flex-col flex-1 min-w-0 relative">
              {estadoSus === 'demo' && diasRestantes != null && (
                <div className="text-center py-2 text-[11px] font-semibold z-50 md:hidden"
                  style={{ background: '#78350F', color: '#FCD34D' }}>
                  ⏳ Versión demo · vence en {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
                </div>
              )}
              <Routes>
                <Route path="/" element={<Inicio plan={plan} />} />
                <Route path="/obras" element={<Obras />} />
                <Route path="/obras/nueva" element={<ObraForm />} />
                <Route path="/obras/:id" element={<ObraDetalle />} />
                <Route path="/obras/:id/editar" element={<ObraForm />} />
                <Route path="/gremios" element={<Gremios />} />
                <Route path="/gremios/nuevo" element={<GremioForm />} />
                <Route path="/gremios/:id/editar" element={<GremioForm />} />
                <Route path="/viernes" element={<VistaViernes />} />
                <Route path="/mas" element={<Mas plan={plan} />} />
                <Route path="/calculadora" element={<Calculadora />} />
                <Route path="/miplan" element={<MiPlan />} />
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="*" element={<PlaceholderPage />} />
              </Routes>
              <BottomNav />
              </div>
            </div>
            </PlanContext.Provider>
          )
        } />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

function ToastBanner() {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      clearTimeout(timerRef.current)
      setToast(e.detail)
      timerRef.current = setTimeout(() => setToast(null), 4000)
    }
    window.addEventListener('app:toast', handler)
    return () => { window.removeEventListener('app:toast', handler); clearTimeout(timerRef.current) }
  }, [])

  if (!toast) return null
  const isError = toast.type === 'error'
  return (
    <div className="fixed top-4 left-4 right-4 z-[300] rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{
        background: isError ? '#EF4444' : '#22C55E',
        boxShadow: `0 8px 32px ${isError ? 'rgba(239,68,68,.4)' : 'rgba(34,197,94,.4)'}`,
        maxWidth: 430, margin: '0 auto',
      }}>
      <span className="text-xl">{isError ? '⚠️' : '✓'}</span>
      <p className="text-white font-semibold text-[13px] flex-1">{toast.msg}</p>
      <button onClick={() => setToast(null)} className="text-white/70 text-lg leading-none">✕</button>
    </div>
  )
}

function Splash() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ background: '#0D0D14' }}>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ background: '#F97316', boxShadow: '0 0 40px rgba(249,115,22,0.4)' }}>
        <span className="text-4xl">🏗</span>
      </div>
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#F97316' }} />
    </div>
  )
}

function PlaceholderPage({ texto }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 pb-24" style={{ background: '#0A0A0F' }}>
      <span className="text-5xl">🚧</span>
      <p className="text-white font-semibold">{texto || 'Próximamente'}</p>
      <p className="text-gray-500 text-sm">Esta pantalla está en desarrollo</p>
    </div>
  )
}

function PantallaRegistro({ email, onRegistrado }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function empezarDemo() {
    setCargando(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('no_auth')

      const res = await fetch('/api/registrar-demo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'error_servidor')

      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 1500))
        const result = await import('./lib/useSuscripcion').then(m => m.verificarSuscripcion())
        if (result?.tiene_acceso) { onRegistrado(); return }
      }

      setError('El acceso tardó más de lo esperado. Intentá recargar la página.')
      setCargando(false)
    } catch (e) {
      setError(e.message === 'no_auth' ? 'Sesión expirada, volvé a ingresar.' : 'Ocurrió un error. Intentá de nuevo.')
      setCargando(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full pb-12 px-5">
      <div className="flex flex-col items-center pt-16 pb-8 text-center">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(249,115,22,.15)', border: '2px solid rgba(249,115,22,.4)' }}>
          <span className="text-5xl">🏗</span>
        </div>
        <h1 className="text-white font-bold text-[26px] mb-2">Probá App Contratista</h1>
        <p className="text-gray-400 text-[14px] max-w-xs">
          28 días gratis con todas las funciones del plan Profesional. Sin tarjeta de crédito.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        {[
          { icon: '🔢', texto: 'Calculadora por m² para presupuestar rápido' },
          { icon: '🏗', texto: 'Gestión completa de obras y estados' },
          { icon: '👷', texto: 'Agenda de gremios con pagos y saldos' },
          { icon: '🔗', texto: 'Links públicos para cada gremio' },
          { icon: '💰', texto: 'Vista viernes: pagos semanales de un vistazo' },
        ].map(f => (
          <div key={f.texto} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <span className="text-xl">{f.icon}</span>
            <span className="text-gray-300 text-[13px]">{f.texto}</span>
            <span className="ml-auto text-green-400 text-[12px] font-bold">✓</span>
          </div>
        ))}
      </div>

      <button onClick={empezarDemo} disabled={cargando}
        className="w-full py-4 rounded-2xl font-bold text-[16px] text-white transition-all active:opacity-80 disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}>
        {cargando ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Activando prueba...
          </span>
        ) : 'Empezar prueba gratis'}
      </button>

      {error && <p className="text-red-400 text-[12px] text-center mt-3">{error}</p>}

      <button onClick={() => supabase.auth.signOut()}
        className="text-gray-600 text-[11px] underline text-center mx-auto block mt-6">
        Cerrar sesión ({email})
      </button>
    </div>
  )
}

function SelectorPlanesMP({ orgId, titulo, subtitulo, emoji, onSignOut }) {
  const [planes,   setPlanes]   = useState([])
  const [planSel,  setPlanSel]  = useState('profesional')
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    fetch('/api/planes-precios').then(r => r.json()).then(d => {
      if (d.planes?.length) {
        const metas = {
          basico:      { label: 'Básico',      color: '#6B7280', emoji: '🔩' },
          profesional: { label: 'Profesional', color: '#F97316', emoji: '⚡' },
          premium:     { label: 'Premium',     color: '#A855F7', emoji: '🚀' },
        }
        const ordenados = ['basico', 'profesional', 'premium'].map(id => {
          const row = d.planes.find(p => p.plan === id)
          if (!row) return null
          return { id, ...metas[id], precio: '$' + Number(row.precio_mensual).toLocaleString('es-AR'), beneficios: row.beneficios || [] }
        }).filter(Boolean)
        setPlanes(ordenados)
      }
    }).catch(() => {})
  }, [])

  const pagar = async () => {
    if (!orgId) { setError('No se encontró tu organización. Intentá de nuevo.'); return }
    setCargando(true); setError('')
    try {
      const r = await fetch('/api/mp-pago-publico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, plan: planSel }),
      })
      const data = await r.json()
      if (!r.ok || !data.init_point) { setError(data.error || 'Error al iniciar el pago.'); setCargando(false); return }
      window.location.href = data.init_point
    } catch { setError('Error de conexión. Intentá de nuevo.'); setCargando(false) }
  }

  const planInfo = planes.find(p => p.id === planSel)

  return (
    <div className="flex flex-col min-h-full pb-12 px-5 pt-10" style={{ background: '#0D0D14' }}>
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">{emoji}</div>
        <h1 className="text-white font-bold text-[20px] mb-2">{titulo}</h1>
        <p className="text-gray-400 text-[13px] max-w-xs mx-auto">{subtitulo}</p>
      </div>

      {planes.map(p => (
        <div key={p.id} onClick={() => setPlanSel(p.id)}
          className="rounded-2xl p-4 mb-3 cursor-pointer transition-all"
          style={{ border: `2px solid ${planSel === p.id ? p.color : '#1E1E2E'}`, background: planSel === p.id ? p.color + '12' : '#161622' }}>
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-[15px]" style={{ color: p.color }}>{p.emoji} {p.label}</span>
            <span className="font-black text-white text-[15px]">{p.precio}<span className="text-gray-500 font-normal text-[11px]">/mes</span></span>
          </div>
          {p.beneficios?.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {p.beneficios.map((b, i) => (
                <li key={i} className="text-[11px] text-gray-400 flex items-center gap-1.5">
                  <span style={{ color: p.color }}>✓</span>{b}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <div className="rounded-xl p-3 mb-4 text-[11px] text-orange-300"
        style={{ background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)' }}>
        💳 El pago se procesa por <strong>Mercado Pago</strong>. Se renueva automáticamente cada mes.
      </div>

      {error && <p className="text-red-400 text-[12px] mb-3 text-center">{error}</p>}

      <button onClick={pagar} disabled={cargando || !planInfo}
        className="w-full py-4 rounded-2xl font-bold text-[15px] text-white mb-3 disabled:opacity-60"
        style={{ background: cargando ? '#1E2A3A' : 'linear-gradient(135deg,#F97316,#EA580C)' }}>
        {cargando ? 'Redirigiendo...' : `Suscribirme — Plan ${planInfo?.label ?? planSel}`}
      </button>

      <button onClick={onSignOut} className="text-gray-600 text-[11px] underline text-center mx-auto block">
        Volver al inicio de sesión
      </button>
    </div>
  )
}
