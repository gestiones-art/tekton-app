import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

const ESTADOS = [
  'consulta_recibida', 'en_validacion', 'presupuesto_enviado', 'presupuesto_aceptado',
  'anticipo_abonado', 'pendiente_documentacion', 'documentacion_recibida',
  'listo_para_dibujo', 'en_dibujo', 'en_revision_tecnica', 'aprobado_para_presentar',
  'listo_para_presentar', 'presentado_catastro', 'observado_catastro',
  'ok_catastro', 'presentado_obras', 'observado_obras', 'ok_obras',
  'primer_visado', 'correc_visado', 'pendiente_derechos', 'derechos_abonados',
  'pendiente_aportes', 'aportes_abonados', 'estructura_en_proceso', 'estructura_lista',
  'pendiente_colegio', 'listo_para_entrega', 'pendiente_saldo', 'finalizado'
]

const PELOTA_OPS = ['silvina', 'fer', 'dibujante', 'cliente', 'municipio']

type Tramite = {
  id: string, nombre: string, celular: string, domicilio: string,
  municipio: string, tramite: string, prioridad: string, firma: string,
  firmante_nombre: string, firmante_apellido: string,
  firmante_mat_provincial: string, firmante_mat_municipal: string,
  dibujante: string, n_parcelaria: string, n_expediente: string,
  estado_actual: string, pelota: string, ultima_nota: string, ultima_accion_at: string
}

type Movimiento = {
  id: string, created_at: string, estado: string, nota: string,
  pelota: string, registrado_por: string
}

export default function TramiteDetalle() {
  const router = useRouter()
  const { id } = router.query
  const [tramite, setTramite] = useState<Tramite | null>(null)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [nuevaNota, setNuevaNota] = useState('')
  const [nuevaPelota, setNuevaPelota] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) { loadTramite(); loadMovimientos() }
  }, [id])

  async function loadTramite() {
    const { data } = await supabase.from('tramites').select('*').eq('id', id).single()
    if (data) { setTramite(data); setNuevaPelota(data.pelota) }
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
      pelota: nuevaPelota, registrado_por: 'silvina'
    })
    await supabase.from('tramites').update({
      estado_actual: estado, pelota: nuevaPelota,
      ultima_nota: nuevaNota, ultima_accion_at: new Date().toISOString(),
      ultima_accion_por: 'silvina'
    }).eq('id', id)
    setNuevaNota(''); setNuevoEstado('')
    setSaving(false)
    loadTramite(); loadMovimientos()
  }

  const pelotaColor = (p: string) => {
    const colors: Record<string, string> = { silvina: '#3b82f6', fer: '#f97316', cliente: '#8b5cf6', municipio: TEAL, dibujante: '#fbbf24' }
    return colors[p] || '#888'
  }
  const pelotaLabel = (p: string) => {
    const labels: Record<string, string> = { silvina: 'Silvina', fer: 'Área técnica', cliente: 'Cliente', municipio: 'Municipio', dibujante: 'Dibujante' }
    return labels[p] || p
  }

  if (!tramite) return <div style={{ background: '#1a2332', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>Cargando...</div>

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/tramites')} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{tramite.nombre}</p>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{tramite.municipio} · {tramite.tramite}</p>
        </div>
      </div>

      {/* ESTADO ACTUAL */}
      <div style={{ background: 'rgba(45,212,176,0.1)', borderRadius: 14, border: '1.5px solid rgba(45,212,176,0.35)', padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(45,212,176,0.7)', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Estado actual</p>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{new Date(tramite.ultima_accion_at).toLocaleDateString('es-AR')}</span>
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{tramite.estado_actual?.replace(/_/g, ' ')}</p>
        {tramite.ultima_nota && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px', fontStyle: 'italic' }}>"{tramite.ultima_nota}"</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', padding: '5px 10px', borderRadius: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: pelotaColor(tramite.pelota) }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Pelota: {pelotaLabel(tramite.pelota)}</span>
          </div>
          {tramite.n_expediente && (
            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '5px 10px', borderRadius: 20 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Exp: {tramite.n_expediente}</span>
            </div>
          )}
        </div>
      </div>

      {/* REGISTRAR MOVIMIENTO */}
      <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>Registrar movimiento</p>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Nuevo estado</label>
            <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}>
              <option value="">Mantener estado actual</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Nota</label>
            <textarea value={nuevaNota} onChange={e => setNuevaNota(e.target.value)} placeholder="Ej: visadora dijo que lo manda hoy..." style={{ minHeight: 56, resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Pelota</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PELOTA_OPS.map(p => (
                <button key={p} onClick={() => setNuevaPelota(p)} style={{
                  fontSize: 11, padding: '5px 11px', borderRadius: 20,
                  border: `1.5px solid ${nuevaPelota === p ? 'rgba(45,212,176,0.4)' : BORDER}`,
                  background: nuevaPelota === p ? 'rgba(45,212,176,0.15)' : 'transparent',
                  color: nuevaPelota === p ? TEAL : 'rgba(255,255,255,0.5)'
                }}>{pelotaLabel(p)}</button>
              ))}
            </div>
          </div>
          <button onClick={registrarMovimiento} disabled={saving} style={{ padding: 10, fontSize: 13, fontWeight: 600, background: TEAL, color: '#1a2332', border: 'none', borderRadius: 10, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando...' : 'Guardar movimiento ✓'}
          </button>
        </div>
      </div>

      {/* DATOS */}
      <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>Datos</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, fontSize: 12 }}>
          {[['Domicilio', tramite.domicilio], ['Celular', tramite.celular], ['Municipio', tramite.municipio], ['Firma', tramite.firma], ['Dibujante', tramite.dibujante], ['Parcelaria', tramite.n_parcelaria], ['Expediente', tramite.n_expediente], ['Prioridad', tramite.prioridad]].map(([k, v]) => v ? (
            <div key={k}><p style={{ color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>{k}</p><p style={{ color: '#fff', fontWeight: 500, margin: 0 }}>{v}</p></div>
          ) : null)}
        </div>
      </div>

      {/* HISTORIAL */}
      <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Historial</p>
          <button onClick={() => setHistorialAbierto(!historialAbierto)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${BORDER}`, background: 'transparent', color: 'rgba(255,255,255,0.5)' }}>
            {historialAbierto ? 'Cerrar ↑' : 'Ver todo ↓'}
          </button>
        </div>

        {movimientos.slice(0, historialAbierto ? undefined : 1).map((m, i) => (
          <div key={m.id} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ flexShrink: 0, paddingTop: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? TEAL : 'rgba(255,255,255,0.2)' }} />
            </div>
            <div style={{ flex: 1, paddingBottom: 8, borderBottom: i < movimientos.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <p style={{ fontSize: 12, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.6)', margin: 0 }}>{m.estado?.replace(/_/g, ' ')}</p>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{new Date(m.created_at).toLocaleDateString('es-AR')}</span>
              </div>
              {m.nota && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{m.nota} · {m.registrado_por}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
