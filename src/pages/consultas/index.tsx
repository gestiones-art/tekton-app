import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

const ESTADOS: Record<string, { label: string, color: string, bg: string }> = {
  pendiente:   { label: 'Pdte. técnica',  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  pdte_enviar: { label: 'Pdte. enviar',   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  enviado:     { label: 'Enviado',         color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  aceptado:    { label: 'Aceptado ✓',     color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  rechazado:   { label: 'Rechazado',       color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  cancelado:   { label: 'Cancelado',       color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)' },
}

type Consulta = {
  id: string
  numero_p: string
  nombre: string
  municipio: string
  tramite: string
  estado: string
  created_at: string
  monto_usd: number
  motivo_cancelacion: string
  motivo_rechazo: string
}

export default function Consultas() {
  const router = useRouter()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('activos')

  useEffect(() => { loadConsultas() }, [])

  async function loadConsultas() {
    const { data } = await supabase
      .from('consultas')
      .select('id, numero_p, nombre, municipio, tramite, estado, created_at, monto_usd, motivo_cancelacion, motivo_rechazo')
      .order('created_at', { ascending: false })
    setConsultas(data || [])
    setLoading(false)
  }

  const filtrados = consultas.filter(c => {
    if (filtro === 'activos') return ['pendiente', 'pdte_enviar', 'enviado'].includes(c.estado)
    if (filtro === 'aceptados') return c.estado === 'aceptado'
    if (filtro === 'cerrados') return c.estado === 'rechazado' || c.estado === 'cancelado'
    return true
  })

  const pendientes = consultas.filter(c => c.estado === 'pendiente').length
  const pdteEnviar = consultas.filter(c => c.estado === 'pdte_enviar').length

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', width: '100%', maxWidth: 480 }}>
        <button onClick={() => router.push('/')} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#fff' }}>Consultas / Presupuestos</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            {pendientes > 0 && `${pendientes} pdte técnica`}
            {pendientes > 0 && pdteEnviar > 0 && ' · '}
            {pdteEnviar > 0 && `${pdteEnviar} pdte enviar`}
          </p>
        </div>
        <button onClick={() => router.push('/consultas/nueva')} style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 12px', borderRadius: 20, background: TEAL, color: '#1a2332', border: 'none', fontWeight: 600 }}>+ Nueva</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, width: '100%', maxWidth: 480 }}>
        {[
          { key: 'activos', label: 'Activos' },
          { key: 'aceptados', label: 'Aceptados' },
          { key: 'cerrados', label: 'Cerrados' },
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
          <p style={{ fontSize: 32, marginBottom: 12 }}>📋</p>
          <p>No hay consultas</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, width: '100%', maxWidth: 480 }}>
          {filtrados.map(c => {
            const est = ESTADOS[c.estado] || ESTADOS.pendiente
            return (
              <button key={c.id} onClick={() => router.push(`/consultas/${c.id}`)} style={{
                background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`,
                padding: 14, textAlign: 'left', width: '100%'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{c.numero_p}</span>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#fff' }}>{c.nombre}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, background: est.bg, color: est.color, padding: '2px 8px', borderRadius: 20, flexShrink: 0, marginLeft: 8 }}>{est.label}</span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{c.tramite} · {c.municipio}</p>
                {c.monto_usd > 0 && (
                  <p style={{ fontSize: 12, fontWeight: 700, color: TEAL, margin: '4px 0 0' }}>USD {c.monto_usd.toLocaleString()}</p>
                )}
                {(c.motivo_cancelacion || c.motivo_rechazo) && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0', fontStyle: 'italic' }}>{c.motivo_cancelacion || c.motivo_rechazo}</p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
