import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

// Mapa de valores viejos → nuevos (para compatibilidad con datos existentes)
const ESTADO_MAP: Record<string, string> = {
  en_dibujo: 'dibujo',
  observado_catastro: 'correc_catastro',
  presentado_catastro: 'catastro',
  correc_visado: 'correc_op',
  presentado_obras: 'obras',
  estructura_en_proceso: 'otros',
  pendiente_colegio: 'otros',
  en_pausa: 'otros',
}

const RESPONSABLES = [
  { key: 'admin', label: 'Adm / Comercial', icon: '🏢', color: '#3b82f6' },
  { key: 'tecnica', label: 'Técnica', icon: '📐', color: '#f97316' },
  { key: 'municipio', label: 'Municipio', icon: '🏛️', color: TEAL },
  { key: 'cliente', label: 'Cliente', icon: '👤', color: '#8b5cf6' },
]

const SUBESTADOS_TECNICA = [
  { key: 'dibujo', label: 'Dibujo', icon: '✏️' },
  { key: 'correc_catastro', label: 'Correc. Catastro', icon: '🏛️' },
  { key: 'correc_op', label: 'Correc. OP', icon: '📋' },
  { key: 'validar_presu', label: 'Validar Presu.', icon: '💰' },
  { key: 'otros', label: 'Otros', icon: '📎' },
]

const SUBESTADOS_MUNICIPIO = [
  { key: 'catastro', label: 'Catastro', icon: '🗂️' },
  { key: 'obras', label: 'Obras Particulares', icon: '🏠' },
  { key: 'ordenamiento', label: 'Ordenamiento Urbano', icon: '🗺️' },
  { key: 'otros', label: 'Otros', icon: '📎' },
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
  checklist: Record<string, boolean>
}

type Vista = 'bloques' | 'lista' | 'subestados'

