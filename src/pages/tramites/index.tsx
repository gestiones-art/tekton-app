import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

const ETAPAS = [
  { key: 'en_dibujo', label: 'Dibujo', icon: '✏️', color: '#fbbf24' },
  { key: 'presentado_catastro', label: 'Inicio Catastro', icon: '📤', color: TEAL },
  { key: 'observado_catastro', label: 'Correc. Catastro', icon: '🏛️', color: '#f87171' },
  { key: 'presentado_obras', label: 'Obras Particulares', icon: '🏠', color: TEAL },
  { key: 'correc_visado', label: 'Correc. Visado', icon: '📋', color: '#fbbf24' },
  { key: 'estructura_en_proceso', label: 'Estructura', icon: '🏗️', color: TEAL },
  { key: 'pendiente_colegio', label: 'Colegio', icon: '🎓', color: TEAL },
  { key: 'en_pausa', label: 'En pausa', icon: '⏸️', color: 'rgba(255,255,255,0.3)' },
]

type Tramite = {
  id: string
  numero_p: string
  nombre: string
  domicilio: string
  municipio: string
  tramite: string
  estado_actual: string
  pelota: string
  ultima_nota: string
  ultima_accion_at: string
  n_expediente: string
  n_parcelaria: string
  dibujante: string
}

export default function Tramites() {
  const router = useRouter()
  const [tramites, setTramites] = useState<Tramite[]>([])
  const [loading, setLoading] = useState(true)
  const [etapaFiltro, setEtapaFiltro] = useState<string | null>(null)

  useEffect(() => {
    const etapa = router.query.etapa as string
    if (etapa) {
      const map: Record<string, string> = {
        dibujo: 'en_dibujo',
        catastro: 'observado_catastro',
        visado: 'correc_visado',
        estructura: 'estructura_en_proceso',
        colegio: 'pendiente_colegio',
      }
      setEtapaFiltro(map[etapa] || null)
    }
    loadTramites()
  }, [router.query])

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
  const diasSinMover = (fecha: string) => Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24))

  const responsableColor = (p: string) => {
    const colors: Record<string, string> = { admin: '#3b82f6', tecnica: '#f97316', cliente: '#8b5cf6', municipio: TEAL, dibujante: '#fbbf24' }
    return colors[p] || '#888'
  }
  const responsableLabel = (p: string) => {
    const labels: Record<string, string> = { admin: 'Adm/Comercial', tecnica: 'Técnica', cliente: 'Cliente', municipio: 'Municipio', dibujante: 'Dibujante' }
    return labels[p] || p
  }

  if (etapaFiltro) {
    const etapa = ETAPAS.find(e => e.key === etapaFiltro)
    const items = porEtapa(etapaFiltro)
    const esCatastro = etapaFiltro.includes('catastro')
    const esObras = etapaFiltro.includes('obras')

    return (
      <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <button onClick={() => { setEtapaFiltro(null); router.push('/tramites') }} style={{
            width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
            border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
          }}>←</button>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{etapa?.icon} {etapa?.label}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{items.length} expedientes</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
            <p>No hay expedientes en esta etapa</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map(t => {
              const dias = diasSinMover(t.ultima_accion_at)
              const vencido = dias > 7 && t.pelota !== 'municipio'
              return (
                <button key={t.id} onClick={() => router.push(`/tramites/${t.id}`)} style={{
                  background: DARK2, borderRadius: 14,
                  border: `1.5px solid ${vencido ? 'rgba(248,113,113,0.3)' : BORDER}`,
                  padding: 14, textAlign: 'left', width: '100%'
                }}>
                  {/* CATASTRO: parcelaria primero */}
                  {esCatastro && t.n_parcelaria && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: TEAL, background: 'rgba(45,212,176,0.12)', padding: '2px 10px', borderRadius: 20 }}>
                        Parcelaria {t.n_parcelaria}
                      </span>
                    </div>
                  )}
                  {/* OBRAS: expediente primero */}
                  {esObras && t.n_expediente && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: TEAL, background: 'rgba(45,212,176,0.12)', padding: '2px 10px', borderRadius: 20 }}>
                        Exp: {t.n_expediente}
                      </span>
                    </div>
                  )}
                  {/* NOMBRE Y NÚMERO */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {!esCatastro && !esObras && t.numero_p && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{t.numero_p}</span>
                    )}
                    <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff' }}>{t.nombre}</p>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px' }}>
                    {t.domicilio && `${t.domicilio} · `}{t.tramite}
                  </p>
                  {t.ultima_nota && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 8px', fontStyle: 'italic' }}>"{t.ultima_nota}"</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: responsableColor(t.pelota) }} />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{responsableLabel(t.pelota)}</span>
                    </div>
                    {t.dibujante && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>· {t.dibujante}</span>}
                    {esCatastro && t.numero_p && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>· {t.numero_p}</span>}
                    {esObras && t.numero_p && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>· {t.numero_p}</span>}
                    {vencido && <span style={{ fontSize: 11, color: '#f87171', marginLeft: 'auto' }}>⚠ {dias}d sin mover</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {ETAPAS.map(etapa => {
            const items = porEtapa(etapa.key)
            const vencidos = items.filter(t => diasSinMover(t.ultima_accion_at) > 7 && t.pelota !== 'municipio').length
            return (
              <button key={etapa.key} onClick={() => setEtapaFiltro(etapa.key)} style={{
                background: DARK2, borderRadius: 14, width: '100%',
                border: `1.5px solid ${vencidos > 0 ? 'rgba(248,113,113,0.3)' : BORDER}`,
                padding: 14, textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, background: `${etapa.color}22`,
                    borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                  }}>{etapa.icon}</div>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: vencidos > 0 ? 'rgba(248,113,113,0.15)' : items.length > 0 ? 'rgba(251,191,36,0.15)' : 'rgba(74,222,128,0.15)',
                    color: vencidos > 0 ? '#f87171' : items.length > 0 ? '#fbbf24' : '#4ade80',
                    padding: '3px 9px', borderRadius: 20
                  }}>
                    {vencidos > 0 ? `⚠ ${vencidos} vencida` : items.length > 0 ? `${items.length} activos` : 'al día'}
                  </span>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: etapa.key === 'en_pausa' ? 'rgba(255,255,255,0.4)' : '#fff' }}>{etapa.label}</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, fontWeight: 600 }}>{items.length} expedientes →</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
