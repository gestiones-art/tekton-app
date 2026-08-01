import { useState, useRef } from 'react'
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
    como_conocio: '', observaciones: ''
  })
  const [archivos, setArchivos] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // GRABACIÓN
  const [grabando, setGrabando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [mensajeGrabacion, setMensajeGrabacion] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function iniciarGrabacion() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await procesarAudio(blob)
      }

      mediaRecorder.start()
      setGrabando(true)
      setMensajeGrabacion('Grabando... hablá ahora')
    } catch {
      setError('No se pudo acceder al micrófono')
    }
  }

  function detenerGrabacion() {
    if (mediaRecorderRef.current && grabando) {
      mediaRecorderRef.current.stop()
      setGrabando(false)
      setMensajeGrabacion('')
      setProcesando(true)
    }
  }

  async function procesarAudio(blob: Blob) {
    try {
      // Convertir audio a base64
      const buffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(buffer)
let binary = ''
uint8Array.forEach(byte => { binary += String.fromCharCode(byte) })
const base64 = btoa(binary)

      // Enviar a Claude para transcribir y extraer datos
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Transcribí este audio de una consulta de gestión de permisos de construcción en Argentina y extraé los datos en JSON.
                
Devolvé SOLO un JSON con estos campos (los que puedas identificar, el resto dejalo vacío):
{
  "nombre": "",
  "celular": "",
  "domicilio": "",
  "municipio": "",
  "tramite": "",
  "observaciones": ""
}

Para municipio, usá uno de estos si coincide: San Isidro, Vicente López, Tigre, San Fernando.
Para tramite, usá uno de estos si coincide: Permiso de construcción, Demolición total, Conforme a obra, Regularización, Consulta previa, Estudio de factibilidad.
Devolvé SOLO el JSON, sin texto adicional.`
              },
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'audio/webm',
                  data: base64
                }
              }
            ]
          }]
        })
      })

      const data = await response.json()
      const texto = data.content?.[0]?.text || '{}'
      
      let extraido: Record<string, string> = {}
      try {
        extraido = JSON.parse(texto.replace(/```json|```/g, '').trim())
      } catch {
        // Si no parsea, dejamos el form como está
      }

      // Pre-completar el formulario con lo extraído
      setForm(f => ({
        ...f,
        nombre: extraido.nombre || f.nombre,
        celular: extraido.celular || f.celular,
        domicilio: extraido.domicilio || f.domicilio,
        municipio: MUNICIPIOS.includes(extraido.municipio) ? extraido.municipio : f.municipio,
        tramite: TRAMITES.includes(extraido.tramite) ? extraido.tramite : f.tramite,
        observaciones: extraido.observaciones || f.observaciones,
      }))

      setMensajeGrabacion('✅ Datos cargados — revisá y completá lo que falta')
    } catch {
      setMensajeGrabacion('No se pudo procesar el audio — completá el formulario manualmente')
    }
    setProcesando(false)
  }

  function agregarArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const nuevos = Array.from(e.target.files)
      setArchivos(prev => [...prev, ...nuevos])
    }
  }

  function quitarArchivo(idx: number) {
    setArchivos(prev => prev.filter((_, i) => i !== idx))
  }

  async function guardar() {
    if (!form.nombre || !form.celular || !form.domicilio || !form.municipio || !form.tramite) {
      setError('Completá los campos obligatorios')
      return
    }
    setSaving(true)
    const municipio = form.municipio === 'nuevo' ? form.municipio_nuevo : form.municipio
    const tramite = form.tramite === 'nuevo' ? form.tramite_nuevo : form.tramite

    const { data: consulta, error: err } = await supabase.from('consultas').insert({
      nombre: form.nombre,
      celular: form.celular,
      domicilio: form.domicilio,
      municipio,
      tramite,
      prioridad: form.prioridad,
      firma: form.firma,
      como_conocio: form.como_conocio,
      observaciones: form.observaciones,
      estado: 'pendiente',
      created_at: new Date().toISOString()
    }).select().single()

    if (err) { setError(err.message); setSaving(false); return }

    const urls: string[] = []
    for (const archivo of archivos) {
      const nombre = `${consulta.id}/${Date.now()}-${archivo.name}`
      const { error: uploadErr } = await supabase.storage
        .from('consultas-archivos')
        .upload(nombre, archivo)
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('consultas-archivos').getPublicUrl(nombre)
        urls.push(urlData.publicUrl)
      }
    }

    if (urls.length > 0) {
      await supabase.from('consultas').update({ archivos: urls }).eq('id', consulta.id)
    }

    setSaving(false)
    router.push('/consultas')
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
        <button onClick={() => router.push('/consultas')} style={{
          width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
        }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Nueva consulta</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Se asigna número P automático</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>

        {/* BOTÓN GRABAR */}
        <div style={{ background: grabando ? 'rgba(248,113,113,0.1)' : 'rgba(45,212,176,0.08)', borderRadius: 14, border: `1.5px solid ${grabando ? 'rgba(248,113,113,0.3)' : 'rgba(45,212,176,0.2)'}`, padding: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>Carga rápida por voz</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px' }}>
            Grabá un audio describiendo la consulta y Claude va a completar el formulario automáticamente.
          </p>
          
          {!grabando && !procesando && (
            <button onClick={iniciarGrabacion} style={{
              width: '100%', padding: 12, fontSize: 14, fontWeight: 600,
              background: 'rgba(45,212,176,0.15)', color: TEAL,
              border: `1.5px solid rgba(45,212,176,0.3)`, borderRadius: 10
            }}>
              🎙 Grabar consulta
            </button>
          )}

          {grabando && (
            <button onClick={detenerGrabacion} style={{
              width: '100%', padding: 12, fontSize: 14, fontWeight: 600,
              background: 'rgba(248,113,113,0.15)', color: '#f87171',
              border: `1.5px solid rgba(248,113,113,0.3)`, borderRadius: 10,
              animation: 'pulse 1s infinite'
            }}>
              ⏹ Detener grabación
            </button>
          )}

          {procesando && (
            <div style={{ textAlign: 'center', padding: 10, color: TEAL, fontSize: 13 }}>
              ⏳ Procesando audio...
            </div>
          )}

          {mensajeGrabacion && !grabando && !procesando && (
            <p style={{ fontSize: 12, color: mensajeGrabacion.startsWith('✅') ? '#4ade80' : '#fbbf24', margin: '10px 0 0', textAlign: 'center' }}>
              {mensajeGrabacion}
            </p>
          )}
        </div>

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
          <Label text="Tipo de cliente" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Arquitecto', 'Propietario'].map(p => (
              <Btn key={p} label={p} active={form.prioridad === p} onClick={() => set('prioridad', p)} />
            ))}
          </div>
        </div>

        <div>
          <Label text="Firma profesional" />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Tekton', 'Del cliente', 'Sin firma'].map(f => (
              <Btn key={f} label={f} active={form.firma === f} onClick={() => set('firma', f)} />
            ))}
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
          <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Info que mandó el cliente, notas iniciales..." style={{ minHeight: 72, resize: 'vertical' }} />
        </div>

        <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 10px', color: 'rgba(255,255,255,0.6)' }}>📎 Archivos adjuntos</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 10px' }}>Fotos, PDF, AutoCAD — lo que mandó el cliente</p>
          <label style={{
            display: 'block', padding: '10px 14px', borderRadius: 10,
            border: `1.5px dashed rgba(45,212,176,0.3)`, cursor: 'pointer',
            textAlign: 'center' as const, color: TEAL, fontSize: 13, marginBottom: 10
          }}>
            + Seleccionar archivos
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf,.doc,.docx" onChange={agregarArchivos} style={{ display: 'none' }} />
          </label>
          {archivos.length > 0 && (
            <div style={{ display: 'grid', gap: 6 }}>
              {archivos.map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 10px' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>📄 {f.name}</span>
                  <button onClick={() => quitarArchivo(i)} style={{ fontSize: 12, color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center' }}>{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={() => router.push('/consultas')} style={{
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
