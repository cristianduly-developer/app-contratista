import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Briefcase, Users, CalendarCheck, MoreHorizontal } from 'lucide-react'

const TABS = [
  { path: '/',        icon: Home,           label: 'Inicio' },
  { path: '/obras',   icon: Briefcase,      label: 'Obras' },
  { path: '/gremios', icon: Users,          label: 'Gremios' },
  { path: '/viernes', icon: CalendarCheck,  label: 'Pagos' },
  { path: '/mas',     icon: MoreHorizontal, label: 'Más' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 safe-bottom"
      style={{ background: '#13131A', borderTop: '1px solid #2A2A3A', maxWidth: 430, margin: '0 auto' }}>
      <div className="flex justify-around items-center h-16">
        {TABS.map(({ path, icon: Icon, label }) => {
          const active = path === '/' ? pathname === '/' : pathname.startsWith(path)
          return (
            <button key={path} onClick={() => navigate(path)}
              className="flex flex-col items-center gap-0.5 px-3 py-1">
              <Icon size={20} color={active ? '#F97316' : '#6B7280'} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium" style={{ color: active ? '#F97316' : '#6B7280' }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
