import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function primerDia(mes: number, anio: number) {
  return new Date(anio, mes, 1).toISOString()
}

function ultimoDia(mes: number, anio: number) {
  return new Date(anio, mes + 1, 0, 23, 59, 59).toISOString()
}

type Consulta = {
  id: string
  numero_p: string
  nombre: string
  municipio: string
  tramite: string
  estado: string
  monto_usd: number
  created_at: string
  enviado_at: string
}

type Tramite = {
  id: string
  numero_p: string
  nombre: string
  municipio: string
  tramite: string
  pelota: string
  created_at: string
  finalizado_at: string
}

export default function Estadisticas() {
  const router = useRouter()
  const now = new Date()
  const [desdeAnio, setDesdeAnio] = useState(now.getFullYear())
  const [desdeMes, setDesdeMes] = useState(now.getMonth())
  const [hastaAnio, setHastaAnio] = useState(now.getFullYear())
  const [hastaMes, setHastaMes] = useState(now.getMonth())
  const [loading, setLoading] = useState(false)
  const [detalleAbierto, setDetalleAbierto] = useState<string | null>(null)

  const [consultasNuevas, setConsultasNuevas] = useState<Consulta[]>([])
  const [enviados, setEnviados] = useState<Consulta[]>([])
  const [tramitesActivos, setTramitesActivos] = useState<Tramite[]>([])
  const [tramitesFinalizados, setTramitesFinalizados] = useState<Tramite[]>([])

  useEffect(() => { calcular() }, [desdeMes, desdeAnio, hastaMes, hastaAnio])

  async function calcular() {
    setLoading(true)
    setDetalleAbierto(null)
    const desde = primerDia(desdeMes, desdeAnio)
    const hasta = ultimoDia(hastaMes, hastaAnio)

    const { data: c } = await supabase
      .from('consultas')
      .select('id, numero_p, nombre, municipio, tramite, estado, monto_usd, created_at, enviado_at')
      .gte('created_at', desde)
      .lte('created_at', hasta)

    const { data: e } = await supabase
      .from('consultas')
      .select('id, numero_p, nombre, municipio, tramite, estado, monto_usd, created_at, enviado_at')
      .gte('enviado_at', desde)
      .lte('enviado_at', hasta)
      .not('enviado_at', 'is', null)

    // FIX: en_pausa NO es una columna — es un valor dentro del campo de texto estado_actual.
    // El filtro correcto excluye finalizado=true Y estado_actual='en_pausa'.
    const { data: ta, error: errorTa } = await supabase
      .from('tramites')
      .select('id, numero_p, nombre, municipio, tramite, pelota, created_at, finalizado_at')
      .eq('finalizado', false)
      .neq('estado_actual', 'en_pausa')

    if (errorTa) {
      console.error('Error consultando tramitesActivos:', errorTa)
    }

    const { data: tf } = await supabase
      .from('tramites')
      .select('id, numero_p, nombre, municipio, tramite, pelota, created_at, finalizado_at')
      .eq('finalizado', true)
      .gte('finalizado_at', desde)
      .lte('finalizado_at', hasta)

    setConsultasNuevas(c || [])
    setEnviados(e || [])
    setTramitesActivos(ta || [])
    setTramitesFinalizados(tf || [])
    setLoading(false)
  }

  const aceptados = enviados.filter(x => x.estado === 'aceptado')
  const rechazados = enviados.filter(x => x.estado === 'rechazado')
  const vigentes = enviados.filter(x => x.estado === 'enviado')
  const monto_aceptados = aceptados.reduce((s, x) => s + (x.monto_usd || 0), 0)
  const monto_vigentes = vigentes.reduce((s, x) => s + (x.monto_usd || 0), 0)
  const porcentaje_cierre = enviados.length > 0 ? Math.round((aceptados.length / enviados.length) * 100) : 0

  const duracion_promedio = tramitesFinalizados.length > 0
    ? Math.round(tramitesFinalizados
        .filter(t => t.created_at && t.finalizado_at)
        .map(t => Math.round((new Date(t.finalizado_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24)))
        .reduce((a, b) => a + b, 0) / tramitesFinalizados.length)
    : null

  const anios = [2024, 2025, 2026, 2027]

  const labelResp: Record<string, string> = {
    admin: 'Adm/Comercial', tecnica: 'Técnica', municipio: 'Municipio', cliente: 'Cliente'
  }
  const colorResp: Record<string, string> = {
    admin: '#3b82f6', tecnica: '#f97316', municipio: TEAL, cliente: '#8b5cf6'
  }

  function toggleDetalle(key: string) {
    setDetalleAbierto(detalleAbierto === key ? null : key)
  }

  function ListaConsultas({ items }: { items: Consulta[] }) {
    if (items.length === 0) return <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '8px 0', margin: 0 }}>Sin registros</p>
    return (
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        {items.map(c => (
          <button key={c.id} onClick={() => router.push(`/consultas/${c.id}`)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: '8px 12px', textAlign: 'left', width: '100%'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: TEAL }}>{c.numero_p}</span>
                <span style={{ fontSize: 13, color: '#fff' }}>{c.nombre}</span>
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{c.tramite} · {c.municipio}</span>
            </div>
            {c.monto_usd > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80', flexShrink: 0, marginLeft: 8 }}>USD {c.monto_usd}</span>}
          </button>
        ))}
      </div>
    )
  }

  function ListaTramites({ items }: { items: Tramite[] }) {
    if (items.length === 0) return <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '8px 0', margin: 0 }}>Sin registros</p>
    return (
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        {items.map(t => (
          <button key={t.id} onClick={() => router.push(`/tramites/${t.id}`)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: '8px 12px', textAlign: 'left', width: '100%'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: TEAL }}>{t.numero_p}</span>
                <span style={{ fontSize: 13, color: '#fff' }}>{t.nombre}</span>
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{t.tramite} · {t.municipio}</span>
            </div>
            {t.pelota && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginLeft: 8 }}>{labelResp[t.pelota] || t.pelota}</span>}
          </button>
        ))}
      </div>
    )
  }

  function MetricCard({ label, value, color, detalleKey, count }: { label: string, value: string | number, color: string, detalleKey?: string, count?: number }) {
    const clickable = detalleKey && (count ?? 0) > 0
    const abierto = detalleAbierto === detalleKey
    return (
      <div
        onClick={() => clickable && toggleDetalle(detalleKey!)}
        style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px',
          cursor: clickable ? 'pointer' : 'default',
          border: abierto ? `1.5px solid ${color}40` : '1.5px solid transparent',
          transition: 'border 0.15s'
        }}
      >
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 6px' }}>{label}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
          {clickable && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{abierto ? '↑' : '↓'}</span>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', width: '100%', maxWidth: 480 }}>
        <button onClick={() => router.push('/')} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#fff' }}>Estadísticas</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Rendimiento comercial y operativo</p>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 480, display: 'grid', gap: 12 }}>

        {/* PERÍODO */}
        <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>Período</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Desde</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={desdeMes} onChange={e => setDesdeMes(Number(e.target.value))} style={{ flex: 1 }}>
                  {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={desdeAnio} onChange={e => setDesdeAnio(Number(e.target.value))} style={{ width: 72 }}>
                  {anios.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Hasta</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={hastaMes} onChange={e => setHastaMes(Number(e.target.value))} style={{ flex: 1 }}>
                  {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={hastaAnio} onChange={e => setHastaAnio(Number(e.target.value))} style={{ width: 72 }}>
                  {anios.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Este mes', desde: { m: now.getMonth(), a: now.getFullYear() }, hasta: { m: now.getMonth(), a: now.getFullYear() } },
              { label: 'Último trimestre', desde: { m: (now.getMonth() - 2 + 12) % 12, a: now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear() }, hasta: { m: now.getMonth(), a: now.getFullYear() } },
              { label: 'Este año', desde: { m: 0, a: now.getFullYear() }, hasta: { m: 11, a: now.getFullYear() } },
            ].map(p => (
              <button key={p.label} onClick={() => { setDesdeMes(p.desde.m); setDesdeAnio(p.desde.a); setHastaMes(p.hasta.m); setHastaAnio(p.hasta.a) }} style={{
                fontSize: 11, padding: '5px 12px', borderRadius: 20,
                border: '1.5px solid rgba(45,212,176,0.3)', background: 'rgba(45,212,176,0.08)', color: TEAL
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>Calculando...</div>
        ) : (<>

          {/* CONSULTAS Y PRESUPUESTOS */}
          <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>Consultas y presupuestos</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <MetricCard label="Consultas nuevas" value={consultasNuevas.length} color="rgba(255,255,255,0.7)" detalleKey="nuevas" count={consultasNuevas.length} />
              <MetricCard label="Presupuestos enviados" value={enviados.length} color="#60a5fa" detalleKey="enviados" count={enviados.length} />
              <MetricCard label="Aceptados" value={aceptados.length} color="#4ade80" detalleKey="aceptados" count={aceptados.length} />
              <MetricCard label="Rechazados" value={rechazados.length} color="#f87171" detalleKey="rechazados" count={rechazados.length} />
              <MetricCard label="Vigentes (sin respuesta)" value={vigentes.length} color="#fbbf24" detalleKey="vigentes" count={vigentes.length} />
              <MetricCard label="% de cierre" value={`${porcentaje_cierre}%`} color={porcentaje_cierre >= 50 ? '#4ade80' : '#fbbf24'} />
            </div>

            {detalleAbierto === 'nuevas' && <ListaConsultas items={consultasNuevas} />}
            {detalleAbierto === 'enviados' && <ListaConsultas items={enviados} />}
            {detalleAbierto === 'aceptados' && <ListaConsultas items={aceptados} />}
            {detalleAbierto === 'rechazados' && <ListaConsultas items={rechazados} />}
            {detalleAbierto === 'vigentes' && <ListaConsultas items={vigentes} />}
          </div>

          {/* MONTOS */}
          <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>Facturación estimada</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <MetricCard label="Facturado (aceptados)" value={`USD ${monto_aceptados.toLocaleString('es-AR')}`} color="#4ade80" />
              <MetricCard label="Potencial (vigentes)" value={`USD ${monto_vigentes.toLocaleString('es-AR')}`} color="#fbbf24" />
            </div>
          </div>

          {/* TRÁMITES */}
          <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>Trámites</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <MetricCard label="Activos totales" value={tramitesActivos.length} color={TEAL} detalleKey="activos" count={tramitesActivos.length} />
              <MetricCard label="Finalizados en período" value={tramitesFinalizados.length} color="#4ade80" detalleKey="finalizados" count={tramitesFinalizados.length} />
              {duracion_promedio !== null && (
                <MetricCard label="Duración promedio" value={`${duracion_promedio} días`} color="#a78bfa" />
              )}
            </div>

            {detalleAbierto === 'activos' && <ListaTramites items={tramitesActivos} />}
            {detalleAbierto === 'finalizados' && <ListaTramites items={tramitesFinalizados} />}

            {tramitesActivos.length > 0 && detalleAbierto !== 'activos' && detalleAbierto !== 'finalizados' && (
              <>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '4px 0 8px' }}>Activos por responsable</p>
                <div style={{ display: 'grid', gap: 6 }}>
                  {Object.entries(
                    tramitesActivos.reduce((acc, t) => {
                      const r = t.pelota || 'admin'
                      acc[r] = (acc[r] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1]).map(([resp, cant]) => (
                    <div key={resp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: colorResp[resp] || '#888' }} />
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{labelResp[resp] || resp}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: colorResp[resp] || '#888' }}>{cant}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </>)}
      </div>
    </div>
  )
}
