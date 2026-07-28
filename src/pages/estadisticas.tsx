import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function getMesAnio(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return { mes: d.getMonth(), anio: d.getFullYear() }
}

function primerDia(mes: number, anio: number) {
  return new Date(anio, mes, 1).toISOString()
}

function ultimoDia(mes: number, anio: number) {
  return new Date(anio, mes + 1, 0, 23, 59, 59).toISOString()
}

type Stats = {
  consultas_nuevas: number
  presupuestos_enviados: number
  aceptados: number
  rechazados: number
  vigentes: number
  monto_aceptados: number
  monto_vigentes: number
  porcentaje_cierre: number
  tramites_activos: number
  tramites_finalizados: number
  duracion_promedio_dias: number | null
  por_responsable: Record<string, number>
}

export default function Estadisticas() {
  const router = useRouter()
  const now = new Date()
  const [desdeAnio, setDesdeAnio] = useState(now.getFullYear())
  const [desdeMes, setDesdeMes] = useState(0) // enero
  const [hastaAnio, setHastaAnio] = useState(now.getFullYear())
  const [hastaMes, setHastaMes] = useState(now.getMonth())
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => { calcular() }, [desdeMes, desdeAnio, hastaMes, hastaAnio])

  async function calcular() {
    setLoading(true)
    const desde = primerDia(desdeMes, desdeAnio)
    const hasta = ultimoDia(hastaMes, hastaAnio)

    // Consultas nuevas en el período
    const { data: consultas } = await supabase
      .from('consultas')
      .select('estado, monto_usd, created_at, enviado_at')
      .gte('created_at', desde)
      .lte('created_at', hasta)

    // Presupuestos enviados en el período (por fecha de envío)
    const { data: enviados } = await supabase
      .from('consultas')
      .select('estado, monto_usd, enviado_at')
      .gte('enviado_at', desde)
      .lte('enviado_at', hasta)
      .not('enviado_at', 'is', null)

    // Trámites activos totales
    const { data: tramitesActivos } = await supabase
      .from('tramites')
      .select('pelota')
      .eq('finalizado', false)

    // Trámites finalizados en el período
    const { data: tramitesFinalizados } = await supabase
      .from('tramites')
      .select('created_at, finalizado_at')
      .eq('finalizado', true)
      .gte('finalizado_at', desde)
      .lte('finalizado_at', hasta)

    const c = consultas || []
    const e = enviados || []
    const ta = tramitesActivos || []
    const tf = tramitesFinalizados || []

    const aceptados = e.filter(x => x.estado === 'aceptado')
    const rechazados = e.filter(x => x.estado === 'rechazado')
    const vigentes = e.filter(x => x.estado === 'enviado')

    const monto_aceptados = aceptados.reduce((s, x) => s + (x.monto_usd || 0), 0)
    const monto_vigentes = vigentes.reduce((s, x) => s + (x.monto_usd || 0), 0)
    const porcentaje_cierre = e.length > 0 ? Math.round((aceptados.length / e.length) * 100) : 0

    // Duración promedio finalizados
    let duracion_promedio_dias: number | null = null
    if (tf.length > 0) {
      const dias = tf
        .filter(t => t.created_at && t.finalizado_at)
        .map(t => Math.round((new Date(t.finalizado_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24)))
      if (dias.length > 0) duracion_promedio_dias = Math.round(dias.reduce((a, b) => a + b, 0) / dias.length)
    }

    // Por responsable
    const por_responsable: Record<string, number> = {}
    ta.forEach(t => {
      const r = t.pelota || 'admin'
      por_responsable[r] = (por_responsable[r] || 0) + 1
    })

    setStats({
      consultas_nuevas: c.length,
      presupuestos_enviados: e.length,
      aceptados: aceptados.length,
      rechazados: rechazados.length,
      vigentes: vigentes.length,
      monto_aceptados,
      monto_vigentes,
      porcentaje_cierre,
      tramites_activos: ta.length,
      tramites_finalizados: tf.length,
      duracion_promedio_dias,
      por_responsable,
    })
    setLoading(false)
  }

  const anios = [2024, 2025, 2026, 2027]

  const labelResp: Record<string, string> = {
    admin: 'Adm/Comercial', tecnica: 'Técnica', municipio: 'Municipio', cliente: 'Cliente'
  }
  const colorResp: Record<string, string> = {
    admin: '#3b82f6', tecnica: '#f97316', municipio: TEAL, cliente: '#8b5cf6'
  }

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', width: '100%', maxWidth: 480 }}>
        <button onClick={() => router.push('/')} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#fff' }}>Estadísticas</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Rendimiento comercial y operativo</p>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 480, display: 'grid', gap: 12 }}>

        {/* SELECTOR DE PERÍODO */}
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
                border: `1.5px solid rgba(45,212,176,0.3)`, background: 'rgba(45,212,176,0.08)',
                color: TEAL
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>Calculando...</div>
        ) : stats ? (<>

          {/* CONSULTAS Y PRESUPUESTOS */}
          <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>Consultas y presupuestos</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Metric label="Consultas nuevas" value={stats.consultas_nuevas} color="rgba(255,255,255,0.7)" />
              <Metric label="Presupuestos enviados" value={stats.presupuestos_enviados} color="#60a5fa" />
              <Metric label="Aceptados" value={stats.aceptados} color="#4ade80" />
              <Metric label="Rechazados" value={stats.rechazados} color="#f87171" />
              <Metric label="Vigentes (sin respuesta)" value={stats.vigentes} color="#fbbf24" />
              <Metric label="% de cierre" value={`${stats.porcentaje_cierre}%`} color={stats.porcentaje_cierre >= 50 ? '#4ade80' : '#fbbf24'} />
            </div>
          </div>

          {/* MONTOS */}
          <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>Facturación estimada</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Metric label="Facturado (aceptados)" value={`USD ${stats.monto_aceptados.toLocaleString('es-AR')}`} color="#4ade80" />
              <Metric label="Potencial (vigentes)" value={`USD ${stats.monto_vigentes.toLocaleString('es-AR')}`} color="#fbbf24" />
            </div>
          </div>

          {/* TRÁMITES */}
          <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>Trámites</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <Metric label="Activos totales" value={stats.tramites_activos} color={TEAL} />
              <Metric label="Finalizados en período" value={stats.tramites_finalizados} color="#4ade80" />
              {stats.duracion_promedio_dias !== null && (
                <Metric label="Duración promedio" value={`${stats.duracion_promedio_dias} días`} color="#a78bfa" />
              )}
            </div>
            {Object.keys(stats.por_responsable).length > 0 && (
              <>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '0 0 8px' }}>Activos por responsable</p>
                <div style={{ display: 'grid', gap: 6 }}>
                  {Object.entries(stats.por_responsable).sort((a, b) => b[1] - a[1]).map(([resp, cant]) => (
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

        </>) : null}
      </div>
    </div>
  )
}

function Metric({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px' }}>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
    </div>
  )
}
