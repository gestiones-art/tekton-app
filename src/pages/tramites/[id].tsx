import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

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
    domicilio: '', celular: ''
  })
  const [saving, setSaving] = useState(false)

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
        celular: data.celular || ''
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
    setNuevaNota(''); setNuevoSubestado(''); setNuevoLink('')
    setSaving(false)
    loadTramite(); loadMovimientos()
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
    }).eq('id', id)
    setSaving(false)
    setEditandoDatos(false)
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

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', width: '100%', maxWidth: 480 }}>
        <button onClick={() => router.push('/tramites')} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {tramite.numero_p && <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{tramite.numero_p}</span>}
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{tramite.nombre}</p>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{tramite.municipio} · {tramite.tramite}</p>
        </div>
      </div>

      {/* ESTADO ACTUAL */}
      <div style={{ background: 'rgba(45,212,176,0.1)', borderRadius: 14, border: '1.5px solid rgba(45,212,176,0.35)', padding: 14, marginBottom: 12, width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(45,212,176,0.7)', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Estado actual</p>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{tramite.ultima_accion_at ? new Date(tramite.ultima_accion_at).toLocaleDateString('es-AR') : ''}</span>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>{estadoLabel(tramite.estado_actual)}</p>
        {tramite.ultima_nota && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px', fontStyle: 'italic' }}>"{tramite.ultima_nota}"</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', padding: '5px 10px', borderRadius: 20, width: 'fit-content' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: responsableColor(tramite.pelota) }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Responsable: {responsableLabel(tramite.pelota)}</span>
        </div>
      </div>

      {/* DATOS DEL EXPEDIENTE */}
      <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12, width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Datos del expediente</p>
          <button onClick={() => setEditandoDatos(!editandoDatos)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${BORDER}`, background: 'transparent', color: 'rgba(255,255,255,0.4)' }}>
            {editandoDatos ? 'Cancelar' : 'Editar'}
          </button>
        </div>
        {editandoDatos ? (
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
            {(tramite.estado_actual === 'en_dibujo' || editN.costo_dibujo || editN.fecha_entrega) && (
              <>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Costo del dibujo (USD)</label>
                  <input type="number" value={editN.costo_dibujo} onChange={e => setEditN(n => ({ ...n, costo_dibujo: e.target.value }))} placeholder="Ej: 150" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Fecha estimada de entrega</label>
                  <input type="date" value={editN.fecha_entrega} onChange={e => setEditN(n => ({ ...n, fecha_entrega: e.target.value }))} />
                </div>
              </>
            )}
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
      {/* TAREAS FINALES */}
<div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12, width: '100%', maxWidth: 480 }}>
  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>Tareas finales</p>
  <div style={{ display: 'grid', gap: 10 }}>
    {[
      { key: 'derechos_pagados', label: 'Derechos pagados' },
      { key: 'estructura_lista', label: 'Estructura lista' },
      { key: 'colegio_listo', label: 'Colegio listo' },
      { key: 'planilla_estadistica', label: 'Planilla de estadística' },
    ].map(item => {
      const checked = tramite.checklist?.[item.key] || false
      return (
        <button key={item.key} onClick={async () => {
          const nuevoChecklist = { ...tramite.checklist, [item.key]: !checked }
          await supabase.from('tramites').update({ checklist: nuevoChecklist }).eq('id', id)
          loadTramite()
        }} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: checked ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
          border: `1.5px solid ${checked ? 'rgba(74,222,128,0.3)' : BORDER}`,
          borderRadius: 10, padding: '10px 14px', textAlign: 'left', width: '100%'
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
        )}
      </div>

      {/* REGISTRAR MOVIMIENTO */}
      <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12, width: '100%', maxWidth: 480 }}>
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

      {/* HISTORIAL */}
      <div style={{ width: '100%', maxWidth: 480 }}>
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
