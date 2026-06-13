import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

type Consulta = {
  id: string
  numero_p: string
  nombre: string
  celular: string
  domicilio: string
  municipio: string
  tramite: string
  firma: string
  obs_presupuesto: string
  derechos_estimados: number
  aportes_estimados: number
}

export default function NuevoPresupuesto() {
  const router = useRouter()
  const { consulta: consultaId } = router.query
  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [form, setForm] = useState({
    monto_usd: '',
    plazo_dias: '90/180',
    anticipo_usd: '',
    segunda_cuota_usd: '',
    saldo_usd: '',
    descripcion_trabajo: '',
    no_incluye: 'Firma profesional responsable, gestión ante colegio profesional, aportes/colegiación, derechos municipales, sellados, certificaciones, impresiones, agrimensura, informes técnicos especiales ni otros gastos de terceros.',
    vigencia_dias: '7',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (consultaId) loadConsulta()
  }, [consultaId])

  async function loadConsulta() {
    const { data } = await supabase.from('consultas').select('*').eq('id', consultaId).single()
    if (data) setConsulta(data)
  }

  async function guardar() {
    if (!form.monto_usd) { setError('Ingresá el monto total'); return }
    setSaving(true)
    const { data, error: err } = await supabase.from('presupuestos').insert({
      consulta_id: consultaId,
      numero_p: consulta?.numero_p,
      nombre: consulta?.nombre,
      domicilio: consulta?.domicilio,
      municipio: consulta?.municipio,
      tramite: consulta?.tramite,
      monto_usd: parseFloat(form.monto_usd),
      anticipo_usd: parseFloat(form.anticipo_usd) || 0,
      segunda_cuota_usd: parseFloat(form.segunda_cuota_usd) || 0,
      saldo_usd: parseFloat(form.saldo_usd) || 0,
      plazo_dias: form.plazo_dias,
      descripcion_trabajo: form.descripcion_trabajo,
      no_incluye: form.no_incluye,
      vigencia_dias: parseInt(form.vigencia_dias),
      estado: 'borrador',
      created_at: new Date().toISOString()
    }).select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    router.push(`/presupuestos/${data.id}`)
  }

  const Label = ({ text, required }: { text: string, required?: boolean }) => (
    <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>
      {text}{required && <span style={{ color: TEAL }}> *</span>}
    </label>
  )

  if (!consulta && consultaId) return <div style={{ background: '#1a2332', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>Cargando...</div>

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{
          width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
        }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Nuevo presupuesto</p>
          {consulta && <p style={{ fontSize: 11, color: TEAL, margin: 0 }}>{consulta.numero_p} · {consulta.nombre}</p>}
        </div>
      </div>

      {consulta && (
        <div style={{ background: 'rgba(45,212,176,0.08)', borderRadius: 14, border: '1.5px solid rgba(45,212,176,0.2)', padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(45,212,176,0.7)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Info técnica</p>
          {consulta.obs_presupuesto && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px' }}>{consulta.obs_presupuesto}</p>}
          {consulta.derechos_estimados > 0 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 2px' }}>Derechos est.: USD {consulta.derechos_estimados}</p>}
          {consulta.aportes_estimados > 0 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Aportes est.: USD {consulta.aportes_estimados}</p>}
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <Label text="Total honorarios (USD)" required />
          <input type="number" value={form.monto_usd} onChange={e => set('monto_usd', e.target.value)} placeholder="Ej: 2800" />
        </div>

        <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 10px', color: 'rgba(255,255,255,0.6)' }}>Forma de pago (3 cuotas)</p>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <Label text="Anticipo (al confirmar)" />
              <input type="number" value={form.anticipo_usd} onChange={e => set('anticipo_usd', e.target.value)} placeholder="USD" />
            </div>
            <div>
              <Label text="2da cuota (primer visado Obras Part.)" />
              <input type="number" value={form.segunda_cuota_usd} onChange={e => set('segunda_cuota_usd', e.target.value)} placeholder="USD" />
            </div>
            <div>
              <Label text="Saldo (contra entrega)" />
              <input type="number" value={form.saldo_usd} onChange={e => set('saldo_usd', e.target.value)} placeholder="USD" />
            </div>
          </div>
        </div>

        <div>
          <Label text="Plazo estimado" />
          <select value={form.plazo_dias} onChange={e => set('plazo_dias', e.target.value)}>
            <option>30/45 días</option>
            <option>60/90 días</option>
            <option>90/180 días</option>
            <option>120/150 días</option>
            <option>150/180 días</option>
          </select>
        </div>

        <div>
          <Label text="Descripción del trabajo (opcional)" />
          <textarea value={form.descripcion_trabajo} onChange={e => set('descripcion_trabajo', e.target.value)}
            placeholder="Descripción adicional del alcance del trabajo..."
            style={{ minHeight: 72, resize: 'vertical' }} />
        </div>

        <div>
          <Label text="No incluye" />
          <textarea value={form.no_incluye} onChange={e => set('no_incluye', e.target.value)}
            style={{ minHeight: 72, resize: 'vertical' }} />
        </div>

        <div>
          <Label text="Vigencia (días)" />
          <select value={form.vigencia_dias} onChange={e => set('vigencia_dias', e.target.value)}>
            <option value="7">7 días</option>
            <option value="10">10 días</option>
            <option value="15">15 días</option>
          </select>
        </div>

        {error && <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center' }}>{error}</p>}

        <button onClick={guardar} disabled={saving} style={{
          padding: 14, fontSize: 14, fontWeight: 600,
          background: TEAL, color: '#1a2332', border: 'none', borderRadius: 14,
          opacity: saving ? 0.7 : 1
        }}>{saving ? 'Guardando...' : 'Crear presupuesto →'}</button>
      </div>
    </div>
  )
}
