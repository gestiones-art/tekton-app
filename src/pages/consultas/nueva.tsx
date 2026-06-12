import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

const MUNICIPIOS = ['San Isidro', 'Vicente López', 'Tigre', 'San Fernando']
const TRAMITES = ['Permiso de construcción', 'Demolición total', 'Conforme a obra', 'Regularización', 'Consulta previa', 'Estudio de factibilidad']
const COMO_CONOCIO = ['Recomendación', 'Google', 'Instagram', 'Web', 'Ya es cliente', 'Otro']

export default function NuevaConsulta() {
  const router = useRouter()
  const [form, setForm] = useState({
    nombre: '', celular: '', domicilio: '', municipio: '', municipio_nuevo: '',
    tramite: '', tramite_nuevo: '', prioridad: '', firma: '',
    firmante_nombre: '', firmante_apellido: '', firmante_direccion: '',
    firmante_mat_provincial: '', firmante_mat_municipal: '',
    escritura: '', sociedad: '', como_conocio: '', observaciones: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function guardar() {
    if (!form.nombre || !form.celular || !form.domicilio || !form.municipio || !form.tramite) {
      setError('Completá los campos obligatorios')
      return
    }
    setSaving(true)
    const municipio = form.municipio === 'nuevo' ? form.municipio_nuevo : form.municipio
    const tramite = form.tramite === 'nuevo' ? form.tramite_nuevo : form.tramite
    const { error: err } = await supabase.from('consultas').insert({
      nombre: form.nombre,
      celular: form.celular,
      domicilio: form.domicilio,
      municipio,
      tramite,
      prioridad: form.prioridad,
      firma: form.firma,
      firmante_nombre: form.firmante_nombre,
      firmante_apellido: form.firmante_apellido,
      firmante_mat_provincial: form.firmante_mat_provincial,
      firmante_mat_municipal: form.firmante_mat_municipal,
      escritura: form.escritura,
      sociedad: form.sociedad,
      como_conocio: form.como_conocio,
      observaciones: form.observaciones,
      estado: 'pendiente_validacion',
      created_at: new Date().toISOString()
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    router.push('/')
  }

  const Btn = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button onClick={onClick} style={{
      fontSize: 12, padding: '6px 12px', borderRadius: 20,
      border: `1.5px solid ${active ? 'rgba(45,212,176,0.4)' : BORDER}`,
      background: active ? 'rgba(45,212,176,0.15)' : 'transparent',
      color: active ? TEAL : 'rgba(255,255,255,0.5)'
    }}>{label}</button>
  )

  const Label = ({ text, required }: { text: string, required?: boolean }) => (
    <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>
      {text}{required && <span style={{ color: TEAL }}> *</span>}
    </label>
  )

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/')} style={{
          width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
        }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Nueva consulta</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Estudio Tekton</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><Label text="Nombre" required /><input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre completo" /></div>
          <div><Label text="Celular" required /><input value={form.celular} onChange={e => set('celular', e.target.value)} placeholder="+54 9 11..." /></div>
        </div>

        <div><Label text="Domicilio de obra" required /><input value={form.domicilio} onChange={e => set('domicilio', e.target.value)} placeholder="Calle, número, localidad" /></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <Label text="Municipio" required />
            <select value={form.municipio} onChange={e => set('municipio', e.target.value)}>
              <option value="">Seleccionar...</option>
              {MUNICIPIOS.map(m => <option key={m}>{m}</option>)}
              <option value="nuevo">+ Agregar nuevo</option>
            </select>
          </div>
          <div>
            <Label text="Tipo de trámite" required />
            <select value={form.tramite} onChange={e => set('tramite', e.target.value)}>
              <option value="">Seleccionar...</option>
              {TRAMITES.map(t => <option key={t}>{t}</option>)}
              <option value="nuevo">+ Agregar nuevo</option>
            </select>
          </div>
        </div>

        {form.municipio === 'nuevo' && (
          <div><Label text="Nuevo municipio" /><input value={form.municipio_nuevo} onChange={e => set('municipio_nuevo', e.target.value)} placeholder="Nombre del municipio" /></div>
        )}
        {form.tramite === 'nuevo' && (
          <div><Label text="Nuevo tipo de trámite" /><input value={form.tramite_nuevo} onChange={e => set('tramite_nuevo', e.target.value)} placeholder="Describir trámite" /></div>
        )}

        <div>
          <Label text="Prioridad" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Arquitecto', 'Demolición', 'Permiso', 'Propietario', 'Regularización'].map(p => (
              <Btn key={p} label={p} active={form.prioridad === p} onClick={() => set('prioridad', p)} />
            ))}
          </div>
        </div>

        <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 500, margin: '0 0 10px' }}>Firma profesional</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Tekton', 'Del cliente', 'Sin firma'].map(f => (
              <Btn key={f} label={f} active={form.firma === f} onClick={() => set('firma', f)} />
            ))}
          </div>

          {(form.firma === 'Tekton' || form.firma === 'Del cliente') && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px' }}>
                {form.firma === 'Tekton' ? 'Datos del firmante Tekton' : 'Datos del profesional del cliente'}
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><Label text="Nombre" /><input value={form.firmante_nombre} onChange={e => set('firmante_nombre', e.target.value)} placeholder="Nombre" /></div>
                  <div><Label text="Apellido" /><input value={form.firmante_apellido} onChange={e => set('firmante_apellido', e.target.value)} placeholder="Apellido" /></div>
                </div>
                <div><Label text="Dirección" /><input value={form.firmante_direccion} onChange={e => set('firmante_direccion', e.target.value)} placeholder="Dirección profesional" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><Label text="Mat. provincial" /><input value={form.firmante_mat_provincial} onChange={e => set('firmante_mat_provincial', e.target.value)} placeholder="Nº matrícula" /></div>
                  <div><Label text="Mat. municipal" /><input value={form.firmante_mat_municipal} onChange={e => set('firmante_mat_municipal', e.target.value)} placeholder="Nº matrícula" /></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <Label text="¿Tiene escritura?" />
            <select value={form.escritura} onChange={e => set('escritura', e.target.value)}>
              <option value="">No indica</option>
              <option>Sí</option>
              <option>No</option>
            </select>
          </div>
          <div>
            <Label text="¿Sociedad?" />
            <select value={form.sociedad} onChange={e => set('sociedad', e.target.value)}>
              <option value="">No indica</option>
              <option>Sí</option>
              <option>No</option>
            </select>
          </div>
        </div>

        <div>
          <Label text="¿Cómo nos conoció?" />
          <select value={form.como_conocio} onChange={e => set('como_conocio', e.target.value)}>
            <option value="">Seleccionar...</option>
            {COMO_CONOCIO.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <Label text="Observaciones" />
          <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Notas adicionales..." style={{ minHeight: 64, resize: 'vertical' }} />
        </div>

        {error && <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center' }}>{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={() => router.push('/')} style={{
            padding: 10, fontSize: 14, color: 'rgba(255,255,255,0.5)',
            background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 10
          }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{
            padding: 10, fontSize: 14, fontWeight: 600,
            background: TEAL, color: '#1a2332', border: 'none', borderRadius: 10,
            opacity: saving ? 0.7 : 1
          }}>{saving ? 'Guardando...' : 'Guardar ↗'}</button>
        </div>

      </div>
    </div>
  )
}