export default function Tramites() {
  const router = useRouter()
  const [tramites, setTramites] = useState<Tramite[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<Vista>('bloques')
  const [responsableFiltro, setResponsableFiltro] = useState<string | null>(null)
  const [subestadoFiltro, setSubestadoFiltro] = useState<string | null>(null)

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

  // Normaliza estado_actual: si viene valor viejo, lo mapea al nuevo
  const estadoNorm = (t: Tramite) => ESTADO_MAP[t.estado_actual] || t.estado_actual

  const porResponsable = (key: string) => tramites.filter(t => t.pelota === key)
  const porSubestado = (responsable: string, sub: string) =>
    tramites.filter(t => t.pelota === responsable && estadoNorm(t) === sub)

  const diasSinMover = (fecha: string) =>
    Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24))

  const vencidos = (items: Tramite[]) =>
    items.filter(t => diasSinMover(t.ultima_accion_at) > 7 && t.pelota !== 'municipio').length

  function irAResponsable(key: string) {
    setResponsableFiltro(key)
    if (key === 'tecnica' || key === 'municipio') {
      setVista('subestados')
    } else {
      setSubestadoFiltro(null)
      setVista('lista')
    }
  }

  function irASubestado(sub: string) {
    setSubestadoFiltro(sub)
    setVista('lista')
  }

  function volver() {
    if (vista === 'lista' && (responsableFiltro === 'tecnica' || responsableFiltro === 'municipio')) {
      setVista('subestados')
      setSubestadoFiltro(null)
    } else {
      setVista('bloques')
      setResponsableFiltro(null)
      setSubestadoFiltro(null)
    }
  }

  const itemsLista = subestadoFiltro
    ? porSubestado(responsableFiltro!, subestadoFiltro)
    : responsableFiltro ? porResponsable(responsableFiltro) : []

  const responsableActual = RESPONSABLES.find(r => r.key === responsableFiltro)
  const subestados = responsableFiltro === 'tecnica' ? SUBESTADOS_TECNICA : SUBESTADOS_MUNICIPIO
  const subestadoActual = subestados.find(s => s.key === subestadoFiltro)

  // ── VISTA LISTA ──────────────────────────────────────────────
  if (vista === 'lista') {
    const titulo = subestadoActual
      ? `${subestadoActual.icon} ${subestadoActual.label}`
      : `${responsableActual?.icon} ${responsableActual?.label}`

    return (
      <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <button onClick={volver} style={{
            width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
            border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
          }}>←</button>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{titulo}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{itemsLista.length} expedientes</p>
          </div>
        </div>

        {itemsLista.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
            <p>No hay expedientes acá</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {itemsLista.map(t => {
              const dias = diasSinMover(t.ultima_accion_at)
              const esVencido = dias > 7 && t.pelota !== 'municipio'
              const checkPendientes = t.checklist
                ? Object.values(t.checklist).filter(v => !v).length
                : 0

              return (
                <button key={t.id} onClick={() => router.push(`/tramites/${t.id}`)} style={{
                  background: DARK2, borderRadius: 14,
                  border: `1.5px solid ${esVencido ? 'rgba(248,113,113,0.3)' : BORDER}`,
                  padding: 14, textAlign: 'left', width: '100%'
                }}>
                  {/* Número + nombre */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {t.numero_p && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{t.numero_p}</span>
                    )}
                    <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff' }}>{t.nombre}</p>
                  </div>

                  {/* Domicilio + tipo */}
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>
                    {t.domicilio && `${t.domicilio} · `}{t.tramite}
                  </p>

                  {/* Parcelaria / Expediente si corresponde */}
                  {t.n_parcelaria && (
                    <span style={{ fontSize: 11, color: TEAL, marginRight: 8 }}>📍 {t.n_parcelaria}</span>
                  )}
                  {t.n_expediente && (
                    <span style={{ fontSize: 11, color: TEAL }}>📁 {t.n_expediente}</span>
                  )}

                  {/* Última nota */}
                  {t.ultima_nota && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '6px 0 0', fontStyle: 'italic' }}>
                      "{t.ultima_nota}"
                    </p>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {t.dibujante && (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>✏️ {t.dibujante}</span>
                    )}
                    {checkPendientes > 0 && (
                      <span style={{ fontSize: 11, color: '#fbbf24' }}>☐ {checkPendientes} pte{checkPendientes > 1 ? 's' : ''}</span>
                    )}
                    {esVencido && (
                      <span style={{ fontSize: 11, color: '#f87171', marginLeft: 'auto' }}>⚠ {dias}d sin mover</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── VISTA SUBESTADOS ─────────────────────────────────────────
  if (vista === 'subestados') {
    const totalResponsable = porResponsable(responsableFiltro!).length

    return (
      <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <button onClick={volver} style={{
            width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
            border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
          }}>←</button>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
              {responsableActual?.icon} {responsableActual?.label}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{totalResponsable} expedientes</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {subestados.map(sub => {
            const items = porSubestado(responsableFiltro!, sub.key)
            const v = vencidos(items)
            return (
              <button key={sub.key} onClick={() => irASubestado(sub.key)} style={{
                background: DARK2, borderRadius: 14, width: '100%',
                border: `1.5px solid ${v > 0 ? 'rgba(248,113,113,0.3)' : BORDER}`,
                padding: '14px 16px', textAlign: 'left',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{sub.icon}</span>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>{sub.label}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                      {items.length} expediente{items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {v > 0 && (
                    <span style={{ fontSize: 11, color: '#f87171', fontWeight: 700 }}>⚠ {v}</span>
                  )}
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    background: items.length > 0 ? 'rgba(251,191,36,0.15)' : 'rgba(74,222,128,0.15)',
                    color: items.length > 0 ? '#fbbf24' : '#4ade80',
                    padding: '3px 10px', borderRadius: 20
                  }}>
                    {items.length > 0 ? items.length : '✓'}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>→</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── VISTA BLOQUES PRINCIPAL ──────────────────────────────────
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
          {RESPONSABLES.map(resp => {
            const items = porResponsable(resp.key)
            const v = vencidos(items)
            return (
              <button key={resp.key} onClick={() => irAResponsable(resp.key)} style={{
                background: DARK2, borderRadius: 14, width: '100%',
                border: `1.5px solid ${v > 0 ? 'rgba(248,113,113,0.3)' : BORDER}`,
                padding: 14, textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, background: `${resp.color}22`,
                    borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                  }}>{resp.icon}</div>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: v > 0 ? 'rgba(248,113,113,0.15)' : items.length > 0 ? 'rgba(251,191,36,0.15)' : 'rgba(74,222,128,0.15)',
                    color: v > 0 ? '#f87171' : items.length > 0 ? '#fbbf24' : '#4ade80',
                    padding: '3px 9px', borderRadius: 20
                  }}>
                    {v > 0 ? `⚠ ${v}` : items.length > 0 ? items.length : '✓'}
                  </span>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>{resp.label}</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, fontWeight: 600 }}>
                  {items.length} expediente{items.length !== 1 ? 's' : ''} →
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
