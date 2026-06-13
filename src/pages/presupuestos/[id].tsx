import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

type Presupuesto = {
  id: string
  consulta_id: string
  numero_p: string
  nombre: string
  domicilio: string
  municipio: string
  tramite: string
  monto_usd: number
  anticipo_usd: number
  segunda_cuota_usd: number
  saldo_usd: number
  plazo_dias: string
  descripcion_trabajo: string
  no_incluye: string
  vigencia_dias: number
  estado: string
  created_at: string
  enviado_at: string
  motivo_rechazo: string
}

const ESTADOS_LABEL: Record<string, { label: string, color: string, bg: string }> = {
  borrador: { label: 'Borrador', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' },
  enviado: { label: 'Enviado', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  aceptado: { label: 'Aceptado ✓', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  rechazado: { label: 'Rechazado', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
}

export default function PresupuestoDetalle() {
  const router = useRouter()
  const { id } = router.query
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [showRechazo, setShowRechazo] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (id) loadPresupuesto() }, [id])

  async function loadPresupuesto() {
    const { data } = await supabase.from('presupuestos').select('*').eq('id', id).single()
    if (data) setPresupuesto(data)
  }

  async function marcarEnviado() {
    setSaving(true)
    await supabase.from('presupuestos').update({
      estado: 'enviado',
      enviado_at: new Date().toISOString()
    }).eq('id', id)
    setSaving(false)
    loadPresupuesto()
  }

  async function marcarAceptado() {
    setSaving(true)
    await supabase.from('presupuestos').update({ estado: 'aceptado' }).eq('id', id)
    if (presupuesto) {
      await supabase.from('tramites').insert({
        numero_p: presupuesto.numero_p,
        nombre: presupuesto.nombre,
        domicilio: presupuesto.domicilio,
        municipio: presupuesto.municipio,
        tramite: presupuesto.tramite,
        estado_actual: 'en_dibujo',
        pelota: 'silvina',
        ultima_nota: 'Trámite iniciado — presupuesto aceptado',
        ultima_accion_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
    }
    setSaving(false)
    loadPresupuesto()
    alert('¡Presupuesto aceptado! Se creó el trámite en curso.')
  }

  async function marcarRechazado() {
    if (!motivoRechazo) return
    setSaving(true)
    await supabase.from('presupuestos').update({
      estado: 'rechazado',
      motivo_rechazo: motivoRechazo
    }).eq('id', id)
    setSaving(false)
    setShowRechazo(false)
    loadPresupuesto()
  }

  function generarPDF() {
    if (!presupuesto) return
    const fecha = new Date(presupuesto.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    const vigencia = new Date(presupuesto.created_at)
    vigencia.setDate(vigencia.getDate() + (presupuesto.vigencia_dias || 7))
    const vigenciaStr = vigencia.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #222; max-width: 680px; margin: 0 auto; padding: 40px 30px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 16px; border-bottom: 2px solid #2dd4b0; }
  .logo { font-size: 22px; font-weight: 800; color: #1a2332; }
  .logo span { color: #2dd4b0; }
  .fecha { text-align: right; font-size: 12px; color: #666; }
  .numero { font-size: 16px; font-weight: 700; color: #1a2332; }
  h2 { font-size: 15px; font-weight: 700; margin: 24px 0 6px; color: #1a2332; }
  p { margin: 4px 0; line-height: 1.6; }
  .ref { background: #f4fffe; border-left: 3px solid #2dd4b0; padding: 10px 14px; margin: 16px 0; border-radius: 4px; }
  .monto { font-size: 20px; font-weight: 800; color: #1a2332; margin: 16px 0 8px; }
  .cuota-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #888; }
  .cbu { background: #f8f8f8; padding: 10px 14px; border-radius: 6px; margin-top: 12px; font-size: 12px; }
  .vigencia { font-size: 12px; color: #888; margin-top: 16px; font-style: italic; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">Estudio <span>Tekton</span></div>
    <div style="font-size:11px;color:#888;margin-top:4px;">Gestiones y trámites municipales</div>
  </div>
  <div class="fecha">
    <div>San Isidro, ${fecha}</div>
    <div class="numero">${presupuesto.numero_p}</div>
  </div>
</div>
<div class="ref"><strong>REF. OBRA:</strong> ${presupuesto.tramite} – ${presupuesto.domicilio}, ${presupuesto.municipio}</div>
<p><strong>Solicitante:</strong> ${presupuesto.nombre}</p>
<p style="margin-top:16px;">Estimado/a:</p>
<p>Agradecemos el interés en nuestros servicios. A continuación detallamos los honorarios por el armado, presentación y seguimiento del trámite municipal de <strong>${presupuesto.tramite.toLowerCase()}</strong> del inmueble ubicado en ${presupuesto.domicilio}, Partido de ${presupuesto.municipio}.</p>
${presupuesto.descripcion_trabajo ? `<p style="margin-top:12px;">${presupuesto.descripcion_trabajo}</p>` : ''}
<h2>Honorarios</h2>
<div class="monto">TOTAL: USD ${presupuesto.monto_usd?.toLocaleString('es-AR')}</div>
<h2>Forma de pago</h2>
<div class="cuota-row"><span>Anticipo (al confirmar el trabajo)</span><span><strong>USD ${presupuesto.anticipo_usd?.toLocaleString('es-AR') || '—'}</strong></span></div>
<div class="cuota-row"><span>2da cuota (al primer visado de Obras Particulares)</span><span><strong>USD ${presupuesto.segunda_cuota_usd?.toLocaleString('es-AR') || '—'}</strong></span></div>
<div class="cuota-row"><span>Saldo (contra entrega de documentación aprobada)</span><span><strong>USD ${presupuesto.saldo_usd?.toLocaleString('es-AR') || '—'}</strong></span></div>
<p style="margin-top:8px;font-size:12px;color:#666;">Tipo de cambio: dólar blue vendedor del día de pago.</p>
<h2>Plazo estimado</h2>
<p>El plazo estimado de gestión es de <strong>${presupuesto.plazo_dias} días</strong>, sujeto a tiempos municipales y documentación aportada.</p>
<h2>No incluye</h2>
<p style="font-size:12px;color:#555;">${presupuesto.no_incluye}</p>
<div class="vigencia">Vigencia: ${presupuesto.vigencia_dias || 7} días a partir de la fecha (hasta el ${vigenciaStr}).</div>
<div class="cbu"><strong>Datos de pago</strong><br>Forma de pago: Efectivo / Transferencia / Depósito<br>Banco: Banco Francés · CBU: 0170154440000004887276</div>
<div class="footer">gestiones@estudiotekton.com · Estudio Tekton · San Isidro, Buenos Aires</div>
</body>
</html>`

    const ventana = window.open('', '_blank')
    if (ventana) { ventana.document.write(html); ventana.document.close(); ventana.print() }
  }

  function compartirWhatsApp() {
    if (!presupuesto) return
    const texto = `Hola ${presupuesto.nombre.split(' ')[0]}, te enviamos el presupuesto ${presupuesto.numero_p} de Estudio Tekton para el trámite de ${presupuesto.tramite} en ${presupuesto.domicilio}.\n\nTotal: USD ${presupuesto.monto_usd?.toLocaleString('es-AR')}\nForma de pago:\n• Anticipo: USD ${presupuesto.anticipo_usd?.toLocaleString('es-AR')}\n• 2da cuota (primer visado): USD ${presupuesto.segunda_cuota_usd?.toLocaleString('es-AR')}\n• Saldo (contra entrega): USD ${presupuesto.saldo_usd?.toLocaleString('es-AR')}\n\nVigencia: ${presupuesto.vigencia_dias || 7} días.\nQuedamos a tu disposición para cualquier consulta.`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  if (!presupuesto) return <div style={{ background: '#1a2332', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>Cargando...</div>

  const est = ESTADOS_LABEL[presupuesto.estado] || ESTADOS_LABEL.borrador

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/presupuestos')} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{presupuesto.numero_p}</span>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{presupuesto.nombre}</p>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{presupuesto.municipio} · {presupuesto.tramite}</p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, background: est.bg, color: est.color, padding: '3px 10px', borderRadius: 20 }}>{est.label}</span>
      </div>

      <div style={{ background: 'rgba(45,212,176,0.1)', borderRadius: 14, border: '1.5px solid rgba(45,212,176,0.35)', padding: 16, marginBottom: 12, textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'rgba(45,212,176,0.7)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>Total honorarios</p>
        <p style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px' }}>USD {presupuesto.monto_usd?.toLocaleString('es-AR')}</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{presupuesto.tramite} · {presupuesto.domicilio}</p>
      </div>

      <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>Forma de pago</p>
        <Cuota label="Anticipo" desc="Al confirmar el trabajo" valor={presupuesto.anticipo_usd} />
        <Cuota label="2da cuota" desc="Primer visado Obras Particulares" valor={presupuesto.segunda_cuota_usd} />
        <Cuota label="Saldo" desc="Contra entrega" valor={presupuesto.saldo_usd} />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '8px 0 0' }}>Plazo estimado: {presupuesto.plazo_dias} días</p>
      </div>

      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={generarPDF} style={{ padding: 12, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 12 }}>📄 Ver / Imprimir PDF</button>
          <button onClick={compartirWhatsApp} style={{ padding: 12, fontSize: 13, fontWeight: 600, background: 'rgba(37,211,102,0.15)', color: '#25d366', border: '1.5px solid rgba(37,211,102,0.3)', borderRadius: 12 }}>💬 Compartir WA</button>
        </div>
        {presupuesto.estado === 'borrador' && (
          <button onClick={marcarEnviado} disabled={saving} style={{ padding: 12, fontSize: 14, fontWeight: 600, background: TEAL, color: '#1a2332', border: 'none', borderRadius: 12 }}>{saving ? '...' : 'Marcar como enviado ↗'}</button>
        )}
        {presupuesto.estado === 'enviado' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={marcarAceptado} disabled={saving} style={{ padding: 12, fontSize: 13, fontWeight: 600, background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1.5px solid rgba(74,222,128,0.3)', borderRadius: 12 }}>✓ Aceptado</button>
            <button onClick={() => setShowRechazo(true)} style={{ padding: 12, fontSize: 13, fontWeight: 600, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1.5px solid rgba(248,113,113,0.3)', borderRadius: 12 }}>✗ Rechazado</button>
          </div>
        )}
        {presupuesto.estado === 'aceptado' && (
          <button onClick={() => router.push('/tramites')} style={{ padding: 12, fontSize: 14, fontWeight: 600, background: TEAL, color: '#1a2332', border: 'none', borderRadius: 12 }}>Ver trámite en curso →</button>
        )}
      </div>

      {presupuesto.motivo_rechazo && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1.5px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: 12 }}>
          <p style={{ fontSize: 11, color: '#f87171', margin: '0 0 4px', fontWeight: 700 }}>Motivo de rechazo</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{presupuesto.motivo_rechazo}</p>
        </div>
      )}

      {showRechazo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
          <div style={{ background: '#1a2332', borderRadius: 18, padding: 24, width: '100%', maxWidth: 360, border: `1.5px solid ${BORDER}` }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>¿Por qué rechazó?</p>
            <textarea value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} placeholder="Ej: precio alto, eligió otro estudio..." style={{ minHeight: 80, marginBottom: 14 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setShowRechazo(false)} style={{ padding: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 10 }}>Volver</button>
              <button onClick={marcarRechazado} disabled={!motivoRechazo || saving} style={{ padding: 10, fontSize: 13, fontWeight: 600, background: '#f87171', color: '#fff', border: 'none', borderRadius: 10, opacity: !motivoRechazo ? 0.5 : 1 }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Cuota({ label, desc, valor }: { label: string, desc: string, valor: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{desc}</p>
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>USD {valor?.toLocaleString('es-AR') || '—'}</span>
    </div>
  )
}
