import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

const MUNICIPIO_LINKS: Record<string, { derechos: string | null, aportes: string, tramites: string | null }> = {
  'San Isidro': {
    derechos: 'https://liquidacionesobras.gestionmsi.gob.ar/',
    aportes: 'https://share.google/970c90T5hTtlQlx3d',
    tramites: 'https://www.sanisidro.gob.ar/tramites'
  },
  'Vicente López': {
    derechos: null,
    aportes: 'https://share.google/970c90T5hTtlQlx3d',
    tramites: 'https://tramitesvl.vicentelopez.gov.ar/'
  },
  'Tigre': { derechos: null, aportes: 'https://share.google/970c90T5hTtlQlx3d', tramites: null },
  'San Fernando': { derechos: null, aportes: 'https://share.google/970c90T5hTtlQlx3d', tramites: null },
}

type Consulta = {
  id: string
  nombre: string
  celular: string
  domicilio: string
  municipio: string
  tramite: string
  prioridad: string
  firma: string
  observaciones: string
  created_at: string
  estado: string
  ajusta_cou: string
  cou_observaciones: string
  consulta_previa: boolean
  visita_previa: boolean
  visita_dias: string
  derechos_estimados: number
  derechos_m2: number
  aportes_estimados: number
  aportes_m2: number
  obs_presupuesto: string
  info_faltante: string
  archivos: string[]
}

