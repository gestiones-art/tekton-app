import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

const MUNICIPIOS = ['San Isidro', 'Vicente López', 'Tigre', 'San Fernando']
const TRAMITES = ['Permiso de construcción', 'Demolición total', 'Conforme a obra', 'Regularización', 'Consulta previa', 'Estudio de factibilidad']

type Consulta = {
  id: string
  numero_p: string
  nombre: string
  celular: string
  domicilio: string
  municipio: string
  tramite: string
  prioridad: string
  firma: string
  como_conocio: string
  observaciones: string
  created_at: string
  estado: string
  info_faltante: string
  obs_presupuesto: string
  ajusta_cou: string
  derechos_estimados: number
  aportes_estimados: number
  archivos: string[]
  motivo_cancelacion: string
}

export default function ConsultaDetalle() {
  const router = useRouter()
  const { id } = router.query
  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Partial<Consulta>>({})
  const [saving, setSaving] = useState(false)
  const [showCancelar, setShowCancelar] = useState(false)
  const [showBorrar, setShowBorrar] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')

  useEffect(() => { if (id) loadConsulta() }, [id])

  async function loadConsulta() {
    const { data } = await supabase.from('consultas').select('*').eq('id', id).single()
    if (data) { setConsulta(data); setForm(data) }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function guardarEdicion() {
    setSaving(true)
    await supabase.from('consultas').update({
      nombre: form.nombre, celular: form.celular,
      domicilio: form.domicilio, municipio: form.municipio,
      tramite: form.tramite, prioridad: form.prioridad,
      como_conocio: form.como_conocio, observaciones: form.observaciones,
      estado: 'pendiente_validacion',
    }).eq('id', id)
    setSaving(false)
    setEditando(false)
    loadConsulta()
  }

  async function cancelarConsulta() {
    if (!motivoCancelacion) return
    setSaving(true)
    await supabase.from('consultas').update({
      estado: 'cancelado',
      motivo_cancelacion: motivoCancelacion
    }).eq('id', id)
    setSaving(false)
    setShowCancelar(false)
    loadConsulta()
  }

  async function borrarConsulta() {
    setSaving(true)
    await supabase.from('consultas').delete().eq('id', id)
    setSaving(false)
    router.push('/consultas')
  }

  async function reenviarATecnica() {
    setSaving(true)
    await supabase.from('consultas').update({
      estado: 'pendiente_validacion', info_faltante: ''
    }).eq('id', id)
    setSaving(false)
    loadConsulta()
  }

  if (!consulta) return <div style={{ background: '#1a2332', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>Cargando...</div>

  const cancelada = consulta.estado === 'cancelado'
  const devuelta = consulta.estado === 'pendiente_info'
  const puedeEditar = !cancelada

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/consultas')} style={{
          width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{consulta.numero_p}</span>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{consulta.nombre}</p>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{consulta.municipio} · {consulta.tramite}</p>
        </div>
        {puedeEditar && !editando && (
          <button onClick={() => setEditando(true)} style={{
            fontSize: 12, padding: '6px 12px', borderRadius: 20,
            border: `1.5px solid ${BORDER}`, background: 'transparent', color: 'rgba(255,255,255,0.5)'
          }}>Editar</button>
        )}
      </div>

      {devuelta && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1.5px solid rgba(248,113,113,0.3)', borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#f87171', margin: '0 0 4px' }}>⚠ Devuelta por área técnica</p>
          {consulta.info_faltante && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>{consulta.info_faltante}</p>}
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 10px' }}>Editá la consulta y reenviala cuando tengas la información.</p>
          <button onClick={reenviarATecnica} style={{
            fontSize: 12, padding: '7px 14px', borderRadius: 20,
            background: '#f87171', color: '#fff', border: 'none', fontWeight: 600
          }}>Reenviar a técnica</button>
        </div>
      )}

      {cancelada && (
        <div style={{ background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Consulta cancelada</p>
          {consulta.motivo_cancelacion && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{consulta.motivo_cancelacion}</p>}
        </div>
      )}

      {!editando ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>Datos del cliente</p>
            <Campo label="Nombre" value={consulta.nombre} />
            <Campo label="Celular" value={consulta.celular} />
            <Campo label="Domicilio" value={consulta.domicilio} />
            <Campo label="Municipio" value={consulta.municipio} />
            <Campo label="Trámite" value={consulta.tramite} />
            {consulta.prioridad && <Campo label="Tipo" value={consulta.prioridad} />}
            {consulta.como_conocio && <Campo label="Cómo nos conoció" value={consulta.como_conocio} />}
            {consulta.firma && <Campo label="Firma" value={consulta.firma} />}
            {consulta.observaciones && <Campo label="Observaciones" value={consulta.observaciones} />}
          </div>

          {consulta.archivos && consulta.archivos.length > 0 && (
            <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>📎 Archivos adjuntos</p>
              <div style={{ display: 'grid', gap: 6 }}>
                {consulta.archivos.map((url: string, i: number) => {
                  const nombre = url.split('/').pop() || `Archivo ${i + 1}`
                  return (
                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 10px',
                      color: TEAL, fontSize: 12, textDecoration: 'none'
                    }}>📄 {nombre}</a>
                  )
                })}
              </div>
            </div>
          )}

          {consulta.obs_presupuesto && (
            <div style={{ background: 'rgba(45,212,176,0.08)', borderRadius: 14, border: '1.5px solid rgba(45,212,176,0.2)', padding: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(45,212,176,0.7)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>Info técnica</p>
              {consulta.ajusta_cou && <Campo label="Ajusta a COU" value={consulta.ajusta_cou} />}
              {consulta.derechos_estimados > 0 && <Campo label="Derechos estimados" value={`USD ${consulta.derechos_estimados}`} />}
              {consulta.aportes_estimados > 0 && <Campo label="Aportes estimados" value={`USD ${consulta.aportes_estimados}`} />}
              <Campo label="Obs. para presupuesto" value={consulta.obs_presupuesto} />
            </div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {!cancelada && consulta.estado === 'validado' && (
              <button onClick={() => router.push(`/presupuestos/nuevo?consulta=${id}`)} style={{
                padding: 12, fontSize: 14, fontWeight: 600,
                background: TEAL, color: '#1a2332', border: 'none', borderRadius: 14
              }}>Generar presupuesto →</button>
            )}
            {!cancelada && (
              <button onClick={() => setShowCancelar(true)} style={{
                padding: 10, fontSize: 13,
                background: 'transparent', border: '1.5px solid rgba(248,113,113,0.3)',
                color: '#f87171', borderRadius: 14
              }}>Cancelar consulta</button>
            )}
            <button onClick={() => setShowBorrar(true)} style={{
              padding: 10, fontSize: 13,
              background: 'transparent', border: '1.5px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)', borderRadius: 14
            }}>Borrar definitivamente</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Nombre</label>
                <input value={form.nombre || ''} onChange={e => set('nombre', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Celular</label>
                <input value={form.celular || ''} onChange={e => set('celular', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Domicilio</label>
              <input value={form.domicilio || ''} onChange={e => set('domicilio', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Municipio</label>
                <select value={form.municipio || ''} onChange={e => set('municipio', e.target.value)}>
                  {MUNICIPIOS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Trámite</label>
                <select value={form.tramite || ''} onChange={e => set('tramite', e.target.value)}>
                  {TRAMITES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Observaciones</label>
              <textarea value={form.observaciones || ''} onChange={e => set('observaciones', e.target.value)} style={{ minHeight: 64 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setEditando(false)} style={{
              padding: 10, fontSize: 14, color: 'rgba(255,255,255,0.5)',
              background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 10
            }}>Cancelar</button>
            <button onClick={guardarEdicion} disabled={saving} style={{
              padding: 10, fontSize: 14, fontWeight: 600,
              background: TEAL, color: '#1a2332', border: 'none', borderRadius: 10
            }}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      )}

      {/* MODAL CANCELAR */}
      {showCancelar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
          <div style={{ background: '#1a2332', borderRadius: 18, padding: 24, width: '100%', maxWidth: 360, border: `1.5px solid ${BORDER}` }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>Cancelar consulta</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 14px' }}>La consulta queda registrada como cancelada.</p>
            <textarea value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)}
              placeholder="Ej: el cliente desistió, fuera de zona, etc."
              style={{ minHeight: 72, marginBottom: 14 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setShowCancelar(false)} style={{ padding: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 10 }}>Volver</button>
              <button onClick={cancelarConsulta} disabled={!motivoCancelacion || saving} style={{ padding: 10, fontSize: 13, fontWeight: 600, background: '#f87171', color: '#fff', border: 'none', borderRadius: 10, opacity: !motivoCancelacion ? 0.5 : 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BORRAR */}
      {showBorrar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
          <div style={{ background: '#1a2332', borderRadius: 18, padding: 24, width: '100%', maxWidth: 360, border: `1.5px solid ${BORDER}` }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>Borrar consulta</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px' }}>Esto borra la consulta definitivamente. No se puede deshacer.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setShowBorrar(false)} style={{ padding: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 10 }}>Volver</button>
              <button onClick={borrarConsulta} disabled={saving} style={{ padding: 10, fontSize: 13, fontWeight: 600, background: '#f87171', color: '#fff', border: 'none', borderRadius: 10 }}>Borrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Campo({ label, value }: { label: string, value: string }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}
