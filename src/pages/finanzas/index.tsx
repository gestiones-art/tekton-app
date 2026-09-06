import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'
const CORAL = '#f0997b'
const GREEN = '#5dcaa5'

const CATEGORIAS_FIJAS = [
  { key: 'alquiler_expensas', label: 'Alquiler + expensas' },
  { key: 'internet', label: 'Internet' },
]
const CATEGORIAS_VARIABLES = [
  { key: 'ploteo', label: 'Ploteo' },
  { key: 'dibujo', label: 'Dibujo' },
  { key: 'planos', label: 'Planos' },
  { key: 'libreria', label: 'Librería' },
  { key: 'viaticos', label: 'Viáticos' },
  { key: 'otro', label: 'Otro' },
]
const TODAS_CATEGORIAS = [...CATEGORIAS_FIJAS, ...CATEGORIAS_VARIABLES]

const CONCEPTOS_COBRO = [
  { key: 'anticipo', label: 'Anticipo' },
  { key: 'segunda_cuota', label: '2da cuota' },
  { key: 'saldo', label: 'Saldo' },
  { key: 'otro', label: 'Otro' },
]

const METODOS_COBRO = [
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'efectivo', label: 'Efectivo' },
]
const METODOS_GASTO = [
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'tarjeta_personal', label: 'Tarjeta personal' },
]

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

type Tramite = { id: string, numero_p: string, nombre: string }

type Cobro = {
  id: string
  fecha: string
  tramite_id: string | null
  numero_p: string | null
  nombre_cliente: string | null
  concepto: string
  moneda: string
  monto: number
  tipo_cambio: number | null
  monto_usd: number
  metodo: string
  notas: string | null
}

type Gasto = {
  id: string
  fecha: string
  categoria: string
  tipo: string
  tramite_id: string | null
  numero_p: string | null
  moneda: string
  monto: number
  tipo_cambio: number | null
  monto_usd: number
  metodo: string
  notas: string | null
}

