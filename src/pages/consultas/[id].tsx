import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'
const FER_PHONE = '5491144379907'

const MUNICIPIOS = ['San Isidro', 'Vicente López', 'Tigre', 'San Fernando']
const TRAMITES = ['Permiso de construcción', 'Demolición total', 'Conforme a obra', 'Regularización', 'Consulta previa', 'Estudio de factibilidad']

const ESTADOS: Record<string, { label: string, color: string, bg: string }> = {
  pendiente: { label: 'Pendiente', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  pdte_enviar: { label: 'Pdte de enviar', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  enviado: { label: 'Enviado', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  aceptado: { label: 'Aceptado ✓', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  rechazado: { label: 'Rechazado', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  cancelado: { label: 'Cancelado', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)' },
}

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
  const [showRechazar, setShowRechazar] = useState(false)
  const [showBorrar, setShowBorrar] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [formVal, setFormVal] = useState({
    ajusta_cou: '', obs_presupuesto: '',
    derechos_estimados: '', aportes_estimados: '', info_faltante: ''
  })
  const [modoValidar, setModoValidar] = useState(false)

  useEffect(() => { if (id) loadConsulta() }, [id])

  async function loadConsulta() {
    const { data } = await supabase.from('consultas').select('*').eq('id', id).single()
    if (data) {
      setConsulta(data)
      setForm(data)
      setFormVal({
        ajusta_cou: data.ajusta_cou || '',
        obs_presupuesto: data.obs_presupuesto || '',
        derechos_estimados: data.derechos_estimados || '',
        aportes_estimados: data.aportes_estimados || '',
        info_faltante: data.info_faltante || ''
      })
    }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const setVal = (k: string, v: string) => setFormVal(f => ({ ...f, [k]: v }))

  async function guardarEdicion() {
    setSaving(true)
    await supabase.from('consultas').update({
      nombre: form.nombre, celular: form.celular,
      domicilio: form.domicilio, municipio: form.municipio,
      tramite: form.tramite, prioridad: form.prioridad,
      como_conocio: form.como_conocio, observaciones: form.observaciones,
    }).eq('id', id)
    setSaving(false)
    setEditando(false)
    loadConsulta()
  }

  async function validarYPasar() {
    setSaving(true)
    await supabase.from('consultas').update({
      estado: 'pdte_enviar',
      ajusta_cou: formVal.ajusta_cou,
      obs_presupuesto: formVal.obs_presupuesto,
      derechos_estimados: parseFloat(formVal.derechos_estimados) || 0,
      aportes_estimados: parseFloat(formVal.aportes_estimados) || 0,
      info_faltante: ''
    }).eq('id', id)
    setSaving(false)
    setModoValidar(false)
    loadConsulta()
  }

  async function devolverConInfo() {
    if (!formVal.info_faltante) return
    setSaving(true)
    await supabase.from('consultas').update({
      estado: 'pendiente',
      info_faltante: formVal.info_faltante
    }).eq('id', id)
    setSaving(false)
    setModoValidar(false)
    loadConsulta()
  }

  async function marcarEnviado() {
    setSaving(true)
    await supabase.from('consultas').update({ estado: 'enviado' }).eq('id', id)
    setSaving(false)
    loadConsulta()
  }

  async function marcarAceptado() {
    setSaving(true)
    await supabase.from('consultas').update({ estado: 'aceptado' }).eq('id', id)
    if (consulta) {
      await supabase.from('tramites').insert({
        numero_p: consulta.numero_p,
        nombre: consulta.nombre,
        celular: consulta.celular,
        domicilio: consulta.domicilio,
        municipio: consulta.municipio,
        tramite: consulta.tramite,
        estado_actual: 'en_dibujo',
        pelota: 'admin',
        ultima_nota: 'Trámite iniciado — presupuesto aceptado',
        ultima_accion_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
    }
    setSaving(false)
    loadConsulta()
    alert('¡Aceptado! Se creó el trámite en curso.')
  }

  async function rechazar() {
    if (!motivoRechazo) return
    setSaving(true)
    await supabase.from('consultas').update({ estado: 'rechazado', motivo_cancelacion: motivoRechazo }).eq('id', id)
    setSaving(false)
    setShowRechazar(false)
    loadConsulta()
  }

  async function cancelar() {
    if (!motivoCancelacion) return
    setSaving(true)
    await supabase.from('consultas').update({ estado: 'cancelado', motivo_cancelacion: motivoCancelacion }).eq('id', id)
    setSaving(false)
    setShowCancelar(false)
    loadConsulta()
  }

  async function borrar() {
    setSaving(true)
    await supabase.from('consultas').delete().eq('id', id)
    setSaving(false)
    router.push('/consultas')
  }

  function notificarTecnica() {
    if (!consulta) return
    const msg = `Hola Fer! Nueva consulta para validar 👇\n*${consulta.numero_p} — ${consulta.nombre}*\n${consulta.tramite} · ${consulta.municipio}\n${consulta.domicilio ? consulta.domicilio + '\n' : ''}${consulta.observaciones ? 'Obs: ' + consulta.observaciones + '\n' : ''}\nVer acá: https://tekton-app-nuevo.vercel.app/consultas/${id}`
    window.open(`https://wa.me/${FER_PHONE}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (!consulta) return <div style={{ background: '#1a2332', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>Cargando...</div>

  const est = ESTADOS[consulta.estado] || ESTADOS.pendiente

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/consultas')} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{consulta.numero_p}</span>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{consulta.nombre}</p>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{consulta.municipio} · {consulta.tramite}</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, background: est.bg, color: est.color, padding: '3px 10px', borderRadius: 20 }}>{est.label}</span>
      </div>

      {consulta.info_faltante && consulta.estado === 'pendiente' && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1.5px solid rgba(248,113,113,0.3)', borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#f87171', margin: '0 0 4px' }}>⚠ Técnica devolvió con observación</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{consulta.info_faltante}</p>
        </div>
      )}

      {!editando ? (
        <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
          <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Datos del cliente</p>
              {consulta.estado !== 'cancelado' && <button onClick={() => setEditando(true)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${BORDER}`, background: 'transparent', color: 'rgba(255,255,255,0.4)' }}>Editar</button>}
            </div>
            <Campo label="Nombre" value={consulta.nombre} />
            <Campo label="Celular" value={consulta.celular} />
            <Campo label="Domicilio" value={consulta.domicilio} />
            <Campo label="Municipio" value={consulta.municipio} />
            <Campo label="Trámite" value={consulta.tramite} />
            {consulta.prioridad && <Campo label="Tipo" value={consulta.prioridad} />}
            {consulta.como_conocio && <Campo label="Cómo nos conoció" value={consulta.como_conocio} />}
            {consulta.observaciones && <Campo label="Observaciones" value={consulta.observaciones} />}
          </div>

          {consulta.archivos && consulta.archivos.length > 0 && (
            <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>📎 Archivos adjuntos</p>
              <div style={{ display: 'grid', gap: 6 }}>
                {consulta.archivos.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 10px', color: TEAL, fontSize: 12, textDecoration: 'none' }}>
                    📄 {url.split('/').pop() || `Archivo ${i + 1}`}
                  </a>
                ))}
              </div>
            </div>
          )}

          {consulta.obs_presupuesto && (
            <div style={{ background: 'rgba(45,212,176,0.08)', borderRadius: 14, border: '1.5px solid rgba(45,212,176,0.2)', padding: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(45,212,176,0.7)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>Info técnica (Fer)</p>
              {consulta.ajusta_cou && <Campo label="Ajusta a COU" value={consulta.ajusta_cou} />}
              {consulta.derechos_estimados > 0 && <Campo label="Derechos est." value={`USD ${consulta.derechos_estimados}`} />}
              {consulta.aportes_estimados > 0 && <Campo label="Aportes est." value={`USD ${consulta.aportes_estimados}`} />}
              <Campo label="Obs. para presupuesto" value={consulta.obs_presupuesto} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
          <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Nombre</label><input value={form.nombre || ''} onChange={e => set('nombre', e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Celular</label><input value={form.celular || ''} onChange={e => set('celular', e.target.value)} /></div>
            </div>
            <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Domicilio</label><input value={form.domicilio || ''} onChange={e => set('domicilio', e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Municipio</label><select value={form.municipio || ''} onChange={e => set('municipio', e.target.value)}>{MUNICIPIOS.map(m => <option key={m}>{m}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Trámite</label><select value={form.tramite || ''} onChange={e => set('tramite', e.target.value)}>{TRAMITES.map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Observaciones</label><textarea value={form.observaciones || ''} onChange={e => set('observaciones', e.target.value)} style={{ minHeight: 64 }} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setEditando(false)} style={{ padding: 10, fontSize: 14, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 10 }}>Cancelar</button>
            <button onClick={guardarEdicion} disabled={saving} style={{ padding: 10, fontSize: 14, fontWeight: 600, background: TEAL, color: '#1a2332', border: 'none', borderRadius: 10 }}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      )}

      {modoValidar && (
        <div style={{ background: DARK2, borderRadius: 14, border: '1.5px solid rgba(45,212,176,0.3)', padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: TEAL, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>Validación técnica</p>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>¿Ajusta al COU?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Sí', 'No', 'Con observaciones'].map(op => (
                  <button key={op} onClick={() => setVal('ajusta_cou', op)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 20, border: `1.5px solid ${formVal.ajusta_cou === op ? 'rgba(45,212,176,0.4)' : BORDER}`, background: formVal.ajusta_cou === op ? 'rgba(45,212,176,0.15)' : 'transparent', color: formVal.ajusta_cou === op ? TEAL : 'rgba(255,255,255,0.5)' }}>{op}</button>
                ))}
              </div>
            </div>
            <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Derechos estimados (USD)</label><input type="number" value={formVal.derechos_estimados} onChange={e => setVal('derechos_estimados', e.target.value)} placeholder="Ej: 500" /></div>
            <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Aportes estimados (USD)</label><input type="number" value={formVal.aportes_estimados} onChange={e => setVal('aportes_estimados', e.target.value)} placeholder="Ej: 300" /></div>
            <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Observaciones para el presupuesto</label><textarea value={formVal.obs_presupuesto} onChange={e => setVal('obs_presupuesto', e.target.value)} placeholder="Info relevante para armar el presupuesto..." style={{ minHeight: 64 }} /></div>
            <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Falta info (para devolver a comercial)</label><textarea value={formVal.info_faltante} onChange={e => setVal('info_faltante', e.target.value)} placeholder="Ej: falta plano antecedente..." style={{ minHeight: 48 }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <button onClick={() => setModoValidar(false)} style={{ padding: 10, fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 10 }}>Cancelar</button>
              <button onClick={devolverConInfo} disabled={!formVal.info_faltante || saving} style={{ padding: 10, fontSize: 12, fontWeight: 600, background: 'rgba(248,113,113,0.2)', color: '#f87171', border: '1.5px solid rgba(248,113,113,0.3)', borderRadius: 10, opacity: !formVal.info_faltante ? 0.5 : 1 }}>Devolver</button>
              <button onClick={validarYPasar} disabled={saving} style={{ padding: 10, fontSize: 12, fontWeight: 600, background: TEAL, color: '#1a2332', border: 'none', borderRadius: 10 }}>{saving ? '...' : 'Validar ✓'}</button>
            </div>
          </div>
        </div>
      )}

      {!editando && !modoValidar && (
        <div style={{ display: 'grid', gap: 8 }}>
          {consulta.estado === 'pendiente' && (
            <button onClick={notificarTecnica} style={{ padding: 12, fontSize: 14, fontWeight: 600, background: 'rgba(37,211,102,0.15)', color: '#25d366', border: '1.5px solid rgba(37,211,102,0.3)', borderRadius: 14 }}>
              📲 Notificar a Técnica
            </button>
          )}
          {consulta.estado === 'pendiente' && (
            <button onClick={() => setModoValidar(true)} style={{ padding: 12, fontSize: 14, fontWeight: 600, background: 'rgba(45,212,176,0.12)', color: TEAL, border: `1.5px solid rgba(45,212,176,0.3)`, borderRadius: 14 }}>
              🔍 Validar (área técnica)
            </button>
          )}
          {consulta.estado === 'pdte_enviar' && (
            <button onClick={() => router.push(`/presupuestos/nuevo?consulta=${id}`)} style={{ padding: 12, fontSize: 14, fontWeight: 600, background: TEAL, color: '#1a2332', border: 'none', borderRadius: 14 }}>
              Generar presupuesto →
            </button>
          )}
          {consulta.estado === 'pdte_enviar' && (
            <button onClick={marcarEnviado} disabled={saving} style={{ padding: 12, fontSize: 14, fontWeight: 600, background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1.5px solid rgba(96,165,250,0.3)', borderRadius: 14 }}>
              ↗ Marcar como enviado al cliente
            </button>
          )}
          {consulta.estado === 'enviado' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={marcarAceptado} disabled={saving} style={{ padding: 12, fontSize: 14, fontWeight: 600, background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1.5px solid rgba(74,222,128,0.3)', borderRadius: 14 }}>✓ Aceptado</button>
              <button onClick={() => setShowRechazar(true)} style={{ padding: 12, fontSize: 14, fontWeight: 600, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1.5px solid rgba(248,113,113,0.3)', borderRadius: 14 }}>✗ Rechazado</button>
            </div>
          )}
          {consulta.estado !== 'cancelado' && consulta.estado !== 'aceptado' && (
            <button onClick={() => setShowCancelar(true)} style={{ padding: 10, fontSize: 13, background: 'transparent', border: '1.5px solid rgba(248,113,113,0.2)', color: '#f87171', borderRadius: 14 }}>Cancelar consulta</button>
          )}
          <button onClick={() => setShowBorrar(true)} style={{ padding: 10, fontSize: 13, background: 'transparent', border: `1.5px solid ${BORDER}`, color: 'rgba(255,255,255,0.25)', borderRadius: 14 }}>Borrar definitivamente</button>
        </div>
      )}

      {showRechazar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
          <div style={{ background: '#1a2332', borderRadius: 18, padding: 24, width: '100%', maxWidth: 360, border: `1.5px solid ${BORDER}` }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>¿Por qué rechazó?</p>
            <textarea value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} placeholder="Ej: precio alto, eligió otro estudio..." style={{ minHeight: 72, marginBottom: 14 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setShowRechazar(false)} style={{ padding: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 10 }}>Volver</button>
              <button onClick={rechazar} disabled={!motivoRechazo || saving} style={{ padding: 10, fontSize: 13, fontWeight: 600, background: '#f87171', color: '#fff', border: 'none', borderRadius: 10, opacity: !motivoRechazo ? 0.5 : 1 }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {showCancelar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
          <div style={{ background: '#1a2332', borderRadius: 18, padding: 24, width: '100%', maxWidth: 360, border: `1.5px solid ${BORDER}` }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>Cancelar consulta</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 14px' }}>Queda registrada como cancelada.</p>
            <textarea value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)} placeholder="Motivo..." style={{ minHeight: 64, marginBottom: 14 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setShowCancelar(false)} style={{ padding: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 10 }}>Volver</button>
              <button onClick={cancelar} disabled={!motivoCancelacion || saving} style={{ padding: 10, fontSize: 13, fontWeight: 600, background: '#f87171', color: '#fff', border: 'none', borderRadius: 10, opacity: !motivoCancelacion ? 0.5 : 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showBorrar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
          <div style={{ background: '#1a2332', borderRadius: 18, padding: 24, width: '100%', maxWidth: 360, border: `1.5px solid ${BORDER}` }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>Borrar definitivamente</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px' }}>No se puede deshacer.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setShowBorrar(false)} style={{ padding: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 10 }}>Volver</button>
              <button onClick={borrar} disabled={saving} style={{ padding: 10, fontSize: 13, fontWeight: 600, background: '#f87171', color: '#fff', border: 'none', borderRadius: 10 }}>Borrar</button>
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
