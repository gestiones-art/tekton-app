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
  estado: string
  created_at: string
  enviado_at: string
  motivo_rechazo: string
}

const ESTADOS: Record<string, { label: string, color: string, bg: string }> = {
  borrador: { label: 'Borrador', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' },
  enviado: { label: 'Enviado', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  aceptado: { label: 'Aceptado ✓', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  rechazado: { label: 'Rechazado', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
}

export default function Presupuestos() {
  const router = useRouter()
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('activos')

  useEffect(() => { loadPresupuestos() }, [])

  async function loadPresupuestos() {
    const { data } = await supabase
      .from('presupuestos')
      .select('*')
      .order('created_at', { ascending: false })
    setPresupuestos(data || [])
    setLoading(false)
  }

  const filtrados = presupuestos.filter(p => {
    if (filtro === 'activos') return p.estado === 'enviado' || p.estado === 'borrador'
    if (filtro === 'aceptados') return p.estado === 'aceptado'
    if (filtro === 'rechazados') return p.estado === 'rechazado'
    return true
  })

  const sinRespuesta = presupuestos.filter(p => {
    if (p.estado !== 'enviado') return false
    const dias = (Date.now() - new Date(p.enviado_at).getTime()) / (1000 * 60 * 60 * 24)
    return dias > 3
  }).length

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', width: '100%', maxWidth: 480 }}>
        <button onClick={() => router.push('/')} style={{
          width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
        }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Presupuestos</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            {sinRespuesta > 0 ? `⚠ ${sinRespuesta} sin respuesta hace +3 días` : `${presupuestos.length} en total`}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4, width: '100%', maxWidth: 480 }}>
        {[
          { key: 'activos', label: 'Activos' },
          { key: 'aceptados', label: 'Aceptados' },
          { key: 'rechazados', label: 'Rechazados' },
          { key: 'todos', label: 'Todos' },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)} style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 20, whiteSpace: 'nowrap',
            border: `1.5px solid ${filtro === f.key ? 'rgba(45,212,176,0.4)' : BORDER}`,
            background: filtro === f.key ? 'rgba(45,212,176,0.15)' : 'transparent',
            color: filtro === f.key ? TEAL : 'rgba(255,255,255,0.5)', fontWeight: filtro === f.key ? 700 : 400
          }}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>📄</p>
          <p>No hay presupuestos</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, width: '100%', maxWidth: 480 }}>
          {filtrados.map(p => {
            const est = ESTADOS[p.estado] || ESTADOS.borrador
            const diasEnviado = p.enviado_at ? Math.floor((Date.now() - new Date(p.enviado_at).getTime()) / (1000 * 60 * 60 * 24)) : 0
            const sinResp = p.estado === 'enviado' && diasEnviado > 3
            return (
              <button key={p.id} onClick={() => router.push(`/presupuestos/${p.id}`)} style={{
                background: DARK2, borderRadius: 14,
                border: `1.5px solid ${sinResp ? 'rgba(251,191,36,0.3)' : BORDER}`,
                padding: 14, textAlign: 'left', width: '100%'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{p.numero_p}</span>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{p.nombre}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, background: est.bg, color: est.color, padding: '2px 8px', borderRadius: 20, flexShrink: 0, marginLeft: 8 }}>{est.label}</span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 8px' }}>{p.domicilio} · {p.municipio}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>USD {p.monto_usd?.toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{p.tramite}</span>
                  {sinResp && <span style={{ fontSize: 10, color: '#fbbf24', marginLeft: 'auto' }}>⚠ {diasEnviado}d sin resp.</span>}
                  {p.motivo_rechazo && <span style={{ fontSize: 10, color: '#f87171', marginLeft: 'auto' }}>{p.motivo_rechazo}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