export default function ValidarDetalle() {
  const router = useRouter()
  const { id } = router.query
  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [form, setForm] = useState({
    ajusta_cou: '',
    cou_observaciones: '',
    consulta_previa: '',
    visita_previa: '',
    visita_dias: '',
    derechos_estimados: '',
    derechos_m2: '',
    aportes_estimados: '',
    aportes_m2: '',
    obs_presupuesto: '',
    info_faltante: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (id) loadConsulta()
  }, [id])

  async function loadConsulta() {
    const { data } = await supabase.from('consultas').select('*').eq('id', id).single()
    if (data) {
      setConsulta(data)
      setForm({
        ajusta_cou: data.ajusta_cou || '',
        cou_observaciones: data.cou_observaciones || '',
        consulta_previa: data.consulta_previa === true ? 'si' : data.consulta_previa === false ? 'no' : '',
        visita_previa: data.visita_previa === true ? 'si' : data.visita_previa === false ? 'no' : '',
        visita_dias: data.visita_dias || '',
        derechos_estimados: data.derechos_estimados?.toString() || '',
        derechos_m2: data.derechos_m2?.toString() || '',
        aportes_estimados: data.aportes_estimados?.toString() || '',
        aportes_m2: data.aportes_m2?.toString() || '',
        obs_presupuesto: data.obs_presupuesto || '',
        info_faltante: data.info_faltante || ''
      })
    }
  }

  async function guardar() {
    setSaving(true)
    const { error } = await supabase.from('consultas').update({
      ajusta_cou: form.ajusta_cou,
      cou_observaciones: form.cou_observaciones,
      consulta_previa: form.consulta_previa === 'si',
      visita_previa: form.visita_previa === 'si',
      visita_dias: form.visita_dias,
      derechos_estimados: parseFloat(form.derechos_estimados) || null,
      derechos_m2: parseFloat(form.derechos_m2) || null,
      aportes_estimados: parseFloat(form.aportes_estimados) || null,
      aportes_m2: parseFloat(form.aportes_m2) || null,
      obs_presupuesto: form.obs_presupuesto,
      info_faltante: form.info_faltante,
      estado: form.info_faltante ? 'pendiente_info' : 'validado'
    }).eq('id', id)
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => router.push('/validar'), 1500) }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const Btn = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button onClick={onClick} style={{
      flex: 1, fontSize: 13, padding: '8px', borderRadius: 10,
      border: `1.5px solid ${active ? 'rgba(45,212,176,0.4)' : BORDER}`,
      background: active ? 'rgba(45,212,176,0.15)' : '#1a2332',
      color: active ? TEAL : 'rgba(255,255,255,0.6)', cursor: 'pointer'
    }}>{label}</button>
  )

  const links = consulta ? MUNICIPIO_LINKS[consulta.municipio] : null

  if (!consulta) return (
    <div style={{ background: '#1a2332', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
      Cargando...
    </div>
  )

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/validar')} style={{
          width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{consulta.nombre}</p>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Validar p/presupuesto</p>
        </div>
        {saved && <span style={{ fontSize: 12, color: TEAL }}>✓ Guardado</span>}
      </div>

      {/* MUNICIPIO */}
      <div style={{ background: 'rgba(45,212,176,0.1)', borderRadius: 14, border: '1.5px solid rgba(45,212,176,0.35)', padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>Municipio</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: TEAL, margin: 0 }}>{consulta.municipio}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>Trámite</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>{consulta.tramite}</p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(45,212,176,0.2)', paddingTop: 10, display: 'flex', gap: 8 }}>
          {links?.derechos ? (
            <a href={links.derechos} target="_blank" rel="noreferrer" style={{
              flex: 1, fontSize: 12, padding: '8px 6px', borderRadius: 10, textAlign: 'center',
              border: '1.5px solid rgba(45,212,176,0.3)', background: 'rgba(45,212,176,0.08)', color: TEAL
            }}>🧮 Derechos</a>
          ) : (
            <div style={{ flex: 1, fontSize: 11, padding: '8px 6px', borderRadius: 10, textAlign: 'center', border: '1.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.25)' }}>Sin calculadora</div>
          )}
          <a href={links?.aportes || '#'} target="_blank" rel="noreferrer" style={{
            flex: 1, fontSize: 12, padding: '8px 6px', borderRadius: 10, textAlign: 'center',
            border: '1.5px solid rgba(45,212,176,0.3)', background: 'rgba(45,212,176,0.08)', color: TEAL
          }}>🧮 Aportes SIGMA</a>
          {links?.tramites && (
            <a href={links.tramites} target="_blank" rel="noreferrer" style={{
              flex: 1, fontSize: 12, padding: '8px 6px', borderRadius: 10, textAlign: 'center',
              border: '1.5px solid rgba(45,212,176,0.3)', background: 'rgba(45,212,176,0.08)', color: TEAL
            }}>🔗 Trámites</a>
          )}
        </div>
      </div>

      {/* DATOS */}
      <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>Datos de la consulta</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, fontSize: 12 }}>
          <div><p style={{ color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>Domicilio</p><p style={{ color: '#fff', fontWeight: 500, margin: 0 }}>{consulta.domicilio}</p></div>
          <div><p style={{ color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>Firma</p><p style={{ color: '#fff', fontWeight: 500, margin: 0 }}>{consulta.firma || '—'}</p></div>
          <div><p style={{ color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>Prioridad</p><p style={{ color: TEAL, fontWeight: 600, margin: 0 }}>{consulta.prioridad || '—'}</p></div>
          <div><p style={{ color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>Celular</p><p style={{ color: '#fff', fontWeight: 500, margin: 0 }}>{consulta.celular}</p></div>
        </div>
        {consulta.observaciones && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>Observaciones</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{consulta.observaciones}</p>
          </div>
        )}
      </div>
{consulta.archivos && consulta.archivos.length > 0 && (
  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 8px' }}>📎 Archivos adjuntos</p>
    <div style={{ display: 'grid', gap: 6 }}>
      {consulta.archivos.map((url: string, i: number) => {
        const nombre = url.split('/').pop() || `Archivo ${i+1}`
        return (
          <a key={i} href={url} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 10px',
            color: TEAL, fontSize: 12, textDecoration: 'none'
          }}>
            📄 {nombre}
          </a>
        )
      })}
    </div>
  </div>
)}
      {/* VALIDACION */}
      <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>Validación</p>
        <div style={{ display: 'grid', gap: 12 }}>

          <div>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>¿Se ajusta al COU?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn label="Sí" active={form.ajusta_cou === 'si'} onClick={() => set('ajusta_cou', 'si')} />
              <Btn label="No" active={form.ajusta_cou === 'no'} onClick={() => set('ajusta_cou', 'no')} />
              <Btn label="Con obs." active={form.ajusta_cou === 'obs'} onClick={() => set('ajusta_cou', 'obs')} />
            </div>
            {(form.ajusta_cou === 'no' || form.ajusta_cou === 'obs') && (
              <textarea value={form.cou_observaciones} onChange={e => set('cou_observaciones', e.target.value)}
                placeholder="Describí las observaciones..." style={{ marginTop: 8, minHeight: 60, resize: 'vertical', width: '100%', fontSize: 12, padding: 8, border: `1.5px solid ${BORDER}`, borderRadius: 10, background: '#1a2332', color: '#fff' }} />
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>¿Consulta previa?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn label="Sí" active={form.consulta_previa === 'si'} onClick={() => set('consulta_previa', 'si')} />
              <Btn label="No" active={form.consulta_previa === 'no'} onClick={() => set('consulta_previa', 'no')} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>¿Visita previa?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn label="Sí" active={form.visita_previa === 'si'} onClick={() => set('visita_previa', 'si')} />
              <Btn label="No" active={form.visita_previa === 'no'} onClick={() => set('visita_previa', 'no')} />
            </div>
            {form.visita_previa === 'si' && (
              <textarea value={form.visita_dias} onChange={e => set('visita_dias', e.target.value)}
                placeholder="Días disponibles para la visita..." style={{ marginTop: 8, minHeight: 48, resize: 'vertical', width: '100%', fontSize: 12, padding: 8, border: `1.5px solid ${BORDER}`, borderRadius: 10, background: '#1a2332', color: '#fff' }} />
            )}
          </div>

        </div>
      </div>

      {/* GASTOS */}
      <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>Gastos estimados</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
          <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Derechos</label>
            <input type="number" value={form.derechos_estimados} onChange={e => set('derechos_estimados', e.target.value)} placeholder="USD" /></div>
          <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>M² derechos</label>
            <input type="number" value={form.derechos_m2} onChange={e => set('derechos_m2', e.target.value)} placeholder="m²" /></div>
          <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Aportes</label>
            <input type="number" value={form.aportes_estimados} onChange={e => set('aportes_estimados', e.target.value)} placeholder="USD" /></div>
          <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>M² aportes</label>
            <input type="number" value={form.aportes_m2} onChange={e => set('aportes_m2', e.target.value)} placeholder="m²" /></div>
        </div>
      </div>

      {/* OBS PRESUPUESTO */}
      <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Observaciones para el presupuesto</label>
        <textarea value={form.obs_presupuesto} onChange={e => set('obs_presupuesto', e.target.value)}
          placeholder="Ej: lleva agrimensor, retiro de fondo, lote irregular..."
          style={{ minHeight: 64, resize: 'vertical', width: '100%', fontSize: 12, padding: 8, border: `1.5px solid ${BORDER}`, borderRadius: 10, background: '#1a2332', color: '#fff' }} />
      </div>

      {/* FALTA INFO */}
      <div style={{ background: 'rgba(248,113,113,0.08)', borderRadius: 14, border: '1.5px solid rgba(248,113,113,0.25)', padding: 14, marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#f87171', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          ⚠ ¿Falta info? Pedir al área comercial
        </label>
        <textarea value={form.info_faltante} onChange={e => set('info_faltante', e.target.value)}
          placeholder="Ej: falta plano antecedente, necesito superficie total..."
          style={{ minHeight: 48, resize: 'vertical', width: '100%', fontSize: 12, padding: 8, border: '1.5px solid rgba(248,113,113,0.2)', borderRadius: 10, background: '#1a2332', color: '#fff' }} />
      </div>

      <button onClick={guardar} disabled={saving} style={{
        width: '100%', padding: 14, fontSize: 14, fontWeight: 600,
        background: TEAL, color: '#1a2332', border: 'none', borderRadius: 14,
        opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer'
      }}>
        {saving ? 'Guardando...' : 'Enviar al área comercial ↗'}
      </button>

    </div>
  )
}
