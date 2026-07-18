import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit3, Plus, Trash2, Users, DollarSign, Camera, FileText, Bell, Receipt, FileDown } from 'lucide-react'
import { supabase, mensajeErrorGuardado } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { usePlan } from '../../lib/PlanContext'
import { fmt, fmtFecha } from '../../lib/fmt'

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

import Spinner from '../../components/Spinner'
import Modal from './components/Modal'
import KPI from './components/KPI'
import GremioAsignado, { GREMIO_STATUS } from './components/GremioAsignado'
import PagoModal from './components/PagoModal'
import CobroModal from './components/CobroModal'
import TabFotos from './components/TabFotos'
import NotaModal from './components/NotaModal'
import AlertaModal from './components/AlertaModal'
import TabComprobantes from './components/TabComprobantes'
import ComprobanteModal from './components/ComprobanteModal'
import AdicionalModal from './components/AdicionalModal'

const STATUS_LABELS = {
  presupuestada: { label: 'Presupuestada', color: '#6B7280' },
  en_ejecucion:  { label: 'En ejecución',  color: '#F97316' },
  finalizada:    { label: 'Finalizada',     color: '#22C55E' },
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
  const [adicionales, setAdicionales] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('gremios')

  const [showAsignar, setShowAsignar] = useState(false)
  const [misGremios, setMisGremios] = useState([])
  const [showPago, setShowPago] = useState(null)
  const [showCobro, setShowCobro] = useState(false)
  const [showNota, setShowNota] = useState(false)
  const [showAlerta, setShowAlerta] = useState(false)
  const [showComprobante, setShowComprobante] = useState(false)
  const [showAdicional, setShowAdicional] = useState(null)

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
      supabase.from('adicionales_gremio').select('*').eq('obra_id', id).order('fecha', { ascending: false }),
    ]).then(([obraRes, gremRes, pagosRes, cobrosRes, fotosRes, notasRes, alertasRes, compRes, adicRes]) => {
      if (obraRes.data) setObra(obraRes.data)
      setGremiosAsig(gremRes.data || [])
      setPagos(pagosRes.data || [])
      setCobros(cobrosRes.data || [])
      setFotos(fotosRes.data || [])
      setNotas(notasRes.data || [])
      setAlertas(alertasRes.data || [])
      setComprobantes(compRes.data || [])
      setAdicionales(adicRes.data || [])
      setLoading(false)
    }).catch(() => { setLoading(false) })
  }

  useEffect(cargar, [id, user?.id])

  async function recalcularEstado() {
    const [{ data: obraAct }, { data: grems }, { data: pags }, { data: cobs }] = await Promise.all([
      supabase.from('obras').select('status, precio_inversor').eq('id', id).single(),
      supabase.from('obra_gremios').select('monto_acordado').eq('obra_id', id),
      supabase.from('pagos_gremios').select('monto').eq('obra_id', id),
      supabase.from('cobros_inversor').select('monto').eq('obra_id', id),
    ])
    if (!obraAct) return

    const tieneGremios = (grems || []).length > 0
    const totalAcordado = (grems || []).reduce((s, g) => s + Number(g.monto_acordado || 0), 0)
    const totalPagado = (pags || []).reduce((s, p) => s + Number(p.monto || 0), 0)
    const totalCobrado = (cobs || []).reduce((s, c) => s + Number(c.monto || 0), 0)
    const precioInv = Number(obraAct.precio_inversor || 0)

    let nuevoStatus = obraAct.status
    if (precioInv > 0 && totalCobrado >= precioInv && totalAcordado > 0 && totalPagado >= totalAcordado) {
      nuevoStatus = 'finalizada'
    } else if (tieneGremios && obraAct.status === 'presupuestada') {
      nuevoStatus = 'en_ejecucion'
    } else if (!tieneGremios && obraAct.status === 'en_ejecucion') {
      nuevoStatus = 'presupuestada'
    }

    if (nuevoStatus !== obraAct.status) {
      await supabase.from('obras').update({ status: nuevoStatus }).eq('id', id)
    }
  }

  async function asignarGremio(gremioId) {
    const { error } = await supabase.from('obra_gremios').insert({
      user_id: user.id, obra_id: id, gremio_id: gremioId,
    })
    if (error) { mensajeErrorGuardado(error); return }
    setShowAsignar(false)
    await recalcularEstado()
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
    await recalcularEstado()
    cargar()
  }

  async function borrarPago(pagoId) {
    if (!confirm('¿Eliminar este pago?')) return
    await supabase.from('pagos_gremios').delete().eq('id', pagoId)
    await recalcularEstado()
    cargar()
  }

  async function borrarCobro(cobroId) {
    if (!confirm('¿Eliminar este cobro?')) return
    await supabase.from('cobros_inversor').delete().eq('id', cobroId)
    await recalcularEstado()
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

  async function borrarAdicional(adicionalId) {
    if (!confirm('¿Eliminar este adicional?')) return
    await supabase.from('adicionales_gremio').delete().eq('id', adicionalId)
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

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Obra - ${esc(obra.nombre)}</title>
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
      <div><h1>${esc(obra.nombre)}</h1>
      <p class="meta" style="margin:0">${obra.cliente_nombre ? 'Cliente: ' + esc(obra.cliente_nombre) + ' · ' : ''}${esc(obra.direccion || '')}</p></div>
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
    <table><tr><th>Gremio</th><th>Tipo</th><th>Estado</th><th class="right">Acordado</th><th class="right">Adicionales</th><th class="right">Costo real</th><th class="right">Pagado</th><th class="right">Saldo</th></tr>
    ${gremiosAsig.map(og => {
      const g = og.gremios || {}
      const pagadoG = pagos.filter(p => p.gremio_id === og.gremio_id).reduce((s, p) => s + Number(p.monto), 0)
      const adics = adicionales.filter(a => a.obra_gremio_id === og.id)
      const totalAdic = adics.reduce((s, a) => s + Number(a.monto), 0)
      const costoReal = (og.monto_acordado || 0) + totalAdic
      return `<tr><td>${esc(g.nombre || '-')}</td><td>${esc(g.tipo || '-')}</td><td>${esc((GREMIO_STATUS[og.status] || {}).label || og.status)}</td><td class="right">${fmt(og.monto_acordado)}</td><td class="right">${totalAdic > 0 ? fmt(totalAdic) : '-'}</td><td class="right">${totalAdic > 0 ? fmt(costoReal) : fmt(og.monto_acordado)}</td><td class="right">${fmt(pagadoG)}</td><td class="right">${fmt(costoReal - pagadoG)}</td></tr>${adics.length > 0 ? adics.map(a => `<tr style="font-size:10px;color:#999"><td colspan="4" style="padding-left:24px">↳ ${esc(a.motivo)}</td><td class="right" colspan="4" style="color:#D97706">+${fmt(a.monto)}</td></tr>`).join('') : ''}`
    }).join('')}
    </table>`}

    <h2>Pagos a gremios</h2>
    ${pagos.length === 0 ? '<p style="color:#999">Sin pagos</p>' : `
    <table><tr><th>Fecha</th><th>Gremio</th><th>Método</th><th class="right">Monto</th></tr>
    ${pagos.map(p => `<tr><td>${fmtFecha(p.fecha)}</td><td>${esc(p.gremios?.nombre || '-')}</td><td>${esc(p.metodo)}</td><td class="right">${fmt(p.monto)}</td></tr>`).join('')}
    </table>`}

    <h2>Cobros del inversor</h2>
    ${cobros.length === 0 ? '<p style="color:#999">Sin cobros</p>' : `
    <table><tr><th>Fecha</th><th>Método</th><th>Notas</th><th class="right">Monto</th></tr>
    ${cobros.map(c => `<tr><td>${fmtFecha(c.fecha)}</td><td>${esc(c.metodo)}</td><td>${esc(c.notas || '-')}</td><td class="right">${fmt(c.monto)}</td></tr>`).join('')}
    </table>`}

    ${comprobantes.length > 0 ? `<h2>Comprobantes</h2>
    <table><tr><th>Fecha</th><th>Descripción</th><th>Gremio</th><th class="right">Monto</th></tr>
    ${comprobantes.map(c => `<tr><td>${fmtFecha(c.fecha)}</td><td>${esc(c.descripcion || '-')}</td><td>${esc(c.gremios?.nombre || '-')}</td><td class="right">${fmt(c.monto)}</td></tr>`).join('')}
    </table>` : ''}

    ${notas.length > 0 ? `<h2>Notas</h2>
    ${notas.map(n => `<div style="background:#f9fafb;border-radius:6px;padding:8px 12px;margin-bottom:4px"><p style="margin:0">${esc(n.texto)}</p><p style="margin:2px 0 0;color:#999;font-size:10px">${fmtFecha(n.created_at)}${n.gremios?.nombre ? ' · ' + esc(n.gremios.nombre) : ''}</p></div>`).join('')}` : ''}

    ${alertas.length > 0 ? `<h2>Alertas</h2>
    ${alertas.map(a => `<div style="background:${a.resuelta ? '#f0fdf4' : '#fef2f2'};border-radius:6px;padding:8px 12px;margin-bottom:4px"><p style="margin:0;${a.resuelta ? 'text-decoration:line-through;color:#999' : ''}">${esc(a.descripcion)}</p><p style="margin:2px 0 0;color:#999;font-size:10px">${fmtFecha(a.created_at)} · ${a.resuelta ? 'Resuelta' : 'Pendiente'}</p></div>`).join('')}` : ''}

    <div class="footer">
      Generado el ${new Date().toLocaleDateString('es-AR')} · App Contratista · Soluciones MDP
    </div>
    </body></html>`

    const win = window.open('', '_blank')
    if (!win) { window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'error', msg: 'Desbloqueá los popups para exportar el PDF' } })); return }
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

  function actualizarAvance(val) {
    setObra(prev => prev ? { ...prev, porcentaje_avance: val } : prev)
    clearTimeout(window._avanceTimer)
    window._avanceTimer = setTimeout(async () => {
      await supabase.from('obras').update({ porcentaje_avance: val }).eq('id', id)
    }, 500)
  }

  if (loading) return <Spinner />

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
        <button onClick={() => navigate('/obras')} aria-label="Volver"
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <ArrowLeft size={18} color="#9CA3AF" />
        </button>
        <h1 className="text-white font-bold text-[16px] flex-1 truncate">{obra.nombre}</h1>
        <button onClick={exportarPDF} aria-label="Exportar PDF"
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
          <FileDown size={16} color="#3B82F6" />
        </button>
        <button onClick={() => navigate(`/obras/${id}/editar`)} aria-label="Editar obra"
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
              <p className="text-gray-500 text-[12px] text-center py-4">No hay gremios asignados</p>
            ) : gremiosAsig.map(og => (
              <GremioAsignado key={og.id} og={og}
                onStatusChange={actualizarStatusGremio}
                onMontoChange={actualizarMontoAcordado}
                onDesasignar={desasignarGremio}
                onPagar={() => setShowPago(og)}
                onAdicional={() => setShowAdicional(og)}
                onBorrarAdicional={borrarAdicional}
                pagos={pagos.filter(p => p.gremio_id === og.gremio_id)}
                adicionales={adicionales.filter(a => a.obra_gremio_id === og.id)}
              />
            ))}
          </div>
        )}

        {/* Tab: Pagos */}
        {tab === 'pagos' && (
          <div>
            {pagos.length === 0 ? (
              <p className="text-gray-500 text-[12px] text-center py-4">No hay pagos registrados</p>
            ) : pagos.map(p => (
              <div key={p.id} className="rounded-xl p-3 mb-2 flex items-center justify-between"
                style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
                <div>
                  <p className="text-white text-[13px] font-medium">{p.gremios?.nombre || 'Gremio'}</p>
                  <p className="text-gray-500 text-[11px]">{fmtFecha(p.fecha)} · {p.metodo}</p>
                  {p.notas && <p className="text-gray-500 text-[10px]">{p.notas}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-bold text-[14px]">-{fmt(p.monto)}</span>
                  <button onClick={() => borrarPago(p.id)} aria-label="Eliminar pago"
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: '#EF444412' }}>
                    <Trash2 size={12} color="#EF4444" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Cobros */}
        {tab === 'cobros' && (
          <div>
            <button onClick={() => setShowCobro(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mb-3 text-[13px] font-semibold"
              style={{ border: '1px dashed #3B82F6', color: '#3B82F6' }}>
              <Plus size={16} /> Registrar cobro
            </button>

            {cobros.length === 0 ? (
              <p className="text-gray-500 text-[12px] text-center py-4">No hay cobros registrados</p>
            ) : cobros.map(c => (
              <div key={c.id} className="rounded-xl p-3 mb-2 flex items-center justify-between"
                style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
                <div>
                  <p className="text-white text-[13px] font-medium">Cobro del inversor</p>
                  <p className="text-gray-500 text-[11px]">{fmtFecha(c.fecha)} · {c.metodo}</p>
                  {c.notas && <p className="text-gray-500 text-[10px]">{c.notas}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-bold text-[14px]">+{fmt(c.monto)}</span>
                  <button onClick={() => borrarCobro(c.id)} aria-label="Eliminar cobro"
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
          <TabFotos obraId={id} userId={user.id} fotos={fotos} onRefresh={cargar} onBorrar={borrarFoto} />
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
              <p className="text-gray-500 text-[12px] text-center py-4">Sin notas</p>
            ) : notas.map(n => (
              <div key={n.id} className="rounded-xl p-3 mb-2 flex items-start gap-2" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[13px] mb-1">{n.texto}</p>
                  <p className="text-gray-500 text-[10px]">
                    {fmtFecha(n.created_at)}
                    {n.gremios?.nombre && ` · ${n.gremios.nombre}`}
                  </p>
                </div>
                <button onClick={() => borrarNota(n.id)} aria-label="Eliminar nota"
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
          <TabComprobantes comprobantes={comprobantes}
            onBorrar={borrarComprobante} onAgregar={() => setShowComprobante(true)} />
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
              <p className="text-gray-500 text-[12px] text-center py-4">Sin alertas</p>
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
                  <p className="text-gray-500 text-[10px]">{fmtFecha(a.created_at)}</p>
                </div>
                <button onClick={() => borrarAlerta(a.id)} aria-label="Eliminar alerta"
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#EF444412' }}>
                  <Trash2 size={12} color="#EF4444" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
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

      {showPago && (
        <PagoModal obraId={id} gremio={showPago} userId={user.id}
          onClose={() => setShowPago(null)} onDone={async () => { setShowPago(null); await recalcularEstado(); cargar() }} />
      )}

      {showCobro && (
        <CobroModal obraId={id} userId={user.id}
          onClose={() => setShowCobro(false)} onDone={async () => { setShowCobro(false); await recalcularEstado(); cargar() }} />
      )}

      {showNota && (
        <NotaModal obraId={id} userId={user.id} gremiosAsig={gremiosAsig}
          onClose={() => setShowNota(false)} onDone={() => { setShowNota(false); cargar() }} />
      )}

      {showAlerta && (
        <AlertaModal obraId={id} userId={user.id}
          onClose={() => setShowAlerta(false)} onDone={() => { setShowAlerta(false); cargar() }} />
      )}

      {showComprobante && (
        <ComprobanteModal obraId={id} userId={user.id} gremiosAsig={gremiosAsig}
          onClose={() => setShowComprobante(false)} onDone={() => { setShowComprobante(false); cargar() }} />
      )}

      {showAdicional && (
        <AdicionalModal obraId={id} obraGremioId={showAdicional.id}
          gremioId={showAdicional.gremio_id} userId={user.id}
          onClose={() => setShowAdicional(null)} onDone={() => { setShowAdicional(null); cargar() }} />
      )}
    </div>
  )
}
