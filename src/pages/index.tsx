import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

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
  n_parcelaria: string
  n_expediente: string
}

const RESPONSABLES = [
  { key: 'admin', label: 'Ptes. Adm/Comercial', color: '#3b82f6', icon: '🔵' },
  { key: 'tecnica', label: 'Ptes. Técnica', color: '#f97316', icon: '🟠' },
  { key: 'dibujante', label: 'Ptes. Dibujante', color: '#fbbf24', icon: '🟡' },
  { key: 'municipio', label: 'En Municipio', color: TEAL, icon: '🟢' },
  { key: 'cliente', label: 'En Cliente', color: '#a78bfa', icon: '🟣' },
]

const ESTADO_LABEL: Record<string, string> = {
  en_dibujo: '✏️ En dibujo',
  listo_para_presentar: '✅ Listo para presentar',
  presentado_catastro: '📤 Inicio Catastro',
  observado_catastro: '🔴 Correc. Catastro',
  ok_catastro: '✅ OK Catastro',
  presentado_obras: '🏠 Obras Particulares',
  observado_obras: '🔴 Correc. Obras Part.',
  primer_visado: '📋 Primer visado',
  correc_visado: '🔴 Correc. Visado',
  pendiente_derechos: '💰 Pendiente derechos',
  pendiente_colegio: '🎓 Pendiente colegio',
  en_pausa: '⏸️ En pausa',
}

