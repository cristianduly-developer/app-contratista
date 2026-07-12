import { useState } from 'react'
import { Plus, Trash2, Share2 } from 'lucide-react'
import { fmt, fmtFecha } from '../../../lib/fmt'

export default function TabComprobantes({ comprobantes, onBorrar, onAgregar }) {
  const [seleccionados, setSeleccionados] = useState([])

  function toggleSel(id) {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function compartirSeleccionados() {
    const items = seleccionados.length > 0
      ? comprobantes.filter(c => seleccionados.includes(c.id))
      : comprobantes
    const texto = items.map(c =>
      `• ${c.descripcion || 'Comprobante'} — ${fmt(c.monto)} (${fmtFecha(c.fecha)})${c.gremios?.nombre ? ' · ' + c.gremios.nombre : ''}\n  ${c.url}`
    ).join('\n\n')
    const msg = `Comprobantes de obra:\n\n${texto}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const total = comprobantes.reduce((s, c) => s + Number(c.monto || 0), 0)

  return (
    <div>
      <button onClick={onAgregar}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mb-3 text-[13px] font-semibold"
        style={{ border: '1px dashed #F97316', color: '#F97316' }}>
        <Plus size={16} /> Agregar comprobante
      </button>

      {comprobantes.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400 text-[12px]">Total: <span className="text-white font-bold">{fmt(total)}</span></span>
          <button onClick={compartirSeleccionados}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
            style={{ background: '#25D36618', color: '#25D366', border: '1px solid #25D36630' }}>
            <Share2 size={12} /> Enviar {seleccionados.length > 0 ? `(${seleccionados.length})` : 'todos'}
          </button>
        </div>
      )}

      {comprobantes.length === 0 ? (
        <p className="text-gray-500 text-[12px] text-center py-4">Sin comprobantes</p>
      ) : comprobantes.map(c => (
        <div key={c.id} className="rounded-xl p-3 mb-2 flex items-start gap-3"
          style={{ background: '#13131A', border: `1px solid ${seleccionados.includes(c.id) ? '#F97316' : '#2A2A3A'}` }}>
          <button onClick={() => toggleSel(c.id)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${seleccionados.includes(c.id) ? 'border-orange-500 bg-orange-500/20' : 'border-gray-600'}`}>
            {seleccionados.includes(c.id) && <span className="text-orange-400 text-[10px]">✓</span>}
          </button>
          <a href={c.url} target="_blank" rel="noopener noreferrer"
            className="w-12 h-12 rounded-lg overflow-hidden border border-gray-700 shrink-0">
            <img src={c.url} alt="" className="w-full h-full object-cover" loading="lazy"
              onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#1C1C27"><span style="font-size:16px">📄</span></div>' }} />
          </a>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-medium truncate">{c.descripcion || 'Comprobante'}</p>
            <p className="text-gray-500 text-[11px]">{fmtFecha(c.fecha)}{c.gremios?.nombre ? ` · ${c.gremios.nombre}` : ''}</p>
            <p className="text-orange-400 text-[12px] font-semibold">{fmt(c.monto)}</p>
          </div>
          <button onClick={() => onBorrar(c.id, c.url)} aria-label="Eliminar comprobante"
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: '#EF444412' }}>
            <Trash2 size={12} color="#EF4444" />
          </button>
        </div>
      ))}
    </div>
  )
}
