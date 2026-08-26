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

type Consulta = {
  id: string
  numero_p: string
  nombre: string
  municipio: string
  tramite: string
  estado: string
  created_at: string
}

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
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Tramite[]>([])
  const [buscando, setBuscando] = useState(false)

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
      .eq('finalizado', false)
      .not('estado_actual', 'eq', 'en_pausa')
      .order('ultima_accion_at', { ascending: true })

    const { data: cons } = await supabase
      .from('consultas')
      .select('id, numero_p, nombre, municipio, tramite, estado, created_at')
      .in('estado', ['pendiente', 'pendiente_validacion', 'pdte_enviar', 'enviado'])

    setTramites(tr || [])
    setConsultas(cons || [])
    setLoading(false)
  }

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
            {/* ACCESOS RAPIDOS — simplificado: sin Cobranza, sin Trámites (redundante con Todo) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <button onClick={() => router.push('/todo')} style={{ background: DARK2, borderRadius: 12, border: `1.5px solid ${BORDER}`, padding: 12, textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#fff' }}>🗂️ Todo</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Vista única con filtros</p>
              </button>
              <button onClick={() => router.push('/pendientes')} style={{ background: DARK2, borderRadius: 12, border: `1.5px solid ${BORDER}`, padding: 12, textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#fff' }}>📥 Pendientes</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Bandeja por responsable</p>
              </button>
              <button onClick={() => router.push('/consultas')} style={{ background: DARK2, borderRadius: 12, border: `1.5px solid ${BORDER}`, padding: 12, textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#fff' }}>📋 Consultas</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{consultas.length} activas</p>
              </button>
              <button onClick={() => router.push('/estadisticas')} style={{ background: DARK2, borderRadius: 12, border: `1.5px solid ${BORDER}`, padding: 12, textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#fff' }}>📊 Estadísticas</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Rendimiento</p>
              </button>
              <button onClick={() => router.push('/exportar')} style={{ background: DARK2, borderRadius: 12, border: `1.5px solid ${BORDER}`, padding: 12, textAlign: 'left', gridColumn: '1 / -1' }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#fff' }}>⬇ Exportar</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Backup en Excel</p>
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
