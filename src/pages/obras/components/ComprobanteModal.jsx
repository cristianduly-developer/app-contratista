import { useState } from 'react'
import { Upload } from 'lucide-react'
import { supabase, mensajeErrorGuardado } from '../../../lib/supabase'
import Modal from './Modal'

export default function ComprobanteModal({ obraId, userId, gremiosAsig, onClose, onDone }) {
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [gremioId, setGremioId] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (!archivo) return
    setGuardando(true)
    const ext = archivo.name.split('.').pop()
    const path = `${userId}/${obraId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, archivo)
    if (upErr) { mensajeErrorGuardado(upErr); setGuardando(false); return }

    const { data: { publicUrl } } = supabase.storage.from('comprobantes').getPublicUrl(path)
    const { error } = await supabase.from('comprobantes_obra').insert({
      user_id: userId, obra_id: obraId, url: publicUrl,
      descripcion: descripcion.trim(), monto: Number(monto) || 0,
      gremio_id: gremioId || null,
    })
    if (error) { mensajeErrorGuardado(error); setGuardando(false); return }
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Comprobante agregado', type: 'success' } }))
    onDone()
  }

  return (
    <Modal onClose={onClose} title="Nuevo comprobante">
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Foto / archivo *</label>
          <label className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold cursor-pointer"
            style={{ border: '1px dashed #F97316', color: '#F97316' }}>
            <Upload size={16} />
            {archivo ? archivo.name : 'Seleccionar archivo'}
            <input type="file" accept="image/*,.pdf" onChange={e => setArchivo(e.target.files?.[0] || null)} className="hidden" />
          </label>
        </div>
        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Descripción</label>
          <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
            placeholder="Ej: Factura materiales"
            className="w-full rounded-xl px-4 py-3 text-white text-[13px] outline-none"
            style={{ background: '#0A0A0F', border: '1px solid #2A2A3A' }} />
        </div>
        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Monto</label>
          <input type="number" inputMode="numeric" min="0" value={monto} onChange={e => setMonto(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none"
            style={{ background: '#0A0A0F', border: '1px solid #2A2A3A' }} />
        </div>
        {gremiosAsig.length > 0 && (
          <div>
            <label className="text-gray-500 text-[11px] block mb-1">Gremio (opcional)</label>
            <select value={gremioId} onChange={e => setGremioId(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white text-[13px] outline-none appearance-none"
              style={{ background: '#0A0A0F', border: '1px solid #2A2A3A' }}>
              <option value="">General</option>
              {gremiosAsig.map(og => (
                <option key={og.gremio_id} value={og.gremio_id}>{og.gremios?.nombre || 'Gremio'}</option>
              ))}
            </select>
          </div>
        )}
        <button onClick={guardar} disabled={guardando || !archivo}
          className="w-full py-3 rounded-xl text-white font-bold text-[14px] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
          {guardando ? 'Subiendo...' : 'Guardar comprobante'}
        </button>
      </div>
    </Modal>
  )
}
