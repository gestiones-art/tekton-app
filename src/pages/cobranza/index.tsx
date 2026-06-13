import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

type Cobro = {
  id: string
  tramite_id: string
  numero_p: string
  nombre: string
  tipo: string
  monto_usd: number
  monto_pesos: number
  tipo_cambio: number
  forma_cobro: string
  estado: string
  cobrado_at: string
  factura: string
  created_at: string
}

const TIPO_LABEL: Record<string, { label: string, color: string }> = {
  anticipo: { label: 'Anticipo', color: '#fbbf24' },
  segunda_cuota: { label: '2da cuota', color: '#a78bfa' },
  saldo: { label: 'Saldo', color: TEAL },
}

export default function Cobranza() {
  const router = useRouter()
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendientes')
  const [showRegistrar, setShowRegistrar] = useState<Cobro | null>(null)
  const [formCobro, setFormCobro] = useState({ forma: 'efectivo_usd', tipo_cambio: '', factura: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCobros() }, [])

  async function loadCobros() {
    const { data } = await supabase
      .from('cobros')
      .select('*')
      .order('created_at', { ascending: false })
    setCobros(data || [])
    setLoading(false)
  }

  const filtrados = cobros.filter(c => {
    if (filtro === 'pendientes') return c.estado === 'pendiente'
    if (filtro === 'cobrados') return c.estado === 'cobrado'
    return true
  })

  const totalPendiente = cobros.filter(c => c.estado === 'pendiente').reduce((acc, c) => acc + (c.monto_usd || 0), 0)
  const totalMes = (() => {
    const hoy = new Date()
    return cobros.filter(c => {
      if (c.estado !== 'cobrado' || !c.cobrado_at) return false
      const d = new Date(c.cobrado_at)
      return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear()
    }).reduce((acc, c) => acc + (c.monto_usd || 0), 0)
  })()

  async function registrarCobro() {
    if (!showRegistrar) return
    setSaving(true)
    const monto_pesos = formCobro.tipo_cambio ? showRegistrar.monto_usd * parseFloat(formCobro.tipo_cambio) : 0
    await supabase.from('cobros').update({
      estado: 'cobrado',
      forma_cobro: formCobro.forma,
      tipo_cambio: parseFloat(formCobro.tipo_cambio) || 0,
      monto_pesos,
      factura: formCobro.factura,
      cobrado_at: new Date().toISOString()
    }).eq('id', showRegistrar.id)
    setSaving(false)
    setShowRegistrar(null)
    setFormCobro({ forma: 'efectivo_usd', tipo_cambio: '', factura: '' })
    loadCobros()
  }

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/')} style={{
          width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16
        }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Cobranza</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{cobros.filter(c => c.estado === 'pendiente').length} pagos pendientes</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: 'rgba(248,113,113,0.1)', borderRadius: 14, border: '1.5px solid rgba(248,113,113,0.2)', padding: 14 }}>
          <p style={{ fontSize: 11, color: '#f87171', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>Pendiente cobrar</p>
          <p style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>USD {totalPendiente.toLocaleString('es-AR')}</p>
        </div>
        <div style={{ background: 'rgba(74,222,128,0.1)', borderRadius: 14, border: '1.5px solid rgba(74,222,128,0.2)', padding: 14 }}>
          <p style={{ fontSize: 11, color: '#4ade80', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>Cobrado este mes</p>
          <p style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>USD {totalMes.toLocaleString('es-AR')}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { key: 'pendientes', label: 'Pendientes' },
          { key: 'cobrados', label: 'Cobrados' },
          { key: 'todos', label: 'Todos' },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)} style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 20,
            border: `1.5px solid ${filtro === f.key ? 'rgba(45,212,176,0.4)' : BORDER}`,
            background: filtro === f.key ? 'rgba(45,212,176,0.15)' : 'transparent',
            color: filtro === f.key ? TEAL : 'rgba(255,255,255,0.5)', fontWeight: filtro === f.key ? 700 : 400
          }}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>💰</p>
          <p>No hay cobros en esta categoría</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtrados.map(c => {
            const tipo = TIPO_LABEL[c.tipo] || { label: c.tipo, color: 'rgba(255,255,255,0.4)' }
            return (
              <div key={c.id} style={{
                background: DARK2, borderRadius: 14,
                border: `1.5px solid ${c.estado === 'pendiente' ? 'rgba(251,191,36,0.2)' : BORDER}`,
                padding: 14
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{c.numero_p}</span>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{c.nombre}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: tipo.color, background: `${tipo.color}22`, padding: '2px 8px', borderRadius: 20 }}>{tipo.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>USD {c.monto_usd?.toLocaleString('es-AR')}</span>
                  {c.estado === 'pendiente' ? (
                    <button onClick={() => setShowRegistrar(c)} style={{
                      fontSize: 12, padding: '6px 14px', borderRadius: 20,
                      background: TEAL, color: '#1a2332', border: 'none', fontWeight: 600
                    }}>Registrar cobro</button>
                  ) : (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 11, color: '#4ade80', margin: 0 }}>✓ Cobrado</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0 }}>{new Date(c.cobrado_at).toLocaleDateString('es-AR')}</p>
                      {c.forma_cobro && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0 }}>{c.forma_cobro}</p>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showRegistrar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
          <div style={{ background: '#1a2332', borderRadius: 18, padding: 24, width: '100%', maxWidth: 380, border: `1.5px solid ${BORDER}` }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Registrar cobro</p>
            <p style={{ fontSize: 13, color: TEAL, margin: '0 0 16px' }}>{showRegistrar.numero_p} · USD {showRegistrar.monto_usd?.toLocaleString('es-AR')} · {TIPO_LABEL[showRegistrar.tipo]?.label}</p>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Forma de cobro</label>
                <select value={formCobro.forma} onChange={e => setFormCobro(f => ({ ...f, forma: e.target.value }))}>
                  <option value="efectivo_usd">Efectivo USD</option>
                  <option value="efectivo_pesos">Efectivo $ (pesos)</option>
                  <option value="transferencia">Transferencia $</option>
                </select>
              </div>
              {(formCobro.forma === 'efectivo_pesos' || formCobro.forma === 'transferencia') && (
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Tipo de cambio ($ por USD)</label>
                  <input type="number" value={formCobro.tipo_cambio} onChange={e => setFormCobro(f => ({ ...f, tipo_cambio: e.target.value }))} placeholder="Ej: 1400" />
                  {formCobro.tipo_cambio && (
                    <p style={{ fontSize: 11, color: TEAL, margin: '4px 0 0' }}>
                      = $ {(showRegistrar.monto_usd * parseFloat(formCobro.tipo_cambio)).toLocaleString('es-AR')}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Factura ARCA (opcional)</label>
                <input value={formCobro.factura} onChange={e => setFormCobro(f => ({ ...f, factura: e.target.value }))} placeholder="Nº de factura" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowRegistrar(null)} style={{ padding: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 10 }}>Cancelar</button>
                <button onClick={registrarCobro} disabled={saving} style={{ padding: 10, fontSize: 13, fontWeight: 600, background: TEAL, color: '#1a2332', border: 'none', borderRadius: 10 }}>
                  {saving ? 'Guardando...' : 'Confirmar cobro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
