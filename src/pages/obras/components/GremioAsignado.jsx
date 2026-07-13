import { useState } from 'react'
import { Trash2, DollarSign, PlusCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { fmt, fmtFecha } from '../../../lib/fmt'

const GREMIO_STATUS = {
  pendiente:  { label: 'Pendiente',  color: '#6B7280' },
  en_trabajo: { label: 'En trabajo', color: '#F97316' },
  terminado:  { label: 'Terminado',  color: '#22C55E' },
}

export default function GremioAsignado({ og, onStatusChange, onMontoChange, onDesasignar, onPagar, onAdicional, onBorrarAdicional, pagos, adicionales = [] }) {
  const [editMonto, setEditMonto] = useState(false)
  const [monto, setMonto] = useState(String(og.monto_acordado || ''))
  const [showAdicionales, setShowAdicionales] = useState(false)
  const gremio = og.gremios || {}
  const gs = GREMIO_STATUS[og.status] || GREMIO_STATUS.pendiente
  const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const totalAdicionales = adicionales.reduce((s, a) => s + Number(a.monto), 0)
  const costoReal = (og.monto_acordado || 0) + totalAdicionales
  const saldo = costoReal - totalPagado

  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">👷</span>
          <div>
            <p className="text-white text-[14px] font-semibold">{gremio.nombre || 'Gremio'}</p>
            {gremio.tipo && <p className="text-gray-500 text-[11px]">{gremio.tipo}</p>}
          </div>
        </div>
        <select value={og.status} onChange={e => onStatusChange(og.id, e.target.value)}
          className="text-[10px] font-semibold px-2 py-1 rounded-full outline-none appearance-none cursor-pointer"
          style={{ color: gs.color, background: gs.color + '18', border: 'none' }}>
          {Object.entries(GREMIO_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Presupuesto original */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gray-500 text-[11px]">Acordado:</span>
        {editMonto ? (
          <div className="flex items-center gap-1">
            <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
              className="w-24 rounded-lg px-2 py-1 text-white text-[12px] outline-none"
              style={{ background: '#0A0A0F', border: '1px solid #2A2A3A' }} />
            <button onClick={() => { onMontoChange(og.id, monto); setEditMonto(false) }}
              className="text-orange-400 text-[11px] font-semibold">OK</button>
          </div>
        ) : (
          <button onClick={() => setEditMonto(true)}
            className="text-white text-[12px] font-medium underline decoration-dashed">
            {og.monto_acordado ? fmt(og.monto_acordado) : 'Sin definir'}
          </button>
        )}
      </div>

      {/* Adicionales */}
      {totalAdicionales > 0 && (
        <div className="mb-1">
          <button onClick={() => setShowAdicionales(!showAdicionales)}
            className="flex items-center gap-1 text-[11px] text-yellow-400 font-medium">
            Adicionales: {fmt(totalAdicionales)} ({adicionales.length})
            {showAdicionales ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showAdicionales && (
            <div className="mt-1 ml-2 border-l-2 border-yellow-400/30 pl-2">
              {adicionales.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-gray-300 text-[11px]">{a.motivo}</span>
                    <span className="text-gray-500 text-[10px] ml-1">({fmtFecha(a.fecha)})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-400 text-[11px] font-medium">+{fmt(a.monto)}</span>
                    <button onClick={() => onBorrarAdicional(a.id)} aria-label="Eliminar adicional"
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: '#EF444412' }}>
                      <Trash2 size={10} color="#EF4444" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Costo real (solo si hay adicionales) */}
      {totalAdicionales > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-500 text-[11px]">Costo real:</span>
          <span className="text-orange-400 text-[12px] font-bold">{fmt(costoReal)}</span>
        </div>
      )}

      {/* Pagado / Saldo */}
      {costoReal > 0 && (
        <div className="flex items-center gap-4 text-[11px] mb-3">
          <span className="text-gray-500">Pagado: <span className="text-red-400 font-medium">{fmt(totalPagado)}</span></span>
          <span className="text-gray-500">Saldo: <span className={`font-medium ${saldo > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{fmt(saldo)}</span></span>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onPagar}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold"
          style={{ background: '#F9731612', color: '#F97316', border: '1px solid #F9731630' }}>
          <DollarSign size={12} /> Pagar
        </button>
        <button onClick={onAdicional}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold"
          style={{ background: '#EAB30812', color: '#EAB308', border: '1px solid #EAB30830' }}>
          <PlusCircle size={12} /> Adicional
        </button>
        <button onClick={() => onDesasignar(og.id)} aria-label="Desasignar gremio"
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: '#EF444412', border: '1px solid #EF444430' }}>
          <Trash2 size={14} color="#EF4444" />
        </button>
      </div>
    </div>
  )
}

export { GREMIO_STATUS }
