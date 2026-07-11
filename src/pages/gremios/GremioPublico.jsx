import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fmt, fmtFecha } from '../../lib/fmt'

export default function GremioPublico() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.rpc('obtener_datos_gremio_por_token', { p_token: token })
      .then(({ data: result, error: err }) => {
        if (err || result?.error) {
          setError('Link inválido o expirado')
        } else {
          setData(result)
        }
        setLoading(false)
      })
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0D14' }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#F97316' }} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: '#0D0D14' }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: '#EF444418', border: '1px solid #EF444430' }}>
          <span className="text-4xl">🔗</span>
        </div>
        <h1 className="text-white font-bold text-[20px]">Link no válido</h1>
        <p className="text-gray-400 text-[13px] text-center max-w-xs">
          Este enlace no existe o fue regenerado por el contratista.
        </p>
      </div>
    )
  }

  const { gremio, obras } = data
  const obrasActivas = obras.filter(o => o.obra_status !== 'finalizada' && o.obra_status !== 'cobrada')
  const obrasFinalizadas = obras.filter(o => o.obra_status === 'finalizada' || o.obra_status === 'cobrada')
  const totalAcordado = obras.reduce((s, o) => s + Number(o.monto_acordado || 0), 0)
  const totalPagado = obras.reduce((s, o) => s + Number(o.total_pagado || 0), 0)
  const saldoTotal = totalAcordado - totalPagado
  const [showFinalizadas, setShowFinalizadas] = useState(false)

  return (
    <div className="min-h-screen pb-12" style={{ background: '#0D0D14' }}>
      {/* Header */}
      <div className="px-4 pt-8 pb-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
          style={{ background: '#F9731618', border: '1px solid #F9731630' }}>
          <span className="text-3xl">👷</span>
        </div>
        <h1 className="text-white font-bold text-[20px]">{gremio.nombre}</h1>
        {gremio.tipo && <p className="text-gray-400 text-[12px]">{gremio.tipo}</p>}
        <p className="text-gray-500 text-[11px] mt-1">Contratista: {gremio.contratista}</p>
      </div>

      <div className="px-4">
        {/* Resumen global */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(249,115,22,.06)', border: '1px solid rgba(249,115,22,.2)' }}>
          <p className="text-orange-400 text-[11px] font-semibold mb-2">Resumen de todas las obras</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-gray-500 text-[10px]">Total acordado</p>
              <p className="text-white font-bold text-[14px]">{fmt(totalAcordado)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-[10px]">Total pagado</p>
              <p className="text-green-400 font-bold text-[14px]">{fmt(totalPagado)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-[10px]">Saldo total</p>
              <p className={`font-bold text-[14px] ${saldoTotal > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {fmt(saldoTotal)}
              </p>
            </div>
          </div>
          <p className="text-gray-600 text-[10px] text-center mt-2">
            {obrasActivas.length} obra{obrasActivas.length !== 1 ? 's' : ''} activa{obrasActivas.length !== 1 ? 's' : ''}
            {obrasFinalizadas.length > 0 && ` · ${obrasFinalizadas.length} finalizada${obrasFinalizadas.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Obras activas */}
        {obrasActivas.length > 0 && (
          <h2 className="text-white font-semibold text-[14px] mb-3">Obras activas</h2>
        )}
        {obras.length === 0 ? (
          <p className="text-gray-500 text-[13px] text-center py-6">No hay obras asignadas</p>
        ) : obrasActivas.map((o, i) => (
          <div key={i} className="rounded-2xl p-4 mb-3" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold text-[14px]">{o.obra_nombre}</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: '#F97316', background: '#F9731618' }}>
                {o.status === 'pendiente' ? 'Pendiente' : o.status === 'en_trabajo' ? 'En trabajo' : 'Terminado'}
              </span>
            </div>
            {o.obra_direccion && <p className="text-gray-500 text-[11px] mb-2">{o.obra_direccion}</p>}

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <p className="text-gray-600 text-[10px]">Acordado</p>
                <p className="text-white text-[12px] font-medium">{fmt(o.monto_acordado)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-[10px]">Pagado</p>
                <p className="text-green-400 text-[12px] font-medium">{fmt(o.total_pagado)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-[10px]">Saldo</p>
                <p className={`text-[12px] font-medium ${o.saldo > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {fmt(o.saldo)}
                </p>
              </div>
            </div>

            {/* Pagos detallados */}
            {o.pagos?.length > 0 && (
              <div className="mb-3">
                <p className="text-gray-500 text-[11px] font-semibold mb-1">Pagos recibidos</p>
                {o.pagos.map((p, pi) => (
                  <div key={pi} className="flex items-center justify-between rounded-lg px-3 py-2 mb-1" style={{ background: '#0A0A0F' }}>
                    <div>
                      <p className="text-gray-300 text-[12px]">{fmtFecha(p.fecha)}</p>
                      <p className="text-gray-500 text-[10px]">{p.metodo}</p>
                    </div>
                    <span className="text-green-400 text-[12px] font-semibold">+{fmt(p.monto)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Fotos */}
            {o.fotos?.length > 0 && (
              <div className="mb-3">
                <p className="text-gray-500 text-[11px] font-semibold mb-1">Fotos</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {o.fotos.map((f, fi) => (
                    <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-800">
                      <img src={f.url} alt={f.descripcion || ''} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Notas */}
            {o.notas?.length > 0 && (
              <div>
                <p className="text-gray-500 text-[11px] font-semibold mb-1">Notas</p>
                {o.notas.map((n, ni) => (
                  <div key={ni} className="rounded-lg px-3 py-2 mb-1" style={{ background: '#0A0A0F' }}>
                    <p className="text-gray-300 text-[12px]">{n.texto}</p>
                    <p className="text-gray-600 text-[10px]">{fmtFecha(n.fecha)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Obras finalizadas */}
        {obrasFinalizadas.length > 0 && (
          <div className="mt-4">
            <button onClick={() => setShowFinalizadas(!showFinalizadas)}
              className="w-full flex items-center justify-between py-2 text-[13px] font-semibold text-gray-400">
              <span>Obras finalizadas ({obrasFinalizadas.length})</span>
              <span className="text-gray-600">{showFinalizadas ? '▲' : '▼'}</span>
            </button>
            {showFinalizadas && obrasFinalizadas.map((o, i) => (
              <div key={i} className="rounded-2xl p-4 mb-3 opacity-70" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold text-[14px]">{o.obra_nombre}</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: '#22C55E', background: '#22C55E18' }}>Finalizada</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <p className="text-gray-600 text-[10px]">Acordado</p>
                    <p className="text-white text-[12px] font-medium">{fmt(o.monto_acordado)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-[10px]">Pagado</p>
                    <p className="text-green-400 text-[12px] font-medium">{fmt(o.total_pagado)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-[10px]">Saldo</p>
                    <p className={`text-[12px] font-medium ${o.saldo > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{fmt(o.saldo)}</p>
                  </div>
                </div>
                {o.pagos?.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-[11px] font-semibold mb-1">Pagos</p>
                    {o.pagos.map((p, pi) => (
                      <div key={pi} className="flex items-center justify-between rounded-lg px-3 py-2 mb-1" style={{ background: '#0A0A0F' }}>
                        <div>
                          <p className="text-gray-300 text-[12px]">{fmtFecha(p.fecha)}</p>
                          <p className="text-gray-500 text-[10px]">{p.metodo}</p>
                        </div>
                        <span className="text-green-400 text-[12px] font-semibold">+{fmt(p.monto)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-6">
          <p className="text-gray-700 text-[10px]">App Contratista · Soluciones MDP</p>
        </div>
      </div>
    </div>
  )
}
