import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

export default function Exportar() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [progreso, setProgreso] = useState('')

  async function exportarTodo() {
    setLoading(true)
    try {
      setProgreso('Descargando trámites...')
      const { data: tramites } = await supabase.from('tramites').select('*').order('numero_p')

      setProgreso('Descargando movimientos...')
      const { data: movimientos } = await supabase.from('movimientos').select('*').order('created_at')

      setProgreso('Descargando consultas...')
      const { data: consultas } = await supabase.from('consultas').select('*').order('numero_p')

      setProgreso('Descargando cobros...')
      const { data: cobros } = await supabase.from('cobros').select('*').order('created_at')

      setProgreso('Armando Excel...')

      const wb = XLSX.utils.book_new()

      // ── HOJA 1: TRÁMITES ──
      const tramitesLimpios = (tramites || []).map(t => ({
        'Número P': t.numero_p || '',
        'Nombre': t.nombre || '',
        'Domicilio': t.domicilio || '',
        'Municipio': t.municipio || '',
        'Trámite': t.tramite || '',
        'Estado': t.estado_actual || '',
        'Responsable': t.pelota || '',
        'Última nota': t.ultima_nota || '',
        'Última acción': t.ultima_accion_at ? new Date(t.ultima_accion_at).toLocaleDateString('es-AR') : '',
        'Parcelaria': t.n_parcelaria || '',
        'Expediente': t.n_expediente || '',
        'Dibujante': t.dibujante || '',
        'Firma': t.firma || '',
        'Celular': t.celular || '',
        'Costo dibujo USD': t.costo_dibujo || '',
        'Fecha entrega dibujo': t.fecha_entrega_dibujo ? new Date(t.fecha_entrega_dibujo).toLocaleDateString('es-AR') : '',
        'Creado': t.created_at ? new Date(t.created_at).toLocaleDateString('es-AR') : '',
      }))
      const wsTramites = XLSX.utils.json_to_sheet(tramitesLimpios)
      wsTramites['!cols'] = [
        { wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 15 },
        { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 50 },
        { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
        { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 12 }
      ]
      XLSX.utils.book_append_sheet(wb, wsTramites, 'Tramites')

      // ── HOJA 2: MOVIMIENTOS ──
      const movimientosLimpios = (movimientos || []).map(m => ({
        'Trámite ID': m.tramite_id || '',
        'Estado': m.estado || '',
        'Nota': m.nota || '',
        'Responsable': m.pelota || '',
        'Registrado por': m.registrado_por || '',
        'Link': m.link || '',
        'Fecha': m.created_at ? new Date(m.created_at).toLocaleDateString('es-AR') : '',
      }))
      const wsMovimientos = XLSX.utils.json_to_sheet(movimientosLimpios)
      wsMovimientos['!cols'] = [
        { wch: 38 }, { wch: 20 }, { wch: 60 },
        { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 12 }
      ]
      XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos')

      // ── HOJA 3: CONSULTAS ──
      const consultasLimpias = (consultas || []).map(c => ({
        'Número P': c.numero_p || '',
        'Nombre': c.nombre || '',
        'Celular': c.celular || '',
        'Domicilio': c.domicilio || '',
        'Municipio': c.municipio || '',
        'Trámite': c.tramite || '',
        'Estado': c.estado || '',
        'Observaciones': c.observaciones || '',
        'Monto USD': c.monto_usd || '',
        'Anticipo USD': c.anticipo_usd || '',
        'Segunda cuota USD': c.segunda_cuota_usd || '',
        'Saldo USD': c.saldo_usd || '',
        'Plazo': c.plazo_dias || '',
        'Vigencia días': c.vigencia_dias || '',
        'Enviado': c.enviado_at ? new Date(c.enviado_at).toLocaleDateString('es-AR') : '',
        'Motivo cancelación': c.motivo_cancelacion || '',
        'Motivo rechazo': c.motivo_rechazo || '',
        'Obs presupuesto': c.obs_presupuesto || '',
        'Ajusta COU': c.ajusta_cou || '',
        'Derechos est. USD': c.derechos_estimados || '',
        'Aportes est. USD': c.aportes_estimados || '',
        'Creado': c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '',
      }))
      const wsConsultas = XLSX.utils.json_to_sheet(consultasLimpias)
      wsConsultas['!cols'] = [
        { wch: 10 }, { wch: 25 }, { wch: 18 }, { wch: 25 }, { wch: 15 },
        { wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 12 },
        { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
        { wch: 25 }, { wch: 25 }, { wch: 40 }, { wch: 12 }, { wch: 15 },
        { wch: 15 }, { wch: 12 }
      ]
      XLSX.utils.book_append_sheet(wb, wsConsultas, 'Consultas')

      // ── HOJA 4: COBROS ──
      const cobrosLimpios = (cobros || []).map(c => ({
        'Trámite ID': c.tramite_id || '',
        'Número P': c.numero_p || '',
        'Tipo': c.tipo || '',
        'Monto USD': c.monto_usd || '',
        'Monto Pesos': c.monto_pesos || '',
        'Tipo de cambio': c.tipo_cambio || '',
        'Forma de cobro': c.forma_cobro || '',
        'Estado': c.estado || '',
        'Cobrado': c.cobrado_at ? new Date(c.cobrado_at).toLocaleDateString('es-AR') : '',
        'Factura': c.factura || '',
        'Creado': c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '',
      }))
      const wsCobros = XLSX.utils.json_to_sheet(cobrosLimpios)
      wsCobros['!cols'] = [
        { wch: 38 }, { wch: 10 }, { wch: 20 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 },
        { wch: 12 }, { wch: 20 }, { wch: 12 }
      ]
      XLSX.utils.book_append_sheet(wb, wsCobros, 'Cobros')

      // ── DESCARGAR ──
      const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-')
      XLSX.writeFile(wb, `Tekton_backup_${fecha}.xlsx`)
      setProgreso('¡Listo! Revisá tu carpeta de descargas.')
    } catch (err) {
      setProgreso('Error al exportar. Intentá de nuevo.')
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
          <button onClick={() => router.push('/')} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>←</button>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#fff' }}>Exportar datos</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Backup completo en Excel</p>
          </div>
        </div>

        <div style={{ background: DARK2, borderRadius: 14, border: `1.5px solid ${BORDER}`, padding: 24, marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 16px', lineHeight: 1.6 }}>
            Descarga un Excel con 4 solapas:
          </p>
          {['📁 Trámites — todos los expedientes activos e históricos', '📋 Movimientos — historial completo de cada expediente', '💬 Consultas — consultas y presupuestos', '💰 Cobros — registro de pagos'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{item}</span>
            </div>
          ))}
        </div>

        {progreso && (
          <div style={{ background: 'rgba(45,212,176,0.1)', border: '1.5px solid rgba(45,212,176,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: TEAL, margin: 0 }}>{progreso}</p>
          </div>
        )}

        <button
          onClick={exportarTodo}
          disabled={loading}
          style={{
            width: '100%', padding: 16, fontSize: 15, fontWeight: 700,
            background: loading ? 'rgba(45,212,176,0.4)' : TEAL,
            color: '#1a2332', border: 'none', borderRadius: 14, cursor: loading ? 'wait' : 'pointer'
          }}
        >
          {loading ? '⏳ Exportando...' : '⬇ Descargar Excel completo'}
        </button>

      </div>
    </div>
  )
}
