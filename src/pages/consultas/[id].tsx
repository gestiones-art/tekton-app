import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

type Consulta = {
  id: string
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
}

export default function ConsultaDetalle() {
  const router = useRouter()
  const { id } = router.query
  const [consulta, setConsulta] = useState<Consulta | null>(null)

  useEffect(() => {
    if (id) loadConsulta()
  }, [id])

  async function loadConsulta() {
    const { data } = await supabase.from('consultas').select('*').eq('id', id).single()
    if (data) setConsulta(data)
  }

  if (!consulta) return (
    <div style={{ background: '#1a2332', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
      Cargando...
    </div>
  )

  const validado = consulta.estado === 'validado' || consulta.estado === 'presupuestado'

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/consultas')} style={{
          width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
        }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{consulta.nombre}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{consulta.municipio} · {consulta.tramite}</p>
        </div>
      </div>

      {/* DATOS */}
      <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>Datos</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, fontSize: 12 }}>
          {[['Celular', consulta.celular], ['Domicilio', consulta.domicilio], ['Prioridad', consulta.prioridad], ['Firma', consulta.firma], ['Cómo nos conoció', consulta.como_conocio]].map(([k, v]) => v ? (
            <div key={k}><p style={{ color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>{k}</p><p style={{ color: '#fff', fontWeight: 500, margin: 0 }}>{v}</p></div>
          ) : null)}
        </div>
        {consulta.observaciones && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>Observaciones</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{consulta.observaciones}</p>
          </div>
        )}
      </div>

      {/* RESPUESTA TECNICA */}
      {validado ? (
        <div style={{ background: 'rgba(45,212,176,0.08)', borderRadius: 14, border: '1.5px solid rgba(45,212,176,0.3)', padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>Respuesta área técnica ✓</p>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#1a2332', borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>¿Se ajusta al COU?</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: consulta.ajusta_cou === 'si' ? '#4ade80' : '#f87171' }}>
                {consulta.ajusta_cou === 'si' ? 'Sí' : consulta.ajusta_cou === 'no' ? 'No' : 'Con observaciones'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#1a2332', borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>¿Consulta previa?</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: consulta.consulta_previa ? '#f87171' : '#4ade80' }}>{consulta.consulta_previa ? 'Sí' : 'No'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#1a2332', borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>¿Visita previa?</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: consulta.visita_previa ? '#fbbf24' : '#4ade80' }}>{consulta.visita_previa ? 'Sí' : 'No'}</span>
            </div>
            {consulta.visita_dias && (
              <div style={{ padding: '8px 12px', background: '#1a2332', borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Días disponibles</p>
                <p style={{ fontSize: 12, color: '#fff', margin: 0 }}>{consulta.visita_dias}</p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
              <div style={{ padding: '10px 12px', background: '#1a2332', borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>Derechos est.</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>USD {consulta.derechos_estimados || '—'}</p>
                {consulta.derechos_m2 && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>{consulta.derechos_m2} m²</p>}
              </div>
              <div style={{ padding: '10px 12px', background: '#1a2332', borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>Aportes est.</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>USD {consulta.aportes_estimados || '—'}</p>
                {consulta.aportes_m2 && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>{consulta.aportes_m2} m²</p>}
              </div>
            </div>
            {consulta.obs_presupuesto && (
              <div style={{ padding: '10px 12px', background: '#1a2332', borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Obs. para presupuesto</p>
                <p style={{ fontSize: 12, color: '#fff', margin: 0 }}>{consulta.obs_presupuesto}</p>
              </div>
            )}
            {consulta.cou_observaciones && (
              <div style={{ padding: '10px 12px', background: '#1a2332', borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Obs. COU</p>
                <p style={{ fontSize: 12, color: '#fff', margin: 0 }}>{consulta.cou_observaciones}</p>
              </div>
            )}
          </div>
        </div>
      ) : consulta.info_faltante ? (
        <div style={{ background: 'rgba(248,113,113,0.08)', borderRadius: 14, border: '1.5px solid rgba(248,113,113,0.25)', padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 8px' }}>⚠ Falta info — pedido por área técnica</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{consulta.info_faltante}</p>
        </div>
      ) : (
        <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>⏳ Esperando validación del área técnica</p>
        </div>
      )}

      {validado && (
        <button onClick={() => router.push(`/presupuestos/nuevo?consulta=${consulta.id}`)} style={{
          width: '100%', padding: 14, fontSize: 14, fontWeight: 600,
          background: TEAL, color: '#1a2332', border: 'none', borderRadius: 14
        }}>
          Generar presupuesto ↗
        </button>
      )}
    </div>
  )
}
