import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Briefcase, Users, CalendarCheck, Settings, HelpCircle, CreditCard, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const LINKS = [
  { path: '/',        icon: Home,          label: 'Inicio' },
  { path: '/obras',   icon: Briefcase,     label: 'Obras' },
  { path: '/gremios', icon: Users,         label: 'Gremios' },
  { path: '/viernes', icon: CalendarCheck, label: 'Pagos semanales' },
  null,
  { path: '/miplan',        icon: CreditCard, label: 'Mi plan' },
  { path: '/configuracion', icon: Settings,   label: 'Configuración' },
  { path: '/ayuda',         icon: HelpCircle, label: 'Ayuda', external: true },
]

export default function Sidebar({ plan, estadoSus, diasRestantes }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r py-6 px-3 gap-1"
      style={{ background: '#0D0D14', borderColor: '#2A2A3A' }}>
      <div className="flex items-center gap-2.5 px-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#F97316', boxShadow: '0 0 20px rgba(249,115,22,0.3)' }}>
          <span className="text-lg">🏗</span>
        </div>
        <span className="text-white font-bold text-[15px]">Contratista</span>
      </div>

      {estadoSus === 'demo' && diasRestantes != null && (
        <div className="mx-2 mb-3 rounded-xl px-3 py-2 text-center text-[11px] font-semibold"
          style={{ background: '#78350F', color: '#FCD34D' }}>
          ⏳ Demo · {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
        </div>
      )}

      {LINKS.map((link, i) => {
        if (!link) return <div key={i} className="my-2 border-t" style={{ borderColor: '#1E1E2E' }} />
        const active = link.path === '/' ? pathname === '/' : pathname.startsWith(link.path)
        const Icon = link.icon
        return link.external ? (
          <a key={link.path} href={link.path}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors no-underline"
            style={{ color: '#9CA3AF' }}>
            <Icon size={18} strokeWidth={1.6} />
            {link.label}
          </a>
        ) : (
          <button key={link.path} onClick={() => navigate(link.path)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors text-left"
            style={{
              background: active ? 'rgba(249,115,22,0.12)' : 'transparent',
              color: active ? '#F97316' : '#9CA3AF',
            }}>
            <Icon size={18} strokeWidth={active ? 2.2 : 1.6} />
            {link.label}
          </button>
        )
      })}

      <div className="mt-auto px-3 pt-4 border-t flex flex-col gap-2" style={{ borderColor: '#1E1E2E' }}>
        <p className="text-[10px] text-gray-500">Plan: {plan}</p>
        <button onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors text-left"
          style={{ color: '#EF4444' }}>
          <LogOut size={15} strokeWidth={1.6} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
