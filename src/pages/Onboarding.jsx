import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'

const GREMIOS_DEFAULT = [
  { emoji: '🔧', tipo: 'Plomería' },
  { emoji: '🎨', tipo: 'Pintura' },
  { emoji: '🧱', tipo: 'Albañilería' },
  { emoji: '⚡', tipo: 'Electricidad' },
  { emoji: '🪵', tipo: 'Carpintería' },
  { emoji: '🔥', tipo: 'Gas' },
  { emoji: '❄️', tipo: 'Aire acondicionado' },
  { emoji: '🪟', tipo: 'Herrería / Aluminio' },
]

const TOTAL = 4

export default function Onboarding({ nombre, diasRestantes, onFinalizar }) {
  const { user, actualizarPerfil } = useAuth()
  const [slide, setSlide] = useState(0)

  const [nombreVal, setNombreVal] = useState(
    user?.user_metadata?.full_name || ''
  )
  const [telefono, setTelefono] = useState('')
  const [ciudad, setCiudad] = useState('')

  const [precios, setPrecios] = useState(
    GREMIOS_DEFAULT.map(g => ({ ...g, precio: '' }))
  )

  const esUltimo = slide === TOTAL - 1

  function actualizarPrecio(idx, valor) {
    setPrecios(prev => prev.map((p, i) => i === idx ? { ...p, precio: valor } : p))
  }

  async function avanzar() {
    if (slide === 1) {
      actualizarPerfil({ nombre: nombreVal.trim(), telefono: telefono.trim(), ciudad: ciudad.trim() })
        .catch(() => {})
    }
    if (slide === 2) {
      const rows = precios
        .filter(p => p.precio && Number(p.precio) > 0)
        .map(p => ({ user_id: user.id, tipo_gremio: p.tipo, precio_por_m2: Number(p.precio) }))
      if (rows.length > 0) {
        supabase.from('precios_m2').upsert(rows, { onConflict: 'user_id,tipo_gremio' }).then(() => {})
      }
    }
    if (esUltimo) {
      onFinalizar()
      return
    }
    setSlide(s => s + 1)
  }

  return (
    <div className="flex flex-col h-full md:items-center" style={{ background: '#0D0D14' }}>
      <div className="flex flex-col h-full w-full max-w-md">
        {/* dots */}
        <div className="flex items-center justify-between px-6 pt-14 pb-6">
          <div className="flex gap-2">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div key={i} className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: i === slide ? 28 : 8, background: i === slide ? '#F97316' : '#2A2A3A' }} />
            ))}
          </div>
          {!esUltimo && (
            <button onClick={onFinalizar} className="text-gray-600 text-[13px] underline">
              Saltar
            </button>
          )}
        </div>

        {/* SLIDE 0 — Bienvenida */}
        {slide === 0 && (
          <div className="flex-1 flex flex-col px-6 overflow-y-auto pb-4">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(249,115,22,.12)', border: '1px solid rgba(249,115,22,.25)' }}>
                <span className="text-5xl">👋</span>
              </div>
              <h1 className="text-white font-bold text-[26px] leading-tight mb-2">
                ¡Hola, {nombre}!
              </h1>
              <p className="text-gray-400 text-[14px] max-w-xs">
                Tu acceso está activo. Te damos la bienvenida a App Contratista.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl px-5 py-4 flex items-center gap-4"
                style={{ background: 'rgba(249,115,22,.12)', border: '1px solid rgba(249,115,22,.3)' }}>
                <span className="text-3xl">🎯</span>
                <div>
                  <p className="text-orange-400 font-bold text-[15px]">Plan Profesional — Demo</p>
                  <p className="text-gray-400 text-[13px]">
                    {diasRestantes != null
                      ? `${diasRestantes} días de prueba gratis`
                      : '28 días de prueba gratis'}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl px-5 py-3 flex items-center gap-3"
                style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                <span className="text-xl">✅</span>
                <p className="text-gray-300 text-[13px]">Sin tarjeta de crédito requerida</p>
              </div>
              <div className="rounded-2xl px-5 py-3 flex items-center gap-3"
                style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                <span className="text-xl">🔓</span>
                <p className="text-gray-300 text-[13px]">Acceso completo a todas las funciones</p>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 1 — Datos personales */}
        {slide === 1 && (
          <div className="flex-1 flex flex-col px-6 overflow-y-auto pb-4">
            <div className="flex flex-col items-center text-center mb-7">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)' }}>
                <span className="text-4xl">👤</span>
              </div>
              <h1 className="text-white font-bold text-[24px] mb-1">Contanos sobre vos</h1>
              <p className="text-gray-400 text-[13px] max-w-xs">
                Estos datos te identifican como contratista en la app.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Campo label="Nombre completo o empresa *" value={nombreVal} onChange={setNombreVal} placeholder="Ej: Juan Pérez / Construcciones JP" />
              <Campo label="WhatsApp / Teléfono" value={telefono} onChange={setTelefono} placeholder="Ej: 223 567-7784" type="tel" />
              <Campo label="Ciudad" value={ciudad} onChange={setCiudad} placeholder="Ej: Mar del Plata, Buenos Aires..." />
            </div>
            <p className="text-gray-600 text-[11px] text-center mt-4">
              Podés completar más datos después en Configuración
            </p>
          </div>
        )}

        {/* SLIDE 2 — Precios por m² */}
        {slide === 2 && (
          <div className="flex-1 flex flex-col px-6 overflow-y-auto pb-4">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(249,115,22,.1)', border: '1px solid rgba(249,115,22,.25)' }}>
                <span className="text-4xl">🔢</span>
              </div>
              <h1 className="text-white font-bold text-[24px] mb-1">Precios por m²</h1>
              <p className="text-gray-400 text-[13px] max-w-xs">
                Configurá cuánto te cobra cada gremio por m². Esto acelera el presupuesto de obras nuevas.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {precios.map((p, i) => (
                <div key={p.tipo} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                  <span className="text-xl w-7 text-center">{p.emoji}</span>
                  <span className="text-gray-300 text-[13px] flex-1 min-w-0 truncate">{p.tipo}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-[13px]">$</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={p.precio}
                      onChange={e => actualizarPrecio(i, e.target.value)}
                      placeholder="0"
                      className="w-20 rounded-xl px-3 py-2 text-white text-[14px] text-right outline-none"
                      style={{ background: '#0A0A0F', border: '1px solid #2A2A3A' }}
                    />
                    <span className="text-gray-600 text-[11px]">/m²</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-[11px] text-center mt-3">
              Podés dejar vacíos los que no uses y editarlos después
            </p>
          </div>
        )}

        {/* SLIDE 3 — Listo */}
        {slide === 3 && (
          <div className="flex-1 flex flex-col px-6 overflow-y-auto pb-4">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.25)' }}>
                <span className="text-5xl">🚀</span>
              </div>
              <h1 className="text-white font-bold text-[26px] mb-2">¡Todo listo!</h1>
              <p className="text-gray-400 text-[14px] max-w-xs">
                Empezá creando tu primera obra — en 10 segundos tenés el presupuesto armado.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl px-5 py-4 text-center"
                style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)' }}>
                <p className="text-green-400 font-bold text-[14px] mb-1">Tu prueba vence en</p>
                <p className="text-white font-bold text-[48px] leading-none">{diasRestantes ?? 28}</p>
                <p className="text-gray-500 text-[13px] mt-1">días</p>
              </div>
              <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                <span className="text-xl">🔔</span>
                <p className="text-gray-300 text-[13px]">
                  Te avisamos cuando queden 5 días para que no pierdas tus datos
                </p>
              </div>
              <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                <span className="text-xl">💬</span>
                <p className="text-gray-300 text-[13px]">
                  Para activar tu plan o consultas, contactanos por WhatsApp
                </p>
              </div>
            </div>
          </div>
        )}

        {/* botón */}
        <div className="px-6 pb-10 pt-4 shrink-0">
          <button
            onClick={avanzar}
            disabled={slide === 1 && !nombreVal.trim()}
            className="w-full py-4 rounded-2xl text-white font-bold text-[16px] flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 4px 20px rgba(249,115,22,.4)' }}>
            {esUltimo
              ? '🚀 Ir a mi panel'
              : <>Siguiente <ChevronRight size={18} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-gray-500 text-[11px] block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
        style={{ background: '#161622', border: '1px solid #1E1E2E' }}
      />
    </div>
  )
}
