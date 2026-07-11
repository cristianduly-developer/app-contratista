import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit3, Plus, Trash2, Users, DollarSign, AlertTriangle, Camera, FileText, Bell, Upload, Receipt, Share2, FileDown } from 'lucide-react'
import { supabase, mensajeErrorGuardado } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { usePlan } from '../../lib/PlanContext'
import { fmt, fmtFecha } from '../../lib/fmt'

const STATUS_LABELS = {
  presupuestada: { label: 'Presupuestada', color: '#6B7280' },
  en_ejecucion:  { label: 'En ejecución',  color: '#F97316' },
  finalizada:    { label: 'Finalizada',     color: '#22C55E' },
  cobrada:       { label: 'Cobrada',        color: '#3B82F6' },
}

const GREMIO_STATUS = {
  pendiente:  { label: 'Pendiente',  color: '#6B7280' },
  en_trabajo: { label: 'En trabajo', color: '#F97316' },
  terminado:  { label: 'Terminado',  color: '#22C55E' },
}

export default function ObraDetalle() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const { features } = usePlan()

  const [obra, setObra] = useState(null)
  const [gremiosAsig, setGremiosAsig] = useState([])
  const [pagos, setPagos] = useState([])
  const [cobros, setCobros] = useState([])
  const [fotos, setFotos] = useState([])
  const [notas, setNotas] = useState([])
  const [alertas, setAlertas] = useState([])
  const [comprobantes, setComprobantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('gremios')

  const [showAsignar, setShowAsignar] = useState(false)
  const [misGremios, setMisGremios] = useState([])
  const [showPago, setShowPago] = useState(null)
  const [showCobro, setShowCobro] = useState(false)
  const [showNota, setShowNota] = useState(false)
  const [showAlerta, setShowAlerta] = useState(false)
  const [showComprobante, setShowComprobante] = useState(false)

  function cargar() {
    if (!user || !id) return
    Promise.all([
      supabase.from('obras_resumen').select('*').eq('id', id).single(),
      supabase.from('obra_gremios').select('*, gremios(nombre, tipo, telefono)').eq('obra_id', id),
      supabase.from('pagos_gremios').select('*, gremios(nombre)').eq('obra_id', id).order('fecha', { ascending: false }),
      supabase.from('cobros_inversor').select('*').eq('obra_id', id).order('fecha', { ascending: false }),
      supabase.from('fotos_obra').select('*').eq('obra_id', id).order('created_at', { ascending: false }),
      supabase.from('notas_obra').select('*, gremios(nombre)').eq('obra_id', id).order('created_at', { ascending: false }),
      supabase.from('alertas_obra').select('*').eq('obra_id', id).order('created_at', { ascending: false }),
      supabase.from('comprobantes_obra').select('*, gremios(nombre)').eq('obra_id', id).order('fecha', { ascending: false }),
    ]).then(([obraRes, gremRes, pagosRes, cobrosRes, fotosRes, notasRes, alertasRes, compRes]) => {
      if (obraRes.data) setObra(obraRes.data)
      setGremiosAsig(gremRes.data || [])
      setPagos(pagosRes.data || [])
      setCobros(cobrosRes.data || [])
      setFotos(fotosRes.data || [])
      setNotas(notasRes.data || [])
      setAlertas(alertasRes.data || [])
      setComprobantes(compRes.data || [])
      setLoading(false)
    })
  }

  useEffect(cargar, [id, user?.id])

  async function asignarGremio(gremioId) {
    const { error } = await supabase.from('obra_gremios').insert({
      user_id: user.id, obra_id: id, gremio_id: gremioId,
    })
    if (error) { mensajeErrorGuardado(error); return }
    setShowAsignar(false)
    cargar()
  }

  async function actualizarStatusGremio(ogId, newStatus) {
    await supabase.from('obra_gremios').update({ status: newStatus }).eq('id', ogId)
    cargar()
  }

  async function actualizarMontoAcordado(ogId, monto) {
    await supabase.from('obra_gremios').update({ monto_acordado: Number(monto) || 0 }).eq('id', ogId)
    cargar()
  }

  async function desasignarGremio(ogId) {
    if (!confirm('¿Eliminar este gremio de la obra?')) return
    await supabase.from('obra_gremios').delete().eq('id', ogId)
    cargar()
  }

  async function borrarPago(pagoId) {
    if (!confirm('¿Eliminar este pago?')) return
    await supabase.from('pagos_gremios').delete().eq('id', pagoId)
    cargar()
  }

  async function borrarCobro(cobroId) {
    if (!confirm('¿Eliminar este cobro?')) return
    await supabase.from('cobros_inversor').delete().eq('id', cobroId)
    cargar()
  }

  async function borrarFoto(fotoId, url) {
    if (!confirm('¿Eliminar esta foto?')) return
    await supabase.from('fotos_obra').delete().eq('id', fotoId)
    try {
      const path = url.split('/fotos-obras/')[1]
      if (path) await supabase.storage.from('fotos-obras').remove([path])
    } catch {}
    cargar()
  }

  async function borrarNota(notaId) {
    if (!confirm('¿Eliminar esta nota?')) return
    await supabase.from('notas_obra').delete().eq('id', notaId)
    cargar()
  }

  async function borrarAlerta(alertaId) {
    if (!confirm('¿Eliminar esta alerta?')) return
    await supabase.from('alertas_obra').delete().eq('id', alertaId)
    cargar()
  }

  async function borrarComprobante(compId, url) {
    if (!confirm('¿Eliminar este comprobante?')) return
    await supabase.from('comprobantes_obra').delete().eq('id', compId)
    try {
      const path = url.split('/comprobantes/')[1]
      if (path) await supabase.storage.from('comprobantes').remove([path])
    } catch {}
    cargar()
  }

  function exportarPDF() {
    const st = STATUS_LABELS[obra.status] || STATUS_LABELS.presupuestada
    const totalAcordado = gremiosAsig.reduce((s, og) => s + Number(og.monto_acordado || 0), 0)
    const totalPagadoGremios = pagos.reduce((s, p) => s + Number(p.monto || 0), 0)
    const totalCobrado = cobros.reduce((s, c) => s + Number(c.monto || 0), 0)
    const totalComprobantes = comprobantes.reduce((s, c) => s + Number(c.monto || 0), 0)

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Obra - ${obra.nombre}</title>
    <style>
      body{font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;padding:24px;color:#111;font-size:13px}
      h1{font-size:20px;margin:0 0 4px;color:#EA580C}
      h2{font-size:15px;margin:24px 0 8px;padding-bottom:4px;border-bottom:2px solid #EA580C;color:#333}
      .meta{color:#666;font-size:12px;margin-bottom:16px}
      .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px}
      .kpi{background:#f9fafb;border-radius:8px;padding:10px;text-align:center}
      .kpi .label{font-size:10px;color:#666;text-transform:uppercase}
      .kpi .value{font-size:16px;font-weight:700;margin-top:2px}
      table{width:100%;border-collapse:collapse;margin-bottom:8px}
      th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px}
      th{background:#f3f4f6;font-weight:600;font-size:11px;text-transform:uppercase;color:#666}
      .right{text-align:right}
      .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600}
      .footer{text-align:center;color:#999;font-size:10px;margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb}
      @media print{body{padding:12px}h2{break-after:avoid}}
    </style></head><body>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="width:40px;height:40px;background:#EA580C;border-radius:10px;display:flex;align-items:center;justify-content:center">
        <span style="font-size:22px">🏗</span>
      </div>
      <div><h1>${obra.nombre}</h1>
      <p class="meta" style="margin:0">${obra.cliente_nombre ? 'Cliente: ' + obra.cliente_nombre + ' · ' : ''}${obra.direccion || ''}</p></div>
    </div>
    <p class="meta">
      Estado: <span class="badge" style="background:${st.color}20;color:${st.color}">${st.label}</span>
      ${obra.m2 ? ' · ' + obra.m2 + ' m²' : ''}
      ${obra.fecha_inicio ? ' · Inicio: ' + fmtFecha(obra.fecha_inicio) : ''}
      ${obra.fecha_fin_estimada ? ' · Fin estimado: ' + fmtFecha(obra.fecha_fin_estimada) : ''}
      · Avance: ${obra.porcentaje_avance || 0}%
    </p>

    <div class="grid">
      <div class="kpi"><div class="label">Precio inversor</div><div class="value">${fmt(obra.precio_inversor)}</div></div>
      <div class="kpi"><div class="label">Cobrado</div><div class="value" style="color:#2563EB">${fmt(totalCobrado)}</div></div>
      <div class="kpi"><div class="label">Pend. cobrar</div><div class="value" style="color:#F59E0B">${fmt(obra.precio_inversor - totalCobrado)}</div></div>
      <div class="kpi"><div class="label">Acordado gremios</div><div class="value">${fmt(totalAcordado)}</div></div>
      <div class="kpi"><div class="label">Pagado gremios</div><div class="value" style="color:#EF4444">${fmt(totalPagadoGremios)}</div></div>
      <div class="kpi"><div class="label">Ganancia neta</div><div class="value" style="color:${totalCobrado - totalPagadoGremios - totalComprobantes >= 0 ? '#16A34A' : '#EF4444'}">${fmt(totalCobrado - totalPagadoGremios - totalComprobantes)}</div></div>
    </div>

    <h2>Gremios asignados</h2>
    ${gremiosAsig.length === 0 ? '<p style="color:#999">Sin gremios asignados</p>' : `
    <table><tr><th>Gremio</th><th>Tipo</th><th>Estado</th><th class="right">Acordado</th><th class="right">Pagado</th><th class="right">Saldo</th></tr>
    ${gremiosAsig.map(og => {
      const g = og.gremios || {}
      const pagadoG = pagos.filter(p => p.gremio_id === og.gremio_id).reduce((s, p) => s + Number(p.monto), 0)
      return `<tr><td>${g.nombre || '-'}</td><td>${g.tipo || '-'}</td><td>${(GREMIO_STATUS[og.status] || {}).label || og.status}</td><td class="right">${fmt(og.monto_acordado)}</td><td class="right">${fmt(pagadoG)}</td><td class="right">${fmt((og.monto_acordado || 0) - pagadoG)}</td></tr>`
    }).join('')}
    </table>`}

    <h2>Pagos a gremios</h2>
    ${pagos.length === 0 ? '<p style="color:#999">Sin pagos</p>' : `
    <table><tr><th>Fecha</th><th>Gremio</th><th>Método</th><th class="right">Monto</th></tr>
    ${pagos.map(p => `<tr><td>${fmtFecha(p.fecha)}</td><td>${p.gremios?.nombre || '-'}</td><td>${p.metodo}</td><td class="right">${fmt(p.monto)}</td></tr>`).join('')}
    </table>`}

    <h2>Cobros del inversor</h2>
    ${cobros.length === 0 ? '<p style="color:#999">Sin cobros</p>' : `
    <table><tr><th>Fecha</th><th>Método</th><th>Notas</th><th class="right">Monto</th></tr>
    ${cobros.map(c => `<tr><td>${fmtFecha(c.fecha)}</td><td>${c.metodo}</td><td>${c.notas || '-'}</td><td class="right">${fmt(c.monto)}</td></tr>`).join('')}
    </table>`}

    ${comprobantes.length > 0 ? `<h2>Comprobantes</h2>
    <table><tr><th>Fecha</th><th>Descripción</th><th>Gremio</th><th class="right">Monto</th></tr>
    ${comprobantes.map(c => `<tr><td>${fmtFecha(c.fecha)}</td><td>${c.descripcion || '-'}</td><td>${c.gremios?.nombre || '-'}</td><td class="right">${fmt(c.monto)}</td></tr>`).join('')}
    </table>` : ''}

    ${notas.length > 0 ? `<h2>Notas</h2>
    ${notas.map(n => `<div style="background:#f9fafb;border-radius:6px;padding:8px 12px;margin-bottom:4px"><p style="margin:0">${n.texto}</p><p style="margin:2px 0 0;color:#999;font-size:10px">${fmtFecha(n.created_at)}${n.gremios?.nombre ? ' · ' + n.gremios.nombre : ''}</p></div>`).join('')}` : ''}

    ${alertas.length > 0 ? `<h2>Alertas</h2>
    ${alertas.map(a => `<div style="background:${a.resuelta ? '#f0fdf4' : '#fef2f2'};border-radius:6px;padding:8px 12px;margin-bottom:4px"><p style="margin:0;${a.resuelta ? 'text-decoration:line-through;color:#999' : ''}">${a.descripcion}</p><p style="margin:2px 0 0;color:#999;font-size:10px">${fmtFecha(a.created_at)} · ${a.resuelta ? 'Resuelta' : 'Pendiente'}</p></div>`).join('')}` : ''}

    <div class="footer">
      Generado el ${new Date().toLocaleDateString('es-AR')} · App Contratista · Soluciones MDP
    </div>
    </body></html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  async function abrirAsignar() {
    const { data } = await supabase.from('gremios').select('id, nombre, tipo').eq('user_id', user.id)
    const asignadosIds = gremiosAsig.map(g => g.gremio_id)
    setMisGremios((data || []).filter(g => !asignadosIds.includes(g.id)))
    setShowAsignar(true)
  }

  async function actualizarAvance(val) {
    await supabase.from('obras').update({ porcentaje_avance: val }).eq('id', id)
    cargar()
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#F97316' }} />
      </div>
    )
  }

  if (!obra) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ background: '#0A0A0F' }}>
        <p className="text-gray-400">Obra no encontrada</p>
        <button onClick={() => navigate('/obras')} className="text-orange-400 text-[13px] underline">Volver</button>
      </div>
    )
  }

  const st = STATUS_LABELS[obra.status] || STATUS_LABELS.presupuestada

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0A0A0F' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: '#0A0A0F' }}>
        <button onClick={() => navigate('/obras')}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <ArrowLeft size={18} color="#9CA3AF" />
        </button>
        <h1 className="text-white font-bold text-[16px] flex-1 truncate">{obra.nombre}</h1>
        <button onClick={exportarPDF}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}
          title="Exportar PDF">
          <FileDown size={16} color="#3B82F6" />
        </button>
        <button onClick={() => navigate(`/obras/${id}/editar`)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <Edit3 size={16} color="#F97316" />
        </button>
      </div>

      <div className="px-4">
        {/* Info card */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ color: st.color, background: st.color + '18' }}>
              {st.label}
            </span>
            {obra.m2 > 0 && <span className="text-gray-500 text-[12px]">{obra.m2} m²</span>}
          </div>
          {obra.cliente_nombre && <p className="text-gray-400 text-[12px] mb-1">Cliente: {obra.cliente_nombre}</p>}
          {obra.direccion && <p className="text-gray-500 text-[11px] mb-2">{obra.direccion}</p>}

          {/* Avance slider */}
          {obra.status === 'en_ejecucion' && (
            <div className="mt-2">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-gray-500">Avance</span>
                <span className="text-orange-400 font-bold">{obra.porcentaje_avance || 0}%</span>
              </div>
              <input type="range" min="0" max="100" step="5"
                value={obra.porcentaje_avance || 0}
                onChange={e => actualizarAvance(Number(e.target.value))}
                className="w-full accent-orange-500 h-2" />
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <KPI label="Precio inversor" value={fmt(obra.precio_inversor)} color="#F97316" />
          <KPI label="Cobrado" value={fmt(obra.cobrado_inversor)} color="#3B82F6" />
          <KPI label="Pagado gremios" value={fmt(obra.pagado_gremios)} color="#EF4444" />
          <KPI label="Ganancia neta" value={fmt(obra.ganancia_neta)} color={obra.ganancia_neta >= 0 ? '#22C55E' : '#EF4444'} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl overflow-x-auto" style={{ background: '#13131A' }}>
          {[
            { key: 'gremios', label: 'Gremios', icon: Users },
            { key: 'pagos', label: 'Pagos', icon: DollarSign },
            { key: 'cobros', label: 'Cobros', icon: DollarSign },
            ...(features.fotos ? [{ key: 'fotos', label: 'Fotos', icon: Camera }] : []),
            { key: 'notas', label: 'Notas', icon: FileText },
            { key: 'comprobantes', label: 'Comprob.', icon: Receipt },
            { key: 'alertas', label: 'Alertas', icon: Bell, badge: alertas.filter(a => !a.resuelta).length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 min-w-[60px] relative"
              style={{
                background: tab === t.key ? '#F9731620' : 'transparent',
                color: tab === t.key ? '#F97316' : '#6B7280',
              }}>
              <t.icon size={13} /> {t.label}
              {t.badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Gremios */}
        {tab === 'gremios' && (
          <div>
            <button onClick={abrirAsignar}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mb-3 text-[13px] font-semibold"
              style={{ border: '1px dashed #F97316', color: '#F97316' }}>
              <Plus size={16} /> Asignar gremio
            </button>

            {gremiosAsig.length === 0 ? (
              <p className="text-gray-600 text-[12px] text-center py-4">No hay gremios asignados</p>
            ) : gremiosAsig.map(og => (
              <GremioAsignado key={og.id} og={og}
                onStatusChange={actualizarStatusGremio}
                onMontoChange={actualizarMontoAcordado}
                onDesasignar={desasignarGremio}
                onPagar={() => setShowPago(og)}
                pagos={pagos.filter(p => p.gremio_id === og.gremio_id)}
              />
            ))}
          </div>
        )}

        {/* Tab: Pagos a gremios */}
        {tab === 'pagos' && (
          <div>
            {pagos.length === 0 ? (
              <p className="text-gray-600 text-[12px] text-center py-4">No hay pagos registrados</p>
            ) : pagos.map(p => (
              <div key={p.id} className="rounded-xl p-3 mb-2 flex items-center justify-between"
                style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
                <div>
                  <p className="text-white text-[13px] font-medium">{p.gremios?.nombre || 'Gremio'}</p>
                  <p className="text-gray-500 text-[11px]">{fmtFecha(p.fecha)} · {p.metodo}</p>
                  {p.notas && <p className="text-gray-600 text-[10px]">{p.notas}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-bold text-[14px]">-{fmt(p.monto)}</span>
                  <button onClick={() => borrarPago(p.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: '#EF444412' }}>
                    <Trash2 size={12} color="#EF4444" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Cobros del inversor */}
        {tab === 'cobros' && (
          <div>
            <button onClick={() => setShowCobro(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mb-3 text-[13px] font-semibold"
              style={{ border: '1px dashed #3B82F6', color: '#3B82F6' }}>
              <Plus size={16} /> Registrar cobro
            </button>

            {cobros.length === 0 ? (
              <p className="text-gray-600 text-[12px] text-center py-4">No hay cobros registrados</p>
            ) : cobros.map(c => (
              <div key={c.id} className="rounded-xl p-3 mb-2 flex items-center justify-between"
                style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
                <div>
                  <p className="text-white text-[13px] font-medium">Cobro del inversor</p>
                  <p className="text-gray-500 text-[11px]">{fmtFecha(c.fecha)} · {c.metodo}</p>
                  {c.notas && <p className="text-gray-600 text-[10px]">{c.notas}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-bold text-[14px]">+{fmt(c.monto)}</span>
                  <button onClick={() => borrarCobro(c.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: '#EF444412' }}>
                    <Trash2 size={12} color="#EF4444" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Fotos */}
        {tab === 'fotos' && (
          <TabFotos obraId={id} userId={user.id} fotos={fotos} gremiosAsig={gremiosAsig} onRefresh={cargar} onBorrar={borrarFoto} />
        )}

        {/* Tab: Notas */}
        {tab === 'notas' && (
          <div>
            <button onClick={() => setShowNota(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mb-3 text-[13px] font-semibold"
              style={{ border: '1px dashed #A855F7', color: '#A855F7' }}>
              <Plus size={16} /> Agregar nota
            </button>
            {notas.length === 0 ? (
              <p className="text-gray-600 text-[12px] text-center py-4">Sin notas</p>
            ) : notas.map(n => (
              <div key={n.id} className="rounded-xl p-3 mb-2 flex items-start gap-2" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[13px] mb-1">{n.texto}</p>
                  <p className="text-gray-500 text-[10px]">
                    {fmtFecha(n.created_at)}
                    {n.gremios?.nombre && ` · ${n.gremios.nombre}`}
                  </p>
                </div>
                <button onClick={() => borrarNota(n.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#EF444412' }}>
                  <Trash2 size={12} color="#EF4444" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Comprobantes */}
        {tab === 'comprobantes' && (
          <TabComprobantes obraId={id} userId={user.id} comprobantes={comprobantes} gremiosAsig={gremiosAsig}
            onRefresh={cargar} onBorrar={borrarComprobante} onAgregar={() => setShowComprobante(true)} />
        )}

        {/* Tab: Alertas */}
        {tab === 'alertas' && (
          <div>
            <button onClick={() => setShowAlerta(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mb-3 text-[13px] font-semibold"
              style={{ border: '1px dashed #EF4444', color: '#EF4444' }}>
              <Plus size={16} /> Agregar alerta
            </button>
            {alertas.length === 0 ? (
              <p className="text-gray-600 text-[12px] text-center py-4">Sin alertas</p>
            ) : alertas.map(a => (
              <div key={a.id} className="rounded-xl p-3 mb-2 flex items-center gap-3"
                style={{ background: '#13131A', border: `1px solid ${a.resuelta ? '#2A2A3A' : '#EF444430'}` }}>
                <button onClick={async () => {
                  await supabase.from('alertas_obra').update({ resuelta: !a.resuelta }).eq('id', a.id)
                  cargar()
                }}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${a.resuelta ? 'border-green-500 bg-green-500/20' : 'border-red-400'}`}>
                  {a.resuelta && <span className="text-green-400 text-[10px]">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] ${a.resuelta ? 'text-gray-500 line-through' : 'text-white'}`}>{a.descripcion}</p>
                  <p className="text-gray-600 text-[10px]">{fmtFecha(a.created_at)}</p>
                </div>
                <button onClick={() => borrarAlerta(a.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#EF444412' }}>
                  <Trash2 size={12} color="#EF4444" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Asignar gremio */}
      {showAsignar && (
        <Modal onClose={() => setShowAsignar(false)} title="Asignar gremio">
          {misGremios.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-400 text-[13px] mb-2">No hay gremios disponibles</p>
              <button onClick={() => { setShowAsignar(false); navigate('/gremios/nuevo') }}
                className="text-orange-400 text-[13px] underline">Crear gremio</button>
            </div>
          ) : misGremios.map(g => (
            <button key={g.id} onClick={() => asignarGremio(g.id)}
              className="w-full text-left px-4 py-3 rounded-xl mb-2 flex items-center gap-3"
              style={{ background: '#1C1C27', border: '1px solid #2A2A3A' }}>
              <span className="text-xl">👷</span>
              <div>
                <p className="text-white text-[13px] font-medium">{g.nombre}</p>
                {g.tipo && <p className="text-gray-500 text-[11px]">{g.tipo}</p>}
              </div>
            </button>
          ))}
        </Modal>
      )}

      {/* Modal: Pago a gremio */}
      {showPago && (
        <PagoModal obraId={id} gremio={showPago} userId={user.id}
          onClose={() => setShowPago(null)} onDone={() => { setShowPago(null); cargar() }} />
      )}

      {/* Modal: Cobro inversor */}
      {showCobro && (
        <CobroModal obraId={id} userId={user.id}
          onClose={() => setShowCobro(false)} onDone={() => { setShowCobro(false); cargar() }} />
      )}

      {/* Modal: Nueva nota */}
      {showNota && (
        <NotaModal obraId={id} userId={user.id} gremiosAsig={gremiosAsig}
          onClose={() => setShowNota(false)} onDone={() => { setShowNota(false); cargar() }} />
      )}

      {/* Modal: Nueva alerta */}
      {showAlerta && (
        <AlertaModal obraId={id} userId={user.id}
          onClose={() => setShowAlerta(false)} onDone={() => { setShowAlerta(false); cargar() }} />
      )}

      {/* Modal: Nuevo comprobante */}
      {showComprobante && (
        <ComprobanteModal obraId={id} userId={user.id} gremiosAsig={gremiosAsig}
          onClose={() => setShowComprobante(false)} onDone={() => { setShowComprobante(false); cargar() }} />
      )}
    </div>
  )
}

function KPI({ label, value, color }) {
  return (
    <div className="rounded-xl p-3" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
      <p className="text-gray-500 text-[10px] mb-0.5">{label}</p>
      <p className="font-bold text-[15px]" style={{ color }}>{value}</p>
    </div>
  )
}

function GremioAsignado({ og, onStatusChange, onMontoChange, onDesasignar, onPagar, pagos }) {
  const [editMonto, setEditMonto] = useState(false)
  const [monto, setMonto] = useState(String(og.monto_acordado || ''))
  const gremio = og.gremios || {}
  const gs = GREMIO_STATUS[og.status] || GREMIO_STATUS.pendiente
  const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const saldo = (og.monto_acordado || 0) - totalPagado

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

      {/* Monto acordado */}
      <div className="flex items-center gap-2 mb-2">
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

      {/* Pagado / saldo */}
      {og.monto_acordado > 0 && (
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
        <button onClick={() => onDesasignar(og.id)}
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: '#EF444412', border: '1px solid #EF444430' }}>
          <Trash2 size={14} color="#EF4444" />
        </button>
      </div>
    </div>
  )
}

function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md rounded-t-3xl md:rounded-3xl p-5 max-h-[70vh] overflow-y-auto"
        style={{ background: '#13131A' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-[16px]">{title}</h3>
          <button onClick={onClose} className="text-gray-500 text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PagoModal({ obraId, gremio, userId, onClose, onDone }) {
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('efectivo')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (!monto || Number(monto) <= 0) return
    setGuardando(true)
    const { error } = await supabase.from('pagos_gremios').insert({
      user_id: userId, obra_id: obraId, gremio_id: gremio.gremio_id,
      monto: Number(monto), metodo, notas: notas.trim(),
    })
    if (error) { mensajeErrorGuardado(error); setGuardando(false); return }
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Pago registrado', type: 'success' } }))
    onDone()
  }

  return (
    <Modal onClose={onClose} title={`Pago a ${gremio.gremios?.nombre || 'gremio'}`}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-gray-500 text-[11px] block mb-1">Monto *</label>
          <input type="number" inputMode="numeric" value={monto} onChange={e => setMonto(e.target.value)}
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
            placeholder="Opcional"
            className="w-full rounded-xl px-4 py-3 text-white text-[13px] outline-none"
            style={{ background: '#0A0A0F', border: '1px solid #2A2A3A' }} />
        </div>
        <button onClick={guardar} disabled={guardando || !monto}
          className="w-full py-3 rounded-xl text-white font-bold text-[14px] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
          {guardando ? 'Guardando...' : 'Registrar pago'}
        </button>
      </div>
    </Modal>
  )
}

function CobroModal({ obraId, userId, onClose, onDone }) {
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
          <input type="number" inputMode="numeric" value={monto} onChange={e => setMonto(e.target.value)}
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
            placeholder="Opcional"
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

function TabFotos({ obraId, userId, fotos, gremiosAsig, onRefresh, onBorrar }) {
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
        <p className="text-gray-600 text-[12px] text-center py-4">Sin fotos</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map(f => (
            <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-800">
              <a href={f.url} target="_blank" rel="noopener noreferrer">
                <img src={f.url} alt={f.descripcion || ''} className="w-full h-full object-cover" />
              </a>
              <button onClick={() => onBorrar(f.id, f.url)}
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

function NotaModal({ obraId, userId, gremiosAsig, onClose, onDone }) {
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

function AlertaModal({ obraId, userId, onClose, onDone }) {
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

function TabComprobantes({ obraId, userId, comprobantes, gremiosAsig, onRefresh, onBorrar, onAgregar }) {
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
        <p className="text-gray-600 text-[12px] text-center py-4">Sin comprobantes</p>
      ) : comprobantes.map(c => (
        <div key={c.id} className="rounded-xl p-3 mb-2 flex items-start gap-3"
          style={{ background: '#13131A', border: `1px solid ${seleccionados.includes(c.id) ? '#F97316' : '#2A2A3A'}` }}>
          <button onClick={() => toggleSel(c.id)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${seleccionados.includes(c.id) ? 'border-orange-500 bg-orange-500/20' : 'border-gray-600'}`}>
            {seleccionados.includes(c.id) && <span className="text-orange-400 text-[10px]">✓</span>}
          </button>
          <a href={c.url} target="_blank" rel="noopener noreferrer"
            className="w-12 h-12 rounded-lg overflow-hidden border border-gray-700 shrink-0">
            <img src={c.url} alt="" className="w-full h-full object-cover"
              onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#1C1C27"><span style="font-size:16px">📄</span></div>' }} />
          </a>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-medium truncate">{c.descripcion || 'Comprobante'}</p>
            <p className="text-gray-500 text-[11px]">{fmtFecha(c.fecha)}{c.gremios?.nombre ? ` · ${c.gremios.nombre}` : ''}</p>
            <p className="text-orange-400 text-[12px] font-semibold">{fmt(c.monto)}</p>
          </div>
          <button onClick={() => onBorrar(c.id, c.url)}
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: '#EF444412' }}>
            <Trash2 size={12} color="#EF4444" />
          </button>
        </div>
      ))}
    </div>
  )
}

function ComprobanteModal({ obraId, userId, gremiosAsig, onClose, onDone }) {
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
          <input type="number" inputMode="numeric" value={monto} onChange={e => setMonto(e.target.value)}
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
