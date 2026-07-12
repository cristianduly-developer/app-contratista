import { useState } from 'react'
import { Upload, Trash2 } from 'lucide-react'
import { supabase, mensajeErrorGuardado } from '../../../lib/supabase'

export default function TabFotos({ obraId, userId, fotos, onRefresh, onBorrar }) {
  const [subiendo, setSubiendo] = useState(false)

  async function subirFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/${obraId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('fotos-obras').upload(path, file)
    if (upErr) { mensajeErrorGuardado(upErr); setSubiendo(false); return }

    const { data: { publicUrl } } = supabase.storage.from('fotos-obras').getPublicUrl(path)
    const { error } = await supabase.from('fotos_obra').insert({
      user_id: userId, obra_id: obraId, url: publicUrl,
    })
    if (error) mensajeErrorGuardado(error)
    else window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Foto subida', type: 'success' } }))
    setSubiendo(false)
    onRefresh()
  }

  return (
    <div>
      <label className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mb-3 text-[13px] font-semibold cursor-pointer"
        style={{ border: '1px dashed #22C55E', color: '#22C55E' }}>
        <Upload size={16} />
        {subiendo ? 'Subiendo...' : 'Subir foto'}
        <input type="file" accept="image/*" onChange={subirFoto} className="hidden" disabled={subiendo} />
      </label>

      {fotos.length === 0 ? (
        <p className="text-gray-500 text-[12px] text-center py-4">Sin fotos</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map(f => (
            <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-800">
              <a href={f.url} target="_blank" rel="noopener noreferrer">
                <img src={f.url} alt={f.descripcion || ''} className="w-full h-full object-cover" loading="lazy" />
              </a>
              <button onClick={() => onBorrar(f.id, f.url)} aria-label="Eliminar foto"
                className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-black/60">
                <Trash2 size={10} color="#EF4444" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
