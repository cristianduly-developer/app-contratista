import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, User, Calculator } from 'lucide-react'
import { supabase, mensajeErrorGuardado } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import Spinner from '../../components/Spinner'
import Campo from '../../components/Campo'

export default function Configuracion() {
  const navigate = useNavigate()
  const { user, actualizarPerfil } = useAuth()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('perfiles').select('nombre, telefono, ciudad').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setNombre(data.nombre || '')
          setTelefono(data.telefono || '')
          setCiudad(data.ciudad || '')
        }
        setLoading(false)
      })
  }, [user?.id])

  async function guardar() {
    if (!nombre.trim()) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'El nombre no puede estar vacío', type: 'error' } })); return
    }
    setGuardando(true)
    try {
      await actualizarPerfil({ nombre: nombre.trim(), telefono: telefono.trim(), ciudad: ciudad.trim() })
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Perfil actualizado', type: 'success' } }))
    } catch (e) {
      mensajeErrorGuardado(e)
    }
    setGuardando(false)
  }

  if (loading) return <Spinner />

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0A0A0F' }}>
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: '#0A0A0F' }}>
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <ArrowLeft size={18} color="#9CA3AF" />
        </button>
        <h1 className="text-white font-bold text-[18px] flex-1">Configuración</h1>
        <button onClick={guardar} disabled={guardando}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
          style={{ background: '#F9731618', color: '#F97316', border: '1px solid #F9731630' }}>
          <Save size={14} />
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="px-4">
        {/* Perfil */}
        <div className="flex items-center gap-2 mb-3">
          <User size={16} color="#F97316" />
          <span className="text-white text-[14px] font-semibold">Datos personales</span>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <Campo label="Nombre / Empresa" value={nombre} onChange={setNombre} placeholder="Tu nombre o empresa" />
          <Campo label="Teléfono / WhatsApp" value={telefono} onChange={setTelefono} placeholder="Ej: 223 567-7784" type="tel" />
          <Campo label="Ciudad" value={ciudad} onChange={setCiudad} placeholder="Ej: Mar del Plata" />
        </div>

        <div className="border-t mb-4" style={{ borderColor: '#1E1E2E' }} />

        {/* Link a calculadora de precios */}
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={16} color="#3B82F6" />
          <span className="text-white text-[14px] font-semibold">Precios por m²</span>
        </div>
        <button onClick={() => navigate('/calculadora')}
          className="w-full rounded-xl p-4 text-left flex items-center justify-between"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <div>
            <p className="text-white text-[13px] font-medium">Editar precios por gremio</p>
            <p className="text-gray-500 text-[11px]">Configurá cuánto te cobra cada gremio por m²</p>
          </div>
          <span className="text-gray-600 text-[18px]">›</span>
        </button>

        <div className="border-t my-4" style={{ borderColor: '#1E1E2E' }} />

        {/* Cuenta */}
        <p className="text-gray-600 text-[11px] mb-2">Cuenta: {user?.email}</p>
      </div>
    </div>
  )
}

