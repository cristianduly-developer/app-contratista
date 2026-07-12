import { useState } from 'react'
import { supabase, mensajeErrorGuardado } from '../../../lib/supabase'
import Modal from './Modal'

export default function NotaModal({ obraId, userId, gremiosAsig, onClose, onDone }) {
  const [texto, setTexto] = useState('')
  const [gremioId, setGremioId] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (!texto.trim()) return
    setGuardando(true)
    const { error } = await supabase.from('notas_obra').insert({
      user_id: userId, obra_id: obraId, texto: texto.trim(),
      gremio_id: gremioId || null,
    })
    if (error) { mensajeErrorGuardado(error); setGuardando(false); return }
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Nota agregada', type: 'success' } }))
    onDone()
  }

  return (
    <Modal onClose={onClose} title="Nueva nota">
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Nota *</label>
          <textarea value={texto} onChange={e => setTexto(e.target.value)}
            placeholder="Escribí tu nota..." rows={3} autoFocus
            className="w-full rounded-xl px-4 py-3 text-white text-[13px] outline-none resize-none"
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
        <button onClick={guardar} disabled={guardando || !texto.trim()}
          className="w-full py-3 rounded-xl text-white font-bold text-[14px] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>
          {guardando ? 'Guardando...' : 'Guardar nota'}
        </button>
      </div>
    </Modal>
  )
}
