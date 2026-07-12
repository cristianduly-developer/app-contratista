import { useState } from 'react'
import { supabase, mensajeErrorGuardado } from '../../../lib/supabase'
import Modal from './Modal'

export default function AlertaModal({ obraId, userId, onClose, onDone }) {
  const [desc, setDesc] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (!desc.trim()) return
    setGuardando(true)
    const { error } = await supabase.from('alertas_obra').insert({
      user_id: userId, obra_id: obraId, descripcion: desc.trim(),
    })
    if (error) { mensajeErrorGuardado(error); setGuardando(false); return }
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Alerta creada', type: 'success' } }))
    onDone()
  }

  return (
    <Modal onClose={onClose} title="Nueva alerta">
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Descripción *</label>
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Ej: Falta material en obra" autoFocus
            className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none"
            style={{ background: '#0A0A0F', border: '1px solid #2A2A3A' }} />
        </div>
        <button onClick={guardar} disabled={guardando || !desc.trim()}
          className="w-full py-3 rounded-xl text-white font-bold text-[14px] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
          {guardando ? 'Guardando...' : 'Crear alerta'}
        </button>
      </div>
    </Modal>
  )
}
