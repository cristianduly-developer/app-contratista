import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { fmt, fmtFecha } from '../lib/fmt'

function getWeekRange(date) {
  const d = new Date(date)
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - ((day + 6) % 7))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
    label: `${mon.getDate()}/${mon.getMonth() + 1} — ${sun.getDate()}/${sun.getMonth() + 1}`,
  }
}

export default function VistaViernes() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [pagos, setPagos] = useState([])
  const [cobros, setCobros] = useState([])
  const [loading, setLoading] = useState(true)

  const semana = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + semanaOffset * 7)
    return getWeekRange(d)
  }, [semanaOffset])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      supabase.from('pagos_gremios')
        .select('*, gremios(nombre), obras(nombre)')
        .eq('user_id', user.id)
        .gte('fecha', semana.start)
        .lte('fecha', semana.end)
        .order('fecha', { ascending: false }),
      supabase.from('cobros_inversor')
        .select('*, obras(nombre)')
        .eq('user_id', user.id)
        .gte('fecha', semana.start)
        .lte('fecha', semana.end)
        .order('fecha', { ascending: false }),
    ]).then(([pagosRes, cobrosRes]) => {
      setPagos(pagosRes.data || [])
      setCobros(cobrosRes.data || [])
      setLoading(false)
    }).catch(() => { setLoading(false) })
  }, [user?.id, semana.start])

  const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const totalCobrado = cobros.reduce((s, c) => s + Number(c.monto), 0)
  const balance = totalCobrado - totalPagado

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0A0A0F' }}>
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-white font-bold text-[22px] mb-1">Vista Viernes</h1>
        <p className="text-gray-500 text-[12px]">Resumen semanal de pagos y cobros</p>
      </div>

      {/* Navegador de semana */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between rounded-xl p-3"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <button onClick={() => setSemanaOffset(s => s - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#0A0A0F' }}>
            <ChevronLeft size={16} color="#9CA3AF" />
          </button>
          <div className="text-center">
            <p className="text-white text-[13px] font-semibold">{semana.label}</p>
            <p className="text-gray-500 text-[10px]">
              {semanaOffset === 0 ? 'Esta semana' : semanaOffset === -1 ? 'Semana pasada' : semanaOffset === 1 ? 'Próxima semana' : ''}
            </p>
          </div>
          <button onClick={() => setSemanaOffset(s => s + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#0A0A0F' }}>
            <ChevronRight size={16} color="#9CA3AF" />
          </button>
        </div>
      </div>

      <div className="px-4">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl p-3 text-center" style={{ background: '#EF444412', border: '1px solid #EF444425' }}>
            <p className="text-gray-500 text-[10px] mb-0.5">Pagado</p>
            <p className="text-red-400 font-bold text-[15px]">{fmt(totalPagado)}</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: '#22C55E12', border: '1px solid #22C55E25' }}>
            <p className="text-gray-500 text-[10px] mb-0.5">Cobrado</p>
            <p className="text-green-400 font-bold text-[15px]">{fmt(totalCobrado)}</p>
          </div>
          <div className="rounded-xl p-3 text-center"
            style={{ background: balance >= 0 ? '#22C55E08' : '#EF444408', border: `1px solid ${balance >= 0 ? '#22C55E' : '#EF4444'}25` }}>
            <p className="text-gray-500 text-[10px] mb-0.5">Balance</p>
            <p className={`font-bold text-[15px] ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(balance)}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#F97316' }} />
          </div>
        ) : (
          <>
            {/* Pagos a gremios */}
            <div className="mb-4">
              <h2 className="text-white font-semibold text-[14px] mb-2 flex items-center gap-2">
                <DollarSign size={14} color="#EF4444" /> Pagos a gremios ({pagos.length})
              </h2>
              {pagos.length === 0 ? (
                <p className="text-gray-600 text-[12px] py-3 text-center">Sin pagos esta semana</p>
              ) : pagos.map(p => (
                <div key={p.id} className="rounded-xl p-3 mb-2 flex items-center justify-between"
                  style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-[13px] font-medium truncate">{p.gremios?.nombre || 'Gremio'}</p>
                    <p className="text-gray-500 text-[10px] truncate">
                      {p.obras?.nombre || 'Obra'} · {fmtFecha(p.fecha)} · {p.metodo}
                    </p>
                    {p.notas && <p className="text-gray-600 text-[10px] truncate">{p.notas}</p>}
                  </div>
                  <span className="text-red-400 font-bold text-[14px] ml-2 shrink-0">-{fmt(p.monto)}</span>
                </div>
              ))}
            </div>

            {/* Cobros del inversor */}
            <div>
              <h2 className="text-white font-semibold text-[14px] mb-2 flex items-center gap-2">
                <DollarSign size={14} color="#22C55E" /> Cobros del inversor ({cobros.length})
              </h2>
              {cobros.length === 0 ? (
                <p className="text-gray-600 text-[12px] py-3 text-center">Sin cobros esta semana</p>
              ) : cobros.map(c => (
                <div key={c.id} className="rounded-xl p-3 mb-2 flex items-center justify-between"
                  style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-[13px] font-medium truncate">{c.obras?.nombre || 'Obra'}</p>
                    <p className="text-gray-500 text-[10px]">{fmtFecha(c.fecha)} · {c.metodo}</p>
                    {c.notas && <p className="text-gray-600 text-[10px] truncate">{c.notas}</p>}
                  </div>
                  <span className="text-green-400 font-bold text-[14px] ml-2 shrink-0">+{fmt(c.monto)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Volver a hoy */}
        {semanaOffset !== 0 && (
          <button onClick={() => setSemanaOffset(0)}
            className="w-full py-2.5 rounded-xl text-orange-400 text-[12px] font-semibold mt-4"
            style={{ background: '#F9731612', border: '1px solid #F9731630' }}>
            Ir a esta semana
          </button>
        )}
      </div>
    </div>
  )
}
