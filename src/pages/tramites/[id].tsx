import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import emailjs from '@emailjs/browser'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'
const FER_PHONE = '5491144379907'
const SILVINA_PHONE = '5491169988414'

const EMAILJS_SERVICE = 'service_ohnptcb'
const EMAILJS_TEMPLATE = 'template_7rlyyxg'
const EMAILJS_KEY = 'kkXRFtV1dayNyumI2'

const SUBESTADOS_TECNICA = [
  { key: 'dibujo', label: '✏️ Dibujo' },
  { key: 'correc_catastro', label: '🏛️ Correc. Catastro' },
  { key: 'correc_op', label: '📋 Correc. OP' },
  { key: 'validar_presu', label: '💰 Validar Presu.' },
  { key: 'otros', label: '📎 Otros' },
]

const SUBESTADOS_MUNICIPIO = [
  { key: 'catastro', label: '🗂️ Catastro' },
  { key: 'obras', label: '🏠 Obras Particulares' },
  { key: 'ordenamiento', label: '🗺️ Ordenamiento Urbano' },
  { key: 'otros', label: '📎 Otros' },
]

const RESPONSABLES = [
  { key: 'admin', label: 'Adm/Comercial', color: '#3b82f6' },
  { key: 'tecnica', label: 'Técnica', color: '#f97316' },
  { key: 'municipio', label: 'Municipio', color: TEAL },
  { key: 'cliente', label: 'Cliente', color: '#8b5cf6' },
]

const DIBUJANTES = ['Mario', 'Meli', 'Caro', 'Mili', 'Maria', 'Fer']

const ESTADO_MAP: Record<string, string> = {
  en_dibujo: 'dibujo',
  observado_catastro: 'correc_catastro',
  presentado_catastro: 'catastro',
  correc_visado: 'correc_op',
  presentado_obras: 'obras',
  estructura_en_proceso: 'otros',
  pendiente_colegio: 'otros',
  en_pausa: 'otros',
}

const PELOTA_MAP: Record<string, string> = { dibujante: 'tecnica' }

const TAREAS_FINALES = [
  { key: 'derechos_pagados', label: 'Derechos pagados' },
  { key: 'estructura_lista', label: 'Estructura lista' },
  { key: 'colegio_listo', label: 'Colegio listo' },
  { key: 'planilla_estadistica', label: 'Planilla de estadística' },
]

type Tramite = {
  id: string
  numero_p: string
  nombre: string
  celular: string
  domicilio: string
  municipio: string
  tramite: string
  firma: string
  dibujante: string
  n_parcelaria: string
  n_expediente: string
  estado_actual: string
  pelota: string
  ultima_nota: string
  ultima_accion_at: string
  costo_dibujo: number
  fecha_entrega_dibujo: string
  checklist: Record<string, boolean>
  finalizado: boolean
  finalizado_at: string
}

type Movimiento = {
  id: string
  created_at: string
  estado: string
  nota: string
  pelota: string
  registrado_por: string
  link: string
}

