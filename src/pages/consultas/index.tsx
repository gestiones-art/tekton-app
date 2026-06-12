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

const ESTADOS: Record<string, { label: string, color: string, bg: string }> = {
  pendiente_validacion: { label: 'Pte. validación', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  pendiente_info: { label: 'Falta info', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  validado: { label: 'Validado ✓', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  presupuestado: { label: 'Presupuestado', color: TEAL, bg: 'rgba(45,212,176,0.15)' },
}

export default function ConsultasComercial() {
  const router = useRouter()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todas')

  useEffect(() => { loadConsultas() }, [])

  async function loadConsultas() {
    const { data } = await supabase
      .from('consultas')
      .select('*')
      .order('created_at', { ascending: false })
    setConsultas(data || [])
    setLoading(false)
  }

  const filtradas = filtro === 'todas' ? consultas : consultas.filter(c => c.estado === filtro)

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/')} style={{
          width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
        }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Consultas</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{consultas.length} en total</p>
        </div>
        <button onClick={() => router.push('/consultas/nueva')} style={{
          marginLeft: 'auto', fontSize: 12, padding: '7px 14px', borderRadius: 20,
          background: TEAL, color: '#1a2332', border: 'none', fontWeight: 600
        }}>+ Nueva</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { key: 'todas', label: 'Todas' },
          { key: 'pendiente_validacion', label: 'Pte. validación' },
          { key: 'validado', label: 'Validadas' },
          { key: 'presupuestado', label: 'Presupuestadas' },
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
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>📭</p>
          <p>No hay consultas</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtradas.map(c => {
            const est = ESTADOS[c.estado] || { label: c.estado, color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' }
            return (
              <button key={c.id} onClick={() => router.push(`/consultas/${c.id}`)} style={{
                background: DARK2, borderRadius: 14,
                border: `1.5px solid ${BORDER}`,
                padding: 14, textAlign: 'left', width: '100%'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{c.nombre}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, background: est.bg, color: est.color, padding: '2px 8px', borderRadius: 20, flexShrink: 0, marginLeft: 8 }}>{est.label}</span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 8px' }}>{c.domicilio} · {c.municipio}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{c.tramite}</span>
                  {c.prioridad && <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(45,212,176,0.12)', color: TEAL, padding: '2px 8px', borderRadius: 20 }}>{c.prioridad}</span>}
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>{new Date(c.created_at).toLocaleDateString('es-AR')}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