function labelCategoria(key: string) {
  return TODAS_CATEGORIAS.find(c => c.key === key)?.label || key
}
function labelConcepto(key: string) {
  return CONCEPTOS_COBRO.find(c => c.key === key)?.label || key
}
function labelMetodo(key: string) {
  return [...METODOS_COBRO, ...METODOS_GASTO].find(m => m.key === key)?.label || key
}
function fechaCorta(iso: string) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}
function fmtUsd(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function Finanzas() {
  const router = useRouter()
  const now = new Date()
  const [tab, setTab] = useState<'cobros' | 'gastos' | 'renta'>('cobros')
  const [mes, setMes] = useState(now.getMonth())
  const [anio, setAnio] = useState(now.getFullYear())

  const [tramites, setTramites] = useState<Tramite[]>([])
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)

  const [formCobroAbierto, setFormCobroAbierto] = useState(false)
  const [formGastoAbierto, setFormGastoAbierto] = useState(false)
  const [saving, setSaving] = useState(false)

  const [fc, setFc] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    tramite_id: '', concepto: 'anticipo', moneda: 'USD', monto: '', tipo_cambio: '', metodo: 'transferencia', notas: ''
  })
  const [fg, setFg] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    categoria: 'alquiler_expensas', tramite_id: '', moneda: 'ARS', monto: '', tipo_cambio: '', metodo: 'transferencia', notas: ''
  })

  useEffect(() => { loadTramites() }, [])
  useEffect(() => { loadMes() }, [mes, anio])

  async function loadTramites() {
    const { data } = await supabase.from('tramites').select('id, numero_p, nombre').order('numero_p', { ascending: false })
    setTramites(data || [])
  }

  function rangoMes() {
    const desde = new Date(anio, mes, 1).toISOString().slice(0, 10)
    const hasta = new Date(anio, mes + 1, 0).toISOString().slice(0, 10)
    return { desde, hasta }
  }

  async function loadMes() {
    setLoading(true)
    const { desde, hasta } = rangoMes()
    const { data: c } = await supabase.from('finanzas_cobros').select('*').gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: false })
    const { data: g } = await supabase.from('finanzas_gastos').select('*').gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: false })
    setCobros(c || [])
    setGastos(g || [])
    setLoading(false)
  }

  function calcMontoUsd(moneda: string, monto: string, tipoCambio: string) {
    const m = parseFloat(monto) || 0
    if (moneda === 'USD') return m
    const tc = parseFloat(tipoCambio) || 0
    return tc > 0 ? m / tc : 0
  }

  async function guardarCobro() {
    if (!fc.monto || (fc.moneda === 'ARS' && !fc.tipo_cambio)) return
    setSaving(true)
    const tramite = tramites.find(t => t.id === fc.tramite_id)
    const monto_usd = calcMontoUsd(fc.moneda, fc.monto, fc.tipo_cambio)
    await supabase.from('finanzas_cobros').insert({
      fecha: fc.fecha,
      tramite_id: fc.tramite_id || null,
      numero_p: tramite?.numero_p || null,
      nombre_cliente: tramite?.nombre || null,
      concepto: fc.concepto,
      moneda: fc.moneda,
      monto: parseFloat(fc.monto),
      tipo_cambio: fc.moneda === 'ARS' ? parseFloat(fc.tipo_cambio) : null,
      monto_usd,
      metodo: fc.metodo,
      notas: fc.notas || null,
    })
    setSaving(false)
    setFormCobroAbierto(false)
    setFc({ fecha: new Date().toISOString().slice(0, 10), tramite_id: '', concepto: 'anticipo', moneda: 'USD', monto: '', tipo_cambio: '', metodo: 'transferencia', notas: '' })
    loadMes()
  }

  async function guardarGasto() {
    if (!fg.monto || (fg.moneda === 'ARS' && !fg.tipo_cambio)) return
    setSaving(true)
    const esFijo = CATEGORIAS_FIJAS.some(c => c.key === fg.categoria)
    const tramite = tramites.find(t => t.id === fg.tramite_id)
    const monto_usd = calcMontoUsd(fg.moneda, fg.monto, fg.tipo_cambio)
    await supabase.from('finanzas_gastos').insert({
      fecha: fg.fecha,
      categoria: fg.categoria,
      tipo: esFijo ? 'fijo' : 'variable',
      tramite_id: fg.tramite_id || null,
      numero_p: tramite?.numero_p || null,
      moneda: fg.moneda,
      monto: parseFloat(fg.monto),
      tipo_cambio: fg.moneda === 'ARS' ? parseFloat(fg.tipo_cambio) : null,
      monto_usd,
      metodo: fg.metodo,
      notas: fg.notas || null,
    })
    setSaving(false)
    setFormGastoAbierto(false)
    setFg({ fecha: new Date().toISOString().slice(0, 10), categoria: 'alquiler_expensas', tramite_id: '', moneda: 'ARS', monto: '', tipo_cambio: '', metodo: 'transferencia', notas: '' })
    loadMes()
  }

  const totalIngresos = cobros.reduce((s, c) => s + (c.monto_usd || 0), 0)
  const totalGastos = gastos.reduce((s, g) => s + (g.monto_usd || 0), 0)
  const gastosFijos = gastos.filter(g => g.tipo === 'fijo').reduce((s, g) => s + (g.monto_usd || 0), 0)
  const gastosVariables = gastos.filter(g => g.tipo === 'variable').reduce((s, g) => s + (g.monto_usd || 0), 0)
  const neto = totalIngresos - totalGastos

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <button onClick={() => router.push('/')} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>←</button>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#fff' }}>Finanzas</p>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[
            { key: 'cobros', label: 'Cobros' },
            { key: 'gastos', label: 'Gastos' },
            { key: 'renta', label: 'Rentabilidad' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={{
              flex: 1, fontSize: 12, padding: '8px 0', borderRadius: 20,
              border: tab === t.key ? 'none' : `1px solid ${BORDER}`,
              background: tab === t.key ? TEAL : 'transparent',
              color: tab === t.key ? '#04342c' : 'rgba(255,255,255,0.6)',
              fontWeight: tab === t.key ? 600 : 400
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ flex: 1 }}>
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))} style={{ width: 90 }}>
            {[2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 40 }}>Cargando...</div>
        ) : (
          <>
            {tab === 'cobros' && (
              <>
                <button onClick={() => setFormCobroAbierto(!formCobroAbierto)} style={{
                  width: '100%', padding: 10, fontSize: 13, fontWeight: 600, marginBottom: 10,
                  background: formCobroAbierto ? 'transparent' : TEAL, color: formCobroAbierto ? 'rgba(255,255,255,0.5)' : '#04342c',
                  border: formCobroAbierto ? `1.5px solid ${BORDER}` : 'none', borderRadius: 10
                }}>{formCobroAbierto ? 'Cancelar' : '+ Cobro'}</button>

                {formCobroAbierto && (
                  <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 10, display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Fecha</label><input type="date" value={fc.fecha} onChange={e => setFc(f => ({ ...f, fecha: e.target.value }))} /></div>
                      <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Concepto</label>
                        <select value={fc.concepto} onChange={e => setFc(f => ({ ...f, concepto: e.target.value }))}>
                          {CONCEPTOS_COBRO.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Trámite (opcional)</label>
                      <select value={fc.tramite_id} onChange={e => setFc(f => ({ ...f, tramite_id: e.target.value }))}>
                        <option value="">Sin asignar</option>
                        {tramites.map(t => <option key={t.id} value={t.id}>{t.numero_p} · {t.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Moneda recibida</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['USD', 'ARS'].map(m => (
                          <button key={m} onClick={() => setFc(f => ({ ...f, moneda: m }))} style={{
                            flex: 1, fontSize: 12, padding: '6px 0', borderRadius: 20,
                            border: `1.5px solid ${fc.moneda === m ? 'rgba(45,212,176,0.4)' : BORDER}`,
                            background: fc.moneda === m ? 'rgba(45,212,176,0.15)' : 'transparent',
                            color: fc.moneda === m ? TEAL : 'rgba(255,255,255,0.5)'
                          }}>{m === 'USD' ? 'Dólar' : 'Pesos'}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: fc.moneda === 'ARS' ? '1fr 1fr' : '1fr', gap: 10 }}>
                      <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Monto ({fc.moneda === 'USD' ? 'USD' : '$'})</label><input type="number" value={fc.monto} onChange={e => setFc(f => ({ ...f, monto: e.target.value }))} placeholder="Ej: 1500" /></div>
                      {fc.moneda === 'ARS' && (
                        <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>TC blue venta del día</label><input type="number" value={fc.tipo_cambio} onChange={e => setFc(f => ({ ...f, tipo_cambio: e.target.value }))} placeholder="Ej: 1500" /></div>
                      )}
                    </div>
                    {fc.moneda === 'ARS' && fc.monto && fc.tipo_cambio && (
                      <p style={{ fontSize: 12, color: TEAL, margin: 0 }}>≈ USD {fmtUsd(calcMontoUsd('ARS', fc.monto, fc.tipo_cambio))}</p>
                    )}
                    <div>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Método</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {METODOS_COBRO.map(m => (
                          <button key={m.key} onClick={() => setFc(f => ({ ...f, metodo: m.key }))} style={{
                            flex: 1, fontSize: 12, padding: '6px 0', borderRadius: 20,
                            border: `1.5px solid ${fc.metodo === m.key ? 'rgba(45,212,176,0.4)' : BORDER}`,
                            background: fc.metodo === m.key ? 'rgba(45,212,176,0.15)' : 'transparent',
                            color: fc.metodo === m.key ? TEAL : 'rgba(255,255,255,0.5)'
                          }}>{m.label}</button>
                        ))}
                      </div>
                    </div>
                    <button onClick={guardarCobro} disabled={saving} style={{ padding: 10, fontSize: 13, fontWeight: 600, background: TEAL, color: '#1a2332', border: 'none', borderRadius: 10 }}>{saving ? 'Guardando...' : 'Guardar cobro'}</button>
                  </div>
                )}

                {cobros.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 20 }}>Sin cobros este mes</p>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {cobros.map(c => (
                      <div key={c.id} style={{ background: DARK2, borderRadius: 10, padding: '10px 12px', border: `1px solid ${BORDER}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: '#fff' }}>{c.numero_p ? `${c.numero_p} · ` : ''}{c.nombre_cliente || 'Sin trámite'}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>USD {fmtUsd(c.monto_usd)}</span>
                        </div>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>
                          {labelConcepto(c.concepto)} · {fechaCorta(c.fecha)} · {labelMetodo(c.metodo)} {c.moneda === 'ARS' ? `$ (TC ${c.tipo_cambio})` : 'USD'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'gastos' && (
              <>
                <button onClick={() => setFormGastoAbierto(!formGastoAbierto)} style={{
                  width: '100%', padding: 10, fontSize: 13, fontWeight: 600, marginBottom: 10,
                  background: formGastoAbierto ? 'transparent' : TEAL, color: formGastoAbierto ? 'rgba(255,255,255,0.5)' : '#04342c',
                  border: formGastoAbierto ? `1.5px solid ${BORDER}` : 'none', borderRadius: 10
                }}>{formGastoAbierto ? 'Cancelar' : '+ Gasto'}</button>

                {formGastoAbierto && (
                  <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 14, marginBottom: 10, display: 'grid', gap: 10 }}>
                    <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Fecha</label><input type="date" value={fg.fecha} onChange={e => setFg(f => ({ ...f, fecha: e.target.value }))} /></div>
                    <div>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Categoría</label>
                      <select value={fg.categoria} onChange={e => setFg(f => ({ ...f, categoria: e.target.value }))}>
                        <optgroup label="Fijos">{CATEGORIAS_FIJAS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</optgroup>
                        <optgroup label="Variables">{CATEGORIAS_VARIABLES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</optgroup>
                      </select>
                    </div>
                    {CATEGORIAS_VARIABLES.some(c => c.key === fg.categoria) && (
                      <div>
                        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Trámite (opcional)</label>
                        <select value={fg.tramite_id} onChange={e => setFg(f => ({ ...f, tramite_id: e.target.value }))}>
                          <option value="">Sin asignar</option>
                          {tramites.map(t => <option key={t.id} value={t.id}>{t.numero_p} · {t.nombre}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Moneda</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['ARS', 'USD'].map(m => (
                          <button key={m} onClick={() => setFg(f => ({ ...f, moneda: m }))} style={{
                            flex: 1, fontSize: 12, padding: '6px 0', borderRadius: 20,
                            border: `1.5px solid ${fg.moneda === m ? 'rgba(45,212,176,0.4)' : BORDER}`,
                            background: fg.moneda === m ? 'rgba(45,212,176,0.15)' : 'transparent',
                            color: fg.moneda === m ? TEAL : 'rgba(255,255,255,0.5)'
                          }}>{m === 'USD' ? 'Dólar' : 'Pesos'}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: fg.moneda === 'ARS' ? '1fr 1fr' : '1fr', gap: 10 }}>
                      <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Monto ({fg.moneda === 'USD' ? 'USD' : '$'})</label><input type="number" value={fg.monto} onChange={e => setFg(f => ({ ...f, monto: e.target.value }))} placeholder="Ej: 45000" /></div>
                      {fg.moneda === 'ARS' && (
                        <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>TC del día</label><input type="number" value={fg.tipo_cambio} onChange={e => setFg(f => ({ ...f, tipo_cambio: e.target.value }))} placeholder="Ej: 1400" /></div>
                      )}
                    </div>
                    {fg.moneda === 'ARS' && fg.monto && fg.tipo_cambio && (
                      <p style={{ fontSize: 12, color: CORAL, margin: 0 }}>≈ USD {fmtUsd(calcMontoUsd('ARS', fg.monto, fg.tipo_cambio))}</p>
                    )}
                    <div>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Método de pago</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {METODOS_GASTO.map(m => (
                          <button key={m.key} onClick={() => setFg(f => ({ ...f, metodo: m.key }))} style={{
                            fontSize: 12, padding: '6px 12px', borderRadius: 20,
                            border: `1.5px solid ${fg.metodo === m.key ? 'rgba(45,212,176,0.4)' : BORDER}`,
                            background: fg.metodo === m.key ? 'rgba(45,212,176,0.15)' : 'transparent',
                            color: fg.metodo === m.key ? TEAL : 'rgba(255,255,255,0.5)'
                          }}>{m.label}</button>
                        ))}
                      </div>
                    </div>
                    <button onClick={guardarGasto} disabled={saving} style={{ padding: 10, fontSize: 13, fontWeight: 600, background: TEAL, color: '#1a2332', border: 'none', borderRadius: 10 }}>{saving ? 'Guardando...' : 'Guardar gasto'}</button>
                  </div>
                )}

                {gastos.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 20 }}>Sin gastos este mes</p>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {gastos.map(g => (
                      <div key={g.id} style={{ background: DARK2, borderRadius: 10, padding: '10px 12px', border: `1px solid ${BORDER}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: '#fff' }}>{labelCategoria(g.categoria)}{g.numero_p ? ` — ${g.numero_p}` : ''}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: CORAL }}>USD {fmtUsd(g.monto_usd)}</span>
                        </div>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>
                          {g.tipo === 'fijo' ? 'Fijo' : 'Variable'} · {fechaCorta(g.fecha)} · {labelMetodo(g.metodo)} {g.moneda === 'ARS' ? `$ (TC ${g.tipo_cambio})` : 'USD'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'renta' && (
              <>
                <div style={{ background: '#0f6e56', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <p style={{ fontSize: 11, color: '#9fe1cb', margin: '0 0 4px' }}>Rentabilidad neta</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>USD {fmtUsd(neto)}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div style={{ background: DARK2, borderRadius: 10, padding: 10 }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Ingresos</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: GREEN, margin: 0 }}>USD {fmtUsd(totalIngresos)}</p>
                  </div>
                  <div style={{ background: DARK2, borderRadius: 10, padding: 10 }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Gastos</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: CORAL, margin: 0 }}>USD {fmtUsd(totalGastos)}</p>
                  </div>
                </div>
                <div style={{ background: DARK2, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Gastos fijos</span>
                    <span style={{ fontSize: 12, color: '#fff' }}>USD {fmtUsd(gastosFijos)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Gastos variables</span>
                    <span style={{ fontSize: 12, color: '#fff' }}>USD {fmtUsd(gastosVariables)}</span>
                  </div>
                </div>
                {cobros.length === 0 && gastos.length === 0 && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 16 }}>Sin movimientos cargados este mes</p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
