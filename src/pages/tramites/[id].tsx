import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

const ESTADOS = [
  { key: 'en_dibujo', label: '✏️ En dibujo' },
  { key: 'en_revision_tecnica', label: '🔍 En revisión técnica' },
  { key: 'listo_para_presentar', label: '✅ Listo para presentar' },
  { key: 'presentado_catastro', label: '📤 Inicio Catastro' },
  { key: 'observado_catastro', label: '🔴 Correc. Catastro' },
  { key: 'ok_catastro', label: '✅ OK Catastro' },
  { key: 'presentado_obras', label: '🏠 Inicio Obras Particulares' },
  { key: 'observado_obras', label: '🔴 Correc. Obras Particulares' },
  { key: 'primer_visado', label: '📋 Primer visado' },
  { key: 'correc_visado', label: '🔴 Correc. Visado' },
  { key: 'pendiente_derechos', label: '💰 Pendiente derechos' },
  { key: 'derechos_abonados', label: '✅ Derechos abonados' },
  { key: 'estructura_en_proceso', label: '🏗️ Estructura en proceso' },
  { key: 'estructura_lista', label: '✅ Estructura lista' },
  { key: 'pendiente_colegio', label: '🎓 Pendiente colegio' },
  { key: 'pendiente_saldo', label: '💰 Pendiente saldo' },
  { key: 'listo_para_entrega', label: '📦 Listo para entrega' },
  { key: 'finalizado', label: '🏁 Finalizado' },
  { key: 'en_pausa', label: '⏸️ En pausa' },
]

const RESPONSABLE_OPS = ['admin', 'tecnica', 'dibujante', 'cliente', 'municipio']
const DIBUJANTES = ['Mario', 'Meli', 'Caro', 'Mili', 'Maria', 'Fer']