export default function Home() {
  const router = useRouter()
  const [tramites, setTramites] = useState<Tramite[]>([])
  const [consultas_pte, setConsultasPte] = useState(0)
  const [presupuestos_pte, setPresupuestosPte] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Tramite[]>([])
  const [buscando, setBuscando] = useState(false)
  const [bloqueAbierto, setBloqueAbierto] = useState<string | null>(null)

  const now = new Date()
  const fecha = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (busqueda.length < 2) { setResultados([]); return }
    const timer = setTimeout(() => buscar(), 400)
    return () => clearTimeout(timer)
  }, [busqueda])

  async function buscar() {
    setBuscando(true)
    const { data } = await supabase
      .from('tramites')
      .select('id, numero_p, nombre, domicilio, municipio, tramite, estado_actual, n_parcelaria, n_expediente, pelota, ultima_nota, ultima_accion_at')
      .or(`n_expediente.ilike.%${busqueda}%,n_parcelaria.ilike.%${busqueda}%,nombre.ilike.%${busqueda}%,numero_p.ilike.%${busqueda}%`)
      .limit(5)
    setResultados(data || [])
    setBuscando(false)
  }

  async function loadData() {
    const { data: tr } = await supabase
      .from('tramites')
      .select('*')
      .not('estado_actual', 'eq', 'finalizado')
      .order('ultima_accion_at', { ascending: true })

    const { data: consultas } = await supabase
      .from('consultas')
      .select('id')
      .eq('estado', 'pendiente_validacion')

    const { data: presupuestos } = await supabase
      .from('presupuestos')
      .select('id')
      .eq('estado', 'enviado')

    setTramites(tr || [])
    setConsultasPte(consultas?.length || 0)
    setPresupuestosPte(presupuestos?.length || 0)
    setLoading(false)
  }

  const porResponsable = (key: string) => tramites.filter(t => t.pelota === key)

  const diasSinMover = (fecha: string) => Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
          <div style={{ width: 36, height: 36, background: TEAL, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#1a2332', fontSize: 16, fontWeight: 800 }}>T</span>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Estudio Tekton</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, textTransform: 'capitalize' }}>{fecha}</p>
          </div>
        </div>

        {/* BUSCADOR */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="🔎 Buscar por exp., parcelaria, cliente o P..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: DARK2, border: `1.5px solid ${busqueda ? 'rgba(45,212,176,0.4)' : BORDER}`, color: '#fff', fontSize: 14, boxSizing: 'border-box' as const }}
          />
          {busqueda.length > 0 && (
            <button onClick={() => { setBusqueda(''); setResultados([]) }} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 16, cursor: 'pointer' }}>✕</button>
          )}
          {(resultados.length > 0 || buscando) && (
            <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 100, background: '#1a2332', border: `1.5px solid rgba(45,212,176,0.3)`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              {buscando ? (
                <div style={{ padding: 14, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Buscando...</div>
              ) : resultados.map(t => (
                <button key={t.id} onClick={() => { router.push(`/tramites/${t.id}`); setBusqueda(''); setResultados([]) }} style={{ width: '100%', padding: '12px 14px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{t.numero_p}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{t.nombre}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    {t.n_expediente && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Exp: {t.n_expediente}</span>}
                    {t.n_parcelaria && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Parc: {t.n_parcelaria}</span>}
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{ESTADO_LABEL[t.estado_actual] || t.estado_actual}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>Cargando...</div>
        ) : (
          <>
            {/* CONSULTAS Y PRESUPUESTOS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <button onClick={() => router.push('/validar')} style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${consultas_pte > 0 ? 'rgba(248,113,113,0.3)' : BORDER}`, padding: 14, textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px', color: '#fff' }}>🔍 Validar</p>
                <p style={{ fontSize: 22, fontWeight: 800, margin: '0 0 2px', color: consultas_pte > 0 ? '#f87171' : '#4ade80' }}>{consultas_pte}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>consultas ptes.</p>
              </button>
              <button onClick={() => router.push('/presupuestos')} style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${presupuestos_pte > 0 ? 'rgba(251,191,36,0.3)' : BORDER}`, padding: 14, textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px', color: '#fff' }}>📄 Presupuestos</p>
                <p style={{ fontSize: 22, fontWeight: 800, margin: '0 0 2px', color: presupuestos_pte > 0 ? '#fbbf24' : '#4ade80' }}>{presupuestos_pte}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>enviados sin resp.</p>
              </button>
            </div>

            {/* BLOQUES POR RESPONSABLE */}
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 10px' }}>Trámites en curso</p>
            <div style={{ display: 'grid', gap: 8, marginBottom: '1.5rem' }}>
              {RESPONSABLES.map(resp => {
                const items = porResponsable(resp.key)
                const vencidos = items.filter(t => diasSinMover(t.ultima_accion_at) > 7).length
                const abierto = bloqueAbierto === resp.key

                return (
                  <div key={resp.key} style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${vencidos > 0 ? 'rgba(248,113,113,0.2)' : BORDER}`, overflow: 'hidden' }}>
                    <button onClick={() => setBloqueAbierto(abierto ? null : resp.key)} style={{
                      width: '100%', padding: '14px 16px', textAlign: 'left', background: 'transparent', border: 'none',
                      display: 'flex', alignItems: 'center', gap: 12
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: resp.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#fff' }}>{resp.label}</p>
                        {vencidos > 0 && <p style={{ fontSize: 11, color: '#f87171', margin: 0 }}>⚠ {vencidos} sin mover hace +7 días</p>}
                      </div>
                      <span style={{
                        fontSize: 20, fontWeight: 800,
                        color: items.length > 0 ? resp.color : 'rgba(255,255,255,0.2)'
                      }}>{items.length}</span>
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>{abierto ? '↑' : '↓'}</span>
                    </button>

                    {abierto && (
                      <div style={{ borderTop: `1px solid ${BORDER}` }}>
                        {items.length === 0 ? (
                          <p style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Sin pendientes ✓</p>
                        ) : (
                          items.map(t => {
                            const dias = diasSinMover(t.ultima_accion_at)
                            return (
                              <button key={t.id} onClick={() => router.push(`/tramites/${t.id}`)} style={{
                                width: '100%', padding: '12px 16px', textAlign: 'left',
                                background: 'transparent', border: 'none', borderBottom: `1px solid ${BORDER}`
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: TEAL }}>{t.numero_p}</span>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{t.nombre}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{ESTADO_LABEL[t.estado_actual] || t.estado_actual?.replace(/_/g, ' ')}</span>
                                  {t.ultima_nota && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>· "{t.ultima_nota}"</span>}
                                  {dias > 7 && <span style={{ fontSize: 10, color: '#f87171', marginLeft: 'auto' }}>⚠ {dias}d</span>}
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ACCESOS RAPIDOS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <button onClick={() => router.push('/tramites')} style={{ background: DARK2, borderRadius: 12, border: `1.5px solid ${BORDER}`, padding: 12, textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#fff' }}>📋 Todos los trámites</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{tramites.length} activos</p>
              </button>
              <button onClick={() => router.push('/cobranza')} style={{ background: DARK2, borderRadius: 12, border: `1.5px solid ${BORDER}`, padding: 12, textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#fff' }}>💰 Cobranza</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Saldos pendientes</p>
              </button>
            </div>

            <button onClick={() => router.push('/consultas/nueva')} style={{
              width: '100%', padding: 14, fontSize: 15, fontWeight: 700,
              background: TEAL, color: '#1a2332', border: 'none', borderRadius: 14
            }}>+ Nueva consulta</button>
          </>
        )}
      </div>
    </div>
  )
}
