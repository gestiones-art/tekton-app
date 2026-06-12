import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

type Consulta = {
  id: string
  nombre: string
  domicilio: string
  municipio: string
  tramite: string
  prioridad: string
  created_at: string
  estado: string
}

export default function Consultas() {
  const router = useRouter()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadConsultas() }, [])

  async function loadConsultas() {
    const { data } = await supabase
      .from('consultas')
      .select('*')
      .eq('estado', 'pendiente_validacion')
      .order('created_at', { ascending: true })
    setConsultas(data || [])
    setLoading(false)
  }

  function horasDesde(fecha: string) {
    return Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60))
  }

  function estadoBadge(consulta: Consulta) {
    const horas = horasDesde(consulta.created_at)
    if (horas > 24) return { label: `⚠ Vencida ${Math.floor(horas/24)}d`, color: '#f87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)' }
    if (horas > 16) return { label: 'Urgente', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)' }
    return { label: 'Nueva', color: '#4ade80', bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.3)' }
  }

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/')} style={{
          width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
        }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Validar p/presupuesto</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{consultas.length} pendientes · Área técnica</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>Cargando...</div>
      ) : consultas.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
          <p>No hay consultas pendientes</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {consultas.map(c => {
            const badge = estadoBadge(c)
            return (
              <button key={c.id} onClick={() => router.push(`/validar/${c.id}`)} style={{
                background: DARK2, borderRadius: 14,
                border: `1.5px solid ${badge.border}`,
                padding: 14, textAlign: 'left', width: '100%'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>#{c.id.slice(-4)}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color, padding: '2px 7px', borderRadius: 20 }}>{badge.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                    {new Date(c.created_at).toLocaleDateString('es-AR')}
                  </span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px' }}>{c.nombre}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 10px' }}>
                  {c.domicilio} · {c.tramite}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {c.prioridad && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(45,212,176,0.12)', color: TEAL, padding: '2px 8px', borderRadius: 20 }}>
                      {c.prioridad} {c.prioridad === 'Arquitecto' ? '★' : ''}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>📎 archivos adjuntos</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