type Tramite = {
  id: string
  numero_p: string
  nombre: string
  celular: string
  domicilio: string
  municipio: string
  tramite: string
  prioridad: string
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
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [nuevaNota, setNuevaNota] = useState('')
  const [nuevoResponsable, setNuevoResponsable] = useState('')
  const [nuevoLink, setNuevoLink] = useState('')
  const [dibujante_custom, setDibujanteCustom] = useState('')
  const [editN, setEditN] = useState({ parcelaria: '', expediente: '', dibujante: '', costo_dibujo: '', fecha_entrega: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) { loadTramite(); loadMovimientos() }
  }, [id])

  async function loadTramite() {
    const { data } = await supabase.from('tramites').select('*').eq('id', id).single()
    if (data) {
      setTramite(data)
      setNuevoResponsable(data.pelota || 'admin')
      setEditN({
        parcelaria: data.n_parcelaria || '',
        expediente: data.n_expediente || '',
        dibujante: data.dibujante || '',
        costo_dibujo: data.costo_dibujo || '',
        fecha_entrega: data.fecha_entrega_dibujo || ''
      })
    }
  }

  async function loadMovimientos() {
    const { data } = await supabase.from('movimientos').select('*').eq('tramite_id', id).order('created_at', { ascending: false })
    setMovimientos(data || [])
  }

  async function registrarMovimiento() {
    if (!nuevaNota && !nuevoEstado) return
    setSaving(true)
    const estado = nuevoEstado || tramite?.estado_actual || ''
    await supabase.from('movimientos').insert({
      tramite_id: id, estado, nota: nuevaNota,
      pelota: nuevoResponsable, registrado_por: 'admin',
      link: nuevoLink
    })
    await supabase.from('tramites').update({
      estado_actual: estado, pelota: nuevoResponsable,
      ultima_nota: nuevaNota, ultima_accion_at: new Date().toISOString(),
    }).eq('id', id)
    setNuevaNota(''); setNuevoEstado(''); setNuevoLink('')
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
    }).eq('id', id)
    setSaving(false)
    setEditandoDatos(false)
    loadTramite()
  }

  const responsableColor = (p: string) => {
    const colors: Record<string, string> = { admin: '#3b82f6', tecnica: '#f97316', cliente: '#8b5cf6', municipio: TEAL, dibujante: '#fbbf24' }
    return colors[p] || '#888'
  }
  const responsableLabel = (p: string) => {
    const labels: Record<string, string> = { admin: 'Adm/Comercial', tecnica: 'Técnica', cliente: 'Cliente', municipio: 'Municipio', dibujante: 'Dibujante' }
    return labels[p] || p
  }

  if (!tramite) return <div style={{ background: '#1a2332', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>Cargando...</div>

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/tramites')} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {tramite.numero_p && <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{tramite.numero_p}</span>}
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{tramite.nombre}</p>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{tramite.municipio} · {tramite.tramite}</p>
        </div>
      </div>

      <div style={{ background: 'rgba(45,212,176,0.1)', borderRadius: 14, border: '1.5px solid rgba(45,212,176,0.35)', padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(45,212,176,0.7)', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Estado actual</p>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{tramite.ultima_accion_at ? new Date(tramite.ultima_accion_at).toLocaleDateString('es-AR') : ''}</span>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>
          {ESTADOS.find(e => e.key === tramite.estado_actual)?.label || tramite.estado_actual?.replace(/_/g, ' ')}
        </p>
        {tramite.ultima_nota && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px', fontStyle: 'italic' }}>"{tramite.ultima_nota}"</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', padding: '5px 10px', borderRadius: 20, width: 'fit-content' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: responsableColor(tramite.pelota) }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Responsable: {responsableLabel(tramite.pelota)}</span>
        </div>
      </div>

      <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Datos del expediente</p>
          <button onClick={() => setEditandoDatos(!editandoDatos)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${BORDER}`, background: 'transparent', color: 'rgba(255,255,255,0.4)' }}>
            {editandoDatos ? 'Cancelar' : 'Editar'}
          </button>
        </div>
        {editandoDatos ? (
          <div style={{ display: 'grid', gap: 10 }}>
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
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>✏️ Costo del dibujo (USD)</label>
                  <input type="number" value={editN.costo_dibujo} onChange={e => setEditN(n => ({ ...n, costo_dibujo: e.target.value }))} placeholder="Ej: 150" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>✏️ Fecha estimada de entrega</label>
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
            <Fila label="Dibujante" value={tramite.dibujante || '—'} />
            {tramite.costo_dibujo > 0 && <Fila label="Costo dibujo" value={`USD ${tramite.costo_dibujo}`} />}
            {tramite.fecha_entrega_dibujo && <Fila label="Entrega estimada" value={new Date(tramite.fecha_entrega_dibujo).toLocaleDateString('es-AR')} />}
            <Fila label="Parcelaria" value={tramite.n_parcelaria || '—'} />
            <Fila label="Exp. municipal" value={tramite.n_expediente || '—'} />
            <Fila label="Firma" value={tramite.firma || '—'} />
            <Fila label="Domicilio" value={tramite.domicilio} />
            <Fila label="Celular" value={tramite.celular} />
          </div>
        )}
      </div>

      <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>Registrar movimiento</p>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Nuevo estado</label>
            <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}>
              <option value="">Mantener estado actual</option>
              {ESTADOS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Nota</label>
            <textarea value={nuevaNota} onChange={e => setNuevaNota(e.target.value)} placeholder="Ej: Catastro mandó correcciones del plano..." style={{ minHeight: 56, resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>🔗 Link Dropbox / Drive (opcional)</label>
            <input value={nuevoLink} onChange={e => setNuevoLink(e.target.value)} placeholder="https://www.dropbox.com/..." />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Responsable</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {RESPONSABLE_OPS.map(p => (
                <button key={p} onClick={() => setNuevoResponsable(p)} style={{
                  fontSize: 11, padding: '5px 11px', borderRadius: 20,
                  border: `1.5px solid ${nuevoResponsable === p ? 'rgba(45,212,176,0.4)' : BORDER}`,
                  background: nuevoResponsable === p ? 'rgba(45,212,176,0.15)' : 'transparent',
                  color: nuevoResponsable === p ? TEAL : 'rgba(255,255,255,0.5)'
                }}>{responsableLabel(p)}</button>
              ))}
            </div>
          </div>
          <button onClick={registrarMovimiento} disabled={saving || (!nuevaNota && !nuevoEstado)} style={{
            padding: 10, fontSize: 14, fontWeight: 600,
            background: TEAL, color: '#1a2332', border: 'none', borderRadius: 10,
            opacity: (!nuevaNota && !nuevoEstado) ? 0.5 : 1
          }}>{saving ? 'Guardando...' : 'Registrar'}</button>
        </div>
      </div>

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
                <span style={{ fontSize: 11, fontWeight: 600, color: TEAL }}>{ESTADOS.find(e => e.key === m.estado)?.label || m.estado?.replace(/_/g, ' ')}</span>
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
