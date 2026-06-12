import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

const ETAPAS = [
  { key: 'en_dibujo', label: 'Dibujo', icon: '✏️', color: '#fbbf24' },
  { key: 'observado_catastro', label: 'Correc. Catastro', icon: '🏛️', color: '#f87171' },
  { key: 'presentado_catastro', label: 'Inicio Catastro', icon: '📤', color: TEAL },
  { key: 'presentado_obras', label: 'Obras Particulares', icon: '🏠', color: TEAL },
  { key: 'correc_visado', label: 'Correc. Visado', icon: '📋', color: '#fbbf24' },
  { key: 'estructura_en_proceso', label: 'Estructura', icon: '🏗️', color: TEAL },
  { key: 'pendiente_colegio', label: 'Colegio', icon: '🎓', color: TEAL },
  { key: 'en_pausa', label: 'En pausa', icon: '⏸️', color: 'rgba(255,255,255,0.3)' },
]

type Tramite = {
  id: string
  nombre: string
  domicilio: string
  municipio: string
  tramite: string
  estado_actual: string
  pelota: string
  ultima_nota: string
  ultima_accion_at: string
  n_expediente: string
}

export default function Tramites() {
  const router = useRouter()
  const [tramites, setTramites] = useState<Tramite[]>([])
  const [loading, setLoading] = useState(true)
  const [abierto, setAbierto] = useState<string | null>(null)

  useEffect(() => { loadTramites() }, [])

  async function loadTramites() {
    const { data } = await supabase
      .from('tramites')
      .select('*')
      .not('estado_actual', 'eq', 'finalizado')
      .order('ultima_accion_at', { ascending: true })
    setTramites(data || [])
    setLoading(false)
  }

  const porEtapa = (key: string) => tramites.filter(t => t.estado_actual === key)

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/')} style={{
          width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
        }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Trámites en curso</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{tramites.length} activos</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>Cargando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
          {ETAPAS.map(etapa => {
            const items = porEtapa(etapa.key)
            const vencidos = items.filter(t => {
              const dias = (Date.now() - new Date(t.ultima_accion_at).getTime()) / (1000 * 60 * 60 * 24)
              return dias > 7 && t.pelota !== 'municipio'
            }).length
            const isOpen = abierto === etapa.key

            return (
              <div key={etapa.key} style={{ gridColumn: isOpen ? '1 / -1' : 'auto' }}>
                <button
                  onClick={() => setAbierto(isOpen ? null : etapa.key)}
                  style={{
                    background: DARK2, borderRadius: 14, width: '100%',
                    border: `1.5px solid ${vencidos > 0 ? 'rgba(248,113,113,0.3)' : BORDER}`,
                    padding: 14, textAlign: 'left'
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{
                      width: 34, height: 34, background: `${etapa.color}22`,
                      borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17
                    }}>{etapa.icon}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: vencidos > 0 ? 'rgba(248,113,113,0.15)' : items.length > 0 ? 'rgba(251,191,36,0.15)' : 'rgba(74,222,128,0.15)',
                      color: vencidos > 0 ? '#f87171' : items.length > 0 ? '#fbbf24' : '#4ade80',
                      padding: '2px 7px', borderRadius: 20
                    }}>
                      {vencidos > 0 ? `⚠ ${vencidos} vencida` : items.length > 0 ? `${items.length} activos` : 'al día'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 2px', color: etapa.key === 'en_pausa' ? 'rgba(255,255,255,0.4)' : '#fff' }}>{etapa.label}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{items.length} expedientes {isOpen ? '↑' : '↓'}</p>
                </button>

                {isOpen && (
                  <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                    {items.length === 0 ? (
                      <div style={{ background: DARK2, borderRadius: 12, padding: 14, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                        No hay expedientes en esta etapa
                      </div>
                    ) : items.map(t => (
                      <button key={t.id} onClick={() => router.push(`/tramites/${t.id}`)} style={{
                        background: DARK2, borderRadius: 12,
                        border: `1.5px solid ${BORDER}`, padding: 12, textAlign: 'left', width: '100%'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{t.nombre}</p>
                          <span style={{ fontSize: 10, background: 'rgba(45,212,176,0.12)', color: TEAL, padding: '2px 7px', borderRadius: 20 }}>{t.municipio}</span>
                        </div>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 6px' }}>{t.domicilio} · {t.tramite}</p>
                        {t.ultima_nota && (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0, fontStyle: 'italic' }}>"{t.ultima_nota}"</p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.pelota === 'fer' ? '#f97316' : t.pelota === 'cliente' ? '#8b5cf6' : t.pelota === 'municipio' ? TEAL : '#3b82f6' }} />
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                            {t.pelota === 'fer' ? 'Área técnica' : t.pelota === 'cliente' ? 'Cliente' : t.pelota === 'municipio' ? 'Municipio' : 'Silvina'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
