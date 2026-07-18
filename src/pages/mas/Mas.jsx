import { useNavigate } from 'react-router-dom'
import { Calculator, CreditCard, Settings, HelpCircle, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'

const WA_SOPORTE = '5492236965481'

const ITEMS = [
  { path: '/calculadora', icon: Calculator,    label: 'Calculadora por m²', color: '#F97316' },
  { path: '/miplan',      icon: CreditCard,    label: 'Mi plan',            color: '#3B82F6' },
  { path: '/configuracion', icon: Settings,    label: 'Configuración',      color: '#6B7280' },
  { path: '/ayuda',       icon: HelpCircle,    label: 'Ayuda',              color: '#22C55E', external: true },
]

export default function Mas({ plan }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const waMsg = encodeURIComponent(`Hola! Necesito soporte para App Contratista. Mi email: ${user?.email || 'no disponible'}. El problema que tuve es: `)

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-4 pt-12" style={{ background: '#0A0A0F' }}>
      <h1 className="text-white font-bold text-[22px] mb-6">Más</h1>

      <div className="flex flex-col gap-2 mb-6">
        {ITEMS.map(({ path, icon: Icon, label, color, external }) => (
          external ? (
            <a key={path} href={path}
              className="flex items-center gap-3 px-4 py-4 rounded-2xl text-left no-underline"
              style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
                <Icon size={18} color={color} />
              </div>
              <span className="text-white text-[14px] font-medium flex-1">{label}</span>
              <span className="text-gray-500 text-[18px]">›</span>
            </a>
          ) : (
            <button key={path} onClick={() => navigate(path)}
              className="flex items-center gap-3 px-4 py-4 rounded-2xl text-left"
              style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
                <Icon size={18} color={color} />
              </div>
              <span className="text-white text-[14px] font-medium flex-1">{label}</span>
              <span className="text-gray-500 text-[18px]">›</span>
            </button>
          )
        ))}
      </div>

      <a href={`https://wa.me/${WA_SOPORTE}?text=${waMsg}`}
        target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-4 rounded-2xl mb-6"
        style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#25D36618' }}>
          <MessageCircle size={18} color="#25D366" />
        </div>
        <span className="text-white text-[14px] font-medium flex-1">Contactar soporte</span>
        <span className="text-gray-500 text-[18px]">›</span>
      </a>

      <button onClick={() => supabase.auth.signOut()}
        className="w-full py-3 rounded-xl text-red-400 text-[13px] font-medium"
        style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
        Cerrar sesión
      </button>

      <p className="text-gray-700 text-[10px] text-center mt-4">Plan: {plan}</p>
    </div>
  )
}