export default function TramiteDetalle() {
  const router = useRouter()
  const { id } = router.query
  const [tramite, setTramite] = useState<Tramite | null>(null)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [editandoDatos, setEditandoDatos] = useState(false)
  const [nuevoResponsable, setNuevoResponsable] = useState('admin')
  const [nuevoSubestado, setNuevoSubestado] = useState('')
  const [nuevaNota, setNuevaNota] = useState('')
  const [nuevoLink, setNuevoLink] = useState('')
  const [dibujante_custom, setDibujanteCustom] = useState('')
  const [editN, setEditN] = useState({
    parcelaria: '', expediente: '', dibujante: '',
    costo_dibujo: '', fecha_entrega: '',
    domicilio: '', celular: '', firma: ''
  })
  const [saving, setSaving] = useState(false)
  const [notificacionPendiente, setNotificacionPendiente] = useState<null | 'tecnica' | 'admin'>(null)
  const [showConfirmFinalizar, setShowConfirmFinalizar] = useState(false)

  useEffect(() => {
    if (id) { loadTramite(); loadMovimientos() }
  }, [id])

  async function loadTramite() {
    const { data } = await supabase.from('tramites').select('*').eq('id', id).single()
    if (data) {
      setTramite(data)
      setNuevoResponsable(PELOTA_MAP[data.pelota] || data.pelota || 'admin')
      setEditN({
        parcelaria: data.n_parcelaria || '',
        expediente: data.n_expediente || '',
        dibujante: data.dibujante || '',
        costo_dibujo: data.costo_dibujo || '',
        fecha_entrega: data.fecha_entrega_dibujo || '',
        domicilio: data.domicilio || '',
        celular: data.celular || '',
        firma: data.firma || ''
      })
    }
  }

  async function loadMovimientos() {
    const { data } = await supabase.from('movimientos').select('*').eq('tramite_id', id).order('created_at', { ascending: false })
    setMovimientos(data || [])
  }

  async function registrarMovimiento() {
    if (!nuevaNota && !nuevoSubestado) return
    setSaving(true)
    const estadoFinal = nuevoSubestado || tramite?.estado_actual || ''
    const responsableAnterior = tramite?.pelota || 'admin'

    await supabase.from('movimientos').insert({
      tramite_id: id, estado: estadoFinal, nota: nuevaNota,
      pelota: nuevoResponsable, registrado_por: 'admin',
      link: nuevoLink
    })
    await supabase.from('tramites').update({
      estado_actual: estadoFinal,
      pelota: nuevoResponsable,
      ultima_nota: nuevaNota,
      ultima_accion_at: new Date().toISOString(),
    }).eq('id', id)

    setTramite(prev => prev ? {
      ...prev,
      estado_actual: estadoFinal,
      pelota: nuevoResponsable,
      ultima_nota: nuevaNota,
      ultima_accion_at: new Date().toISOString(),
    } : prev)

    const pasaATecnica = nuevoResponsable === 'tecnica' && responsableAnterior !== 'tecnica'
    const pasaAAdmin = nuevoResponsable === 'admin' && responsableAnterior === 'tecnica'

    if (pasaATecnica || pasaAAdmin) {
      const asunto = pasaATecnica
        ? `Nuevo trámite para técnica — ${tramite?.numero_p} ${tramite?.nombre}`
        : `Técnica devuelve a admin — ${tramite?.numero_p} ${tramite?.nombre}`
      const mensaje = pasaATecnica
        ? `Hola Fer,\n\nSe asignó un trámite a técnica:\n\n📋 ${tramite?.numero_p} — ${tramite?.nombre}\n📍 ${tramite?.domicilio || ''} · ${tramite?.municipio || ''}\n🔧 ${tramite?.tramite || ''}\n📝 Estado: ${estadoLabel(estadoFinal)}\n\n💬 Nota: ${nuevaNota}\n\nhttps://tekton-app-nuevo.vercel.app/tramites/${id}`
        : `Hola Silvina,\n\nTécnica devuelve un trámite a administración:\n\n📋 ${tramite?.numero_p} — ${tramite?.nombre}\n📍 ${tramite?.domicilio || ''} · ${tramite?.municipio || ''}\n🔧 ${tramite?.tramite || ''}\n📝 Estado: ${estadoLabel(estadoFinal)}\n\n💬 Nota: ${nuevaNota}\n\nhttps://tekton-app-nuevo.vercel.app/tramites/${id}`

      try {
        await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
          asunto, mensaje, name: 'Tekton App', email: 'gestiones@estudiotekton.com',
        }, EMAILJS_KEY)
      } catch (e) {
        console.error('Error enviando mail:', e)
      }
    }

    if (pasaATecnica) setNotificacionPendiente('tecnica')
    else if (pasaAAdmin) setNotificacionPendiente('admin')
    else setNotificacionPendiente(null)

    setNuevaNota(''); setNuevoSubestado(''); setNuevoLink('')
    setSaving(false)
    loadMovimientos()
  }

  async function finalizarTramite() {
    setSaving(true)
    await supabase.from('tramites').update({
      finalizado: true,
      finalizado_at: new Date().toISOString(),
      pelota: 'admin',
      ultima_nota: 'Trámite finalizado',
      ultima_accion_at: new Date().toISOString(),
    }).eq('id', id)
    await supabase.from('movimientos').insert({
      tramite_id: id,
      estado: 'finalizado',
      nota: 'Trámite finalizado',
      pelota: 'admin',
      registrado_por: 'admin',
    })
    setSaving(false)
    setShowConfirmFinalizar(false)
    loadTramite()
    loadMovimientos()
  }

  async function reabrirTramite() {
    setSaving(true)
    await supabase.from('tramites').update({
      finalizado: false,
      finalizado_at: null,
    }).eq('id', id)
    setSaving(false)
    loadTramite()
  }

  async function pausarTramite() {
    setSaving(true)
    await supabase.from('tramites').update({
      estado_actual: 'en_pausa', pelota: 'admin', ultima_accion_at: new Date().toISOString()
    }).eq('id', id)
    await supabase.from('movimientos').insert({
      tramite_id: id, estado: 'en_pausa', nota: 'Trámite pausado', pelota: 'admin', registrado_por: 'admin'
    })
    setSaving(false)
    loadTramite()
    loadMovimientos()
  }

  async function reactivarTramite() {
    setSaving(true)
    await supabase.from('tramites').update({
      estado_actual: 'dibujo', pelota: 'admin', ultima_accion_at: new Date().toISOString()
    }).eq('id', id)
    setSaving(false)
    loadTramite()
  }

  function notificarWhatsApp() {
    if (!tramite || !notificacionPendiente) return
    const esTecnica = notificacionPendiente === 'tecnica'
    const phone = esTecnica ? FER_PHONE : SILVINA_PHONE
    const estadoActual = estadoLabel(tramite.estado_actual)
    const msg = esTecnica
      ? `Hola Fer! 🔧 Nuevo trámite asignado a técnica:\n*${tramite.numero_p} — ${tramite.nombre}*\n${tramite.tramite} · ${tramite.municipio}\n📝 ${estadoActual}\n💬 ${tramite.ultima_nota}\nhttps://tekton-app-nuevo.vercel.app/tramites/${id}`
      : `Hola Silvina! 📋 Técnica devuelve trámite:\n*${tramite.numero_p} — ${tramite.nombre}*\n${tramite.tramite} · ${tramite.municipio}\n📝 ${estadoActual}\n💬 ${tramite.ultima_nota}\nhttps://tekton-app-nuevo.vercel.app/tramites/${id}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    setNotificacionPendiente(null)
  }

  async function guardarNumerosYDibujante() {
    setSaving(true)
    const dibujanteFinal = editN.dibujante === 'otro' ? dibujante_custom : editN.dibujante
    await supabase.from('tramites').update({
      n_parcelaria: editN.parcelaria,
      n_expediente: editN.expediente,
      dibujante: dibujanteFinal,
      costo_dibujo: editN.costo_dibujo ? parseFloat(editN.costo_dibujo) : null,
      fecha_entrega_dibujo: editN.fecha_entrega,
      domicilio: editN.domicilio,
      celular: editN.celular,
      firma: editN.firma,
    }).eq('id', id)
    setSaving(false)
    setEditandoDatos(false)
    loadTramite()
  }

  async function toggleChecklist(key: string) {
    if (!tramite) return
    const nuevoChecklist = { ...tramite.checklist, [key]: !tramite.checklist?.[key] }
    await supabase.from('tramites').update({ checklist: nuevoChecklist }).eq('id', id)
    loadTramite()
  }

  const responsableColor = (p: string) => {
    const colors: Record<string, string> = { admin: '#3b82f6', tecnica: '#f97316', cliente: '#8b5cf6', municipio: TEAL }
    return colors[p] || '#888'
  }
  const responsableLabel = (p: string) => {
    const labels: Record<string, string> = { admin: 'Adm/Comercial', tecnica: 'Técnica', cliente: 'Cliente', municipio: 'Municipio' }
    return labels[p] || p
  }

  const estadoLabel = (key: string) => {
    if (key === 'finalizado') return '✅ Finalizado'
    const norm = ESTADO_MAP[key] || key
    const todos = [...SUBESTADOS_TECNICA, ...SUBESTADOS_MUNICIPIO]
    return todos.find(s => s.key === norm)?.label || norm.replace(/_/g, ' ')
  }

  const subestadosActuales = nuevoResponsable === 'tecnica'
    ? SUBESTADOS_TECNICA
    : nuevoResponsable === 'municipio'
    ? SUBESTADOS_MUNICIPIO
    : []

  if (!tramite) return (
    <div style={{ background: '#1a2332', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
      Cargando...
    </div>
  )

  const tareasCompletadas = TAREAS_FINALES.filter(t => tramite.checklist?.[t.key]).length
  const enPausa = tramite.estado_actual === 'en_pausa'

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', width: '100%', maxWidth: 480 }}>
        <button onClick={() => router.back()} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {tramite.numero_p && <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{tramite.numero_p}</span>}
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{tramite.nombre}</p>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{tramite.municipio} · {tramite.tramite}</p>
        </div>
        {tramite.finalizado && (
          <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(74,222,128,0.15)', color: '#4ade80', padding: '3px 10px', borderRadius: 20 }}>✅ Finalizado</span>
        )}
      </div>

      {/* NOTIFICACIÓN WHATSAPP PENDIENTE */}
      {notificacionPendiente && (
        <div style={{ width: '100%', maxWidth: 480, marginBottom: 12 }}>
          <button onClick={notificarWhatsApp} style={{
            width: '100%', padding: 14, fontSize: 14, fontWeight: 600,
            background: 'rgba(37,211,102,0.15)', color: '#25d366',
            border: '1.5px solid rgba(37,211,102,0.3)', borderRadius: 14
          }}>
            📲 {notificacionPendiente === 'tecnica' ? 'Notificar a Fer por WhatsApp' : 'Notificarme por WhatsApp'}
          </button>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 480, display: 'grid', gap: 12 }}>

        {/* ESTADO ACTUAL */}
        <div style={{ background: tramite.finalizado ? 'rgba(74,222,128,0.08)' : 'rgba(45,212,176,0.1)', borderRadius: 14, border: `1.5px solid ${tramite.finalizado ? 'rgba(74,222,128,0.3)' : 'rgba(45,212,176,0.35)'}`, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: tramite.finalizado ? '#4ade80' : 'rgba(45,212,176,0.7)', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Estado actual</p>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{tramite.ultima_accion_at ? new Date(tramite.ultima_accion_at).toLocaleDateString('es-AR') : ''}</span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>
            {tramite.finalizado ? '✅ Finalizado' : estadoLabel(tramite.estado_actual)}
          </p>
          {tramite.finalizado && tramite.finalizado_at && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px' }}>
              Cerrado el {new Date(tramite.finalizado_at).toLocaleDateString('es-AR')}
            </p>
          )}
          {tramite.ultima_nota && !tramite.finalizado && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px', fontStyle: 'italic' }}>"{tramite.ultima_nota}"</p>
          )}
          {!tramite.finalizado && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', padding: '5px 10px', borderRadius: 20, width: 'fit-content' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: responsableColor(tramite.pelota) }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Responsable: {responsableLabel(tramite.pelota)}</span>
            </div>
          )}
        </div>

        {/* DATOS DEL EXPEDIENTE */}
        <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Datos del expediente</p>
            {!tramite.finalizado && (
              <button onClick={() => setEditandoDatos(!editandoDatos)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${BORDER}`, background: 'transparent', color: 'rgba(255,255,255,0.4)' }}>
                {editandoDatos ? 'Cancelar' : 'Editar'}
              </button>
            )}
          </div>
          {editandoDatos && !tramite.finalizado ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Domicilio de obra</label>
                <input value={editN.domicilio} onChange={e => setEditN(n => ({ ...n, domicilio: e.target.value }))} placeholder="Ej: Rivadavia 1234" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Celular</label>
                <input value={editN.celular} onChange={e => setEditN(n => ({ ...n, celular: e.target.value }))} placeholder="Ej: 1155556666" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Firma</label>
                <input value={editN.firma} onChange={e => setEditN(n => ({ ...n, firma: e.target.value }))} placeholder="Ej: A confirmar" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Dibujante asignado</label>
                <select value={editN.dibujante} onChange={e => setEditN(n => ({ ...n, dibujante: e.target.value }))}>
                  <option value="">Sin asignar</option>
                  {DIBUJANTES.map(d => <option key={d}>{d}</option>)}
                  <option value="otro">+ Escribir nombre...</option>
                </select>
                {editN.dibujante === 'otro' && (
                  <input value={dibujante_custom} onChange={e => setDibujanteCustom(e.target.value)} placeholder="Nombre del dibujante" style={{ marginTop: 6 }} />
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Número de parcelaria (Catastro)</label>
                <input value={editN.parcelaria} onChange={e => setEditN(n => ({ ...n, parcelaria: e.target.value }))} placeholder="Ej: 310" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Número de expediente (Obras Part.)</label>
                <input value={editN.expediente} onChange={e => setEditN(n => ({ ...n, expediente: e.target.value }))} placeholder="Ej: 153/2026" />
              </div>
              <button onClick={guardarNumerosYDibujante} disabled={saving} style={{ padding: 10, fontSize: 13, fontWeight: 600, background: TEAL, color: '#1a2332', border: 'none', borderRadius: 10 }}>
                {saving ? 'Guardando...' : 'Guardar datos'}
              </button>
            </div>
          ) : (
            <div>
              <Fila label="Domicilio" value={tramite.domicilio || '—'} />
              <Fila label="Celular" value={tramite.celular || '—'} />
              <Fila label="Dibujante" value={tramite.dibujante || '—'} />
              {tramite.costo_dibujo > 0 && <Fila label="Costo dibujo" value={`USD ${tramite.costo_dibujo}`} />}
              {tramite.fecha_entrega_dibujo && <Fila label="Entrega estimada" value={new Date(tramite.fecha_entrega_dibujo).toLocaleDateString('es-AR')} />}
              <Fila label="Parcelaria" value={tramite.n_parcelaria || '—'} />
              <Fila label="Exp. municipal" value={tramite.n_expediente || '—'} />
              <Fila label="Firma" value={tramite.firma || '—'} />
            </div>
          )}
        </div>

        {/* TAREAS FINALES */}
        <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${tareasCompletadas === TAREAS_FINALES.length ? 'rgba(74,222,128,0.3)' : BORDER}`, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Tareas finales</p>
            <span style={{ fontSize: 11, color: tareasCompletadas === TAREAS_FINALES.length ? '#4ade80' : 'rgba(255,255,255,0.35)' }}>
              {tareasCompletadas}/{TAREAS_FINALES.length}
            </span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {TAREAS_FINALES.map(item => {
              const checked = tramite.checklist?.[item.key] || false
              return (
                <button key={item.key} onClick={() => !tramite.finalizado && toggleChecklist(item.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: checked ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${checked ? 'rgba(74,222,128,0.3)' : BORDER}`,
                  borderRadius: 10, padding: '10px 14px', textAlign: 'left', width: '100%',
                  cursor: tramite.finalizado ? 'default' : 'pointer'
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    background: checked ? '#4ade80' : 'transparent',
                    border: `2px solid ${checked ? '#4ade80' : 'rgba(255,255,255,0.2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {checked && <span style={{ fontSize: 12, color: '#1a2332', fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 14, color: checked ? '#4ade80' : 'rgba(255,255,255,0.7)', fontWeight: checked ? 600 : 400, textDecoration: checked ? 'line-through' : 'none' }}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* REGISTRAR MOVIMIENTO — solo si no está finalizado */}
        {!tramite.finalizado && (
          <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>Registrar movimiento</p>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Responsable</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {RESPONSABLES.map(r => (
                    <button key={r.key} onClick={() => { setNuevoResponsable(r.key); setNuevoSubestado('') }} style={{
                      fontSize: 11, padding: '5px 11px', borderRadius: 20,
                      border: `1.5px solid ${nuevoResponsable === r.key ? 'rgba(45,212,176,0.4)' : BORDER}`,
                      background: nuevoResponsable === r.key ? 'rgba(45,212,176,0.15)' : 'transparent',
                      color: nuevoResponsable === r.key ? TEAL : 'rgba(255,255,255,0.5)'
                    }}>{r.label}</button>
                  ))}
                </div>
              </div>

              {subestadosActuales.length > 0 && (
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Subestado</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {subestadosActuales.map(s => (
                      <button key={s.key} onClick={() => setNuevoSubestado(s.key)} style={{
                        fontSize: 11, padding: '5px 11px', borderRadius: 20,
                        border: `1.5px solid ${nuevoSubestado === s.key ? 'rgba(45,212,176,0.4)' : BORDER}`,
                        background: nuevoSubestado === s.key ? 'rgba(45,212,176,0.15)' : 'transparent',
                        color: nuevoSubestado === s.key ? TEAL : 'rgba(255,255,255,0.5)'
                      }}>{s.label}</button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Nota</label>
                <textarea value={nuevaNota} onChange={e => setNuevaNota(e.target.value)} placeholder="Ej: Catastro mandó correcciones del plano..." style={{ minHeight: 56, resize: 'vertical' }} />
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>🔗 Link Dropbox / Drive (opcional)</label>
                <input value={nuevoLink} onChange={e => setNuevoLink(e.target.value)} placeholder="https://www.dropbox.com/..." />
              </div>

              <button onClick={registrarMovimiento} disabled={saving || !nuevaNota} style={{
                padding: 10, fontSize: 14, fontWeight: 600,
                background: TEAL, color: '#1a2332', border: 'none', borderRadius: 10,
                opacity: !nuevaNota ? 0.5 : 1
              }}>{saving ? 'Guardando...' : 'Registrar'}</button>
            </div>
          </div>
        )}

        {/* BOTONES DE ESTADO — Pausar/Reactivar y Finalizar/Reabrir, cada uno independiente */}
        <div style={{ display: 'grid', gap: 8 }}>
          {!tramite.finalizado && !enPausa && (
            <button onClick={pausarTramite} disabled={saving} style={{
              padding: 12, fontSize: 14, fontWeight: 600,
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
              border: `1.5px solid ${BORDER}`, borderRadius: 14
            }}>⏸ Pausar trámite</button>
          )}

          {!tramite.finalizado && enPausa && (
            <button onClick={reactivarTramite} disabled={saving} style={{
              padding: 12, fontSize: 14, fontWeight: 600,
              background: 'rgba(251,191,36,0.12)', color: '#fbbf24',
              border: '1.5px solid rgba(251,191,36,0.3)', borderRadius: 14
            }}>▶ Reactivar trámite</button>
          )}

          {!tramite.finalizado ? (
            <button onClick={() => setShowConfirmFinalizar(true)} style={{
              padding: 12, fontSize: 14, fontWeight: 600,
              background: 'rgba(74,222,128,0.12)', color: '#4ade80',
              border: '1.5px solid rgba(74,222,128,0.3)', borderRadius: 14
            }}>✅ Marcar como finalizado</button>
          ) : (
            <button onClick={reabrirTramite} disabled={saving} style={{
              padding: 10, fontSize: 13,
              background: 'transparent', color: 'rgba(255,255,255,0.3)',
              border: `1.5px solid ${BORDER}`, borderRadius: 14
            }}>Reabrir trámite</button>
          )}
        </div>

        {/* HISTORIAL */}
        <div>
          <button onClick={() => setHistorialAbierto(!historialAbierto)} style={{
            width: '100%', background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`,
            padding: 14, textAlign: 'left', marginBottom: 8
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: 'rgba(255,255,255,0.5)' }}>
              Historial ({movimientos.length}) {historialAbierto ? '↑' : '↓'}
            </p>
          </button>

          {historialAbierto && (
            <div style={{ display: 'grid', gap: 8 }}>
              {movimientos.map(m => (
                <div key={m.id} style={{ background: DARK2, borderRadius: 12, border: `1.5px solid ${BORDER}`, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: TEAL }}>{estadoLabel(m.estado)}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{new Date(m.created_at).toLocaleDateString('es-AR')}</span>
                  </div>
                  {m.nota && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 6px' }}>{m.nota}</p>}
                  {m.link && (
                    <a href={m.link} target="_blank" rel="noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 11, color: TEAL, textDecoration: 'none',
                      background: 'rgba(45,212,176,0.1)', padding: '4px 10px', borderRadius: 20, marginBottom: 6
                    }}>🔗 Ver archivo</a>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: responsableColor(m.pelota) }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{responsableLabel(m.pelota)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL CONFIRMAR FINALIZAR */}
      {showConfirmFinalizar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
          <div style={{ background: '#1a2332', borderRadius: 18, padding: 24, width: '100%', maxWidth: 360, border: `1.5px solid ${BORDER}` }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', color: '#fff' }}>¿Finalizar trámite?</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px' }}>
              El trámite quedará cerrado. Podés reabrirlo si es necesario.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setShowConfirmFinalizar(false)} style={{ padding: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 10 }}>Cancelar</button>
              <button onClick={finalizarTramite} disabled={saving} style={{ padding: 10, fontSize: 13, fontWeight: 600, background: '#4ade80', color: '#1a2332', border: 'none', borderRadius: 10 }}>
                {saving ? '...' : 'Finalizar ✅'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Fila({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <span style={{ fontSize: 13, color: value === '—' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)' }}>{value}</span>
    </div>
  )
}
