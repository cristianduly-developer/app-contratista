import { useState } from 'react'
import { supabase, mensajeErrorGuardado } from '../../../lib/supabase'
import Modal from './Modal'

export default function AdicionalModal({ obraId, obraGremioId, gremioId, userId, onClose, onDone }) {
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (!monto || Number(monto) <= 0) return
    if (!motivo.trim()) return
    setGuardando(true)
    const { error } = await supabase.from('adicionales_gremio').insert({
      user_id: userId,
      obra_id: obraId,
      gremio_id: gremioId,
      obra_gremio_id: obraGremioId,
      monto: Number(monto),
      motivo: motivo.trim(),
    })
    if (error) mensajeErrorGuardado(error)
    else {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Adicional registrado', type: 'success' } }))
      onDone()
    }
    setGuardando(false)
  }

  return (
    <Modal onClose={onClose} title="Agregar adicional">
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Motivo</label>
          <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)}
            placeholder="Ej: Repintar puerta, material extra..."
            maxLength={200}
            className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
            style={{ background: '#13131A', border: '1px solid #2A2A3A' }} />
        </div>
        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Monto</label>
          <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
            placeholder="0" min="0"
            className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
            style={{ background: '#13131A', border: '1px solid #2A2A3A' }} />
        </div>
        <button onClick={guardar} disabled={guardando || !monto || !motivo.trim()}
          className="w-full py-3.5 rounded-2xl font-bold text-[14px] text-white mt-1"
          style={{ background: guardando ? '#666' : '#F97316', opacity: (!monto || !motivo.trim()) ? 0.5 : 1 }}>
          {guardando ? 'Guardando...' : 'Agregar adicional'}
        </button>
      </div>
    </Modal>
  )
}
