import { useState } from 'react'
import { supabase, mensajeErrorGuardado } from '../../../lib/supabase'
import Modal from './Modal'

export default function CobroModal({ obraId, userId, onClose, onDone }) {
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('efectivo')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (!monto || Number(monto) <= 0) return
    setGuardando(true)
    const { error } = await supabase.from('cobros_inversor').insert({
      user_id: userId, obra_id: obraId,
      monto: Number(monto), metodo, notas: notas.trim(),
    })
    if (error) { mensajeErrorGuardado(error); setGuardando(false); return }
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Cobro registrado', type: 'success' } }))
    onDone()
  }

  return (
    <Modal onClose={onClose} title="Cobro del inversor">
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Monto *</label>
          <input type="number" inputMode="numeric" min="0" value={monto} onChange={e => setMonto(e.target.value)}
            placeholder="0" autoFocus
            className="w-full rounded-xl px-4 py-3 text-white text-[16px] font-bold outline-none"
            style={{ background: '#0A0A0F', border: '1px solid #2A2A3A' }} />
        </div>
        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Método</label>
          <select value={metodo} onChange={e => setMetodo(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-white text-[13px] outline-none appearance-none"
            style={{ background: '#0A0A0F', border: '1px solid #2A2A3A' }}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>
        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Notas</label>
          <input type="text" value={notas} onChange={e => setNotas(e.target.value)}
            placeholder="Opcional" maxLength={200}
            className="w-full rounded-xl px-4 py-3 text-white text-[13px] outline-none"
            style={{ background: '#0A0A0F', border: '1px solid #2A2A3A' }} />
        </div>
        <button onClick={guardar} disabled={guardando || !monto}
          className="w-full py-3 rounded-xl text-white font-bold text-[14px] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
          {guardando ? 'Guardando...' : 'Registrar cobro'}
        </button>
      </div>
    </Modal>
  )
}
