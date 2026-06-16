import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

type Counts = {
  validar: number
  validar_vencidas: number
  dibujos: number
  dibujos_hoy: number
  corr_catastro: number
  corr_catastro_vencidas: number
  corr_visado: number
  estructura: number
  colegio: number
  consultas: number
  presupuestos: number
  presupuestos_sin_resp: number
  tramites: number
  cobranza_pendiente: number
}

export default function Home() {
  const router = useRouter()
  const [counts, setCounts] = useState<Counts>({
    validar: 0, validar_vencidas: 0,
    dibujos: 0, dibujos_hoy: 0,
    corr_catastro: 0, corr_catastro_vencidas: 0,
    corr_visado: 0, estructura: 0, colegio: 0,
    consultas: 0, presupuestos: 0, presupuestos_sin_resp: 0,
    tramites: 0, cobranza_pendiente: 0
  })
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const fecha = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => { loadCounts() }, [])

  async function loadCounts() {
    try {
      const { data: consultas } = await supabase
        .from('consultas')
        .select('id, estado, created_at')
        .eq('estado', 'pendiente_validacion')

      const { data: presupuestos } = await supabase
        .from('presupuestos')
        .select('id, estado, enviado_at')
        .eq('estado', 'enviado')

      const { data: tramites } = await supabase
        .from('tramites')
        .select('id, estado_actual')
        .not('estado_actual', 'eq', 'finalizado')
        .not('estado_actual', 'eq', 'en_pausa')

      const { data: cobros } = await supabase
        .from('cobros')
        .select('id, estado')
        .eq('estado', 'pendiente')

      const validar = consultas?.length || 0
      const validar_vencidas = consultas?.filter(c => {
        const diff = (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60)
        return diff > 24
      }).length || 0

      const dibujo_tramites = tramites?.filter(t => t.estado_actual === 'en_dibujo') || []
      const catastro_tramites = tramites?.filter(t => t.estado_actual === 'observado_catastro') || []
      const visado_tramites = tramites?.filter(t => t.estado_actual === 'correc_visado') || []
      const estructura_tramites = tramites?.filter(t => t.estado_actual === 'estructura_en_proceso') || []
      const colegio_tramites = tramites?.filter(t => t.estado_actual === 'pendiente_colegio') || []

      const tres_dias = new Date()
      tres_dias.setDate(tres_dias.getDate() - 3)
      const sin_resp = presupuestos?.filter(p => new Date(p.enviado_at) < tres_dias).length || 0

      setCounts({
        validar,
        validar_vencidas,
        dibujos: dibujo_tramites.length,
        dibujos_hoy: 0,
        corr_catastro: catastro_tramites.length,
        corr_catastro_vencidas: 0,
        corr_visado: visado_tramites.length,
        estructura: estructura_tramites.length,
        colegio: colegio_tramites.length,
        consultas: consultas?.length || 0,
        presupuestos: presupuestos?.length || 0,
        presupuestos_sin_resp: sin_resp,
        tramites: tramites?.length || 0,
        cobranza_pendiente: cobros?.length || 0
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const badge = (label: string, type: 'red' | 'orange' | 'green' | 'gray') => {
    const colors = {
      red: { bg: 'rgba(248,113,113,0.18)', color: '#f87171' },
      orange: { bg: 'rgba(251,191,36,0.18)', color: '#fbbf24' },
      green: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
      gray: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' },
    }
    return (
      <span style={{
        fontSize: 11, fontWeight: 700,
        background: colors[type].bg, color: colors[type].color,
        padding: '3px 9px', borderRadius: 20
      }}>{label}</span>
    )
  }

  const Card = ({ icon, title, subtitle, badgeLabel, badgeType, onClick }: {
    icon: string, title: string, subtitle: string,
    badgeLabel: string, badgeType: 'red' | 'orange' | 'green' | 'gray',
    onClick: () => void
  }) => (
    <button onClick={onClick} style={{
      background: DARK2, borderRadius: 14,
      border: `1.5px solid ${badgeType === 'red' ? 'rgba(248,113,113,0.3)' : BORDER}`,
      padding: 14, textAlign: 'left', width: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, background: 'rgba(45,212,176,0.12)',
          borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20
        }}>{icon}</div>
        {badge(badgeLabel, badgeType)}
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>{title}</p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, fontWeight: 600 }}>{subtitle}</p>
    </button>
  )

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.75rem' }}>
          <div style={{
            width: 36, height: 36, background: TEAL, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ color: '#1a2332', fontSize: 16, fontWeight: 800 }}>T</span>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Estudio Tekton</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, textTransform: 'capitalize' }}>{fecha}</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>Cargando...</div>
        ) : (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 10px' }}>Área técnica</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: '1.75rem' }}>
              <Card icon="🔍" title="Validar p/presupuesto" subtitle={`${counts.validar} pendientes`}
                badgeLabel={counts.validar_vencidas > 0 ? `⚠ ${counts.validar_vencidas} vencida` : 'al día'}
                badgeType={counts.validar_vencidas > 0 ? 'red' : 'green'}
                onClick={() => router.push('/validar')} />
              <Card icon="✏️" title="Dibujos" subtitle={`${counts.dibujos} pendientes`}
                badgeLabel={counts.dibujos > 0 ? `${counts.dibujos} activos` : 'al día'}
                badgeType={counts.dibujos > 0 ? 'orange' : 'green'}
                onClick={() => router.push('/tramites?etapa=dibujo')} />
              <Card icon="🏛️" title="Correc. Catastro" subtitle={`${counts.corr_catastro} pendientes`}
                badgeLabel={counts.corr_catastro_vencidas > 0 ? `⚠ vencida` : 'al día'}
                badgeType={counts.corr_catastro_vencidas > 0 ? 'red' : 'green'}
                onClick={() => router.push('/tramites?etapa=catastro')} />
              <Card icon="📋" title="Correc. Visado" subtitle={`${counts.corr_visado} pendientes`}
                badgeLabel={counts.corr_visado > 0 ? `${counts.corr_visado} activos` : 'al día'}
                badgeType={counts.corr_visado > 0 ? 'orange' : 'green'}
                onClick={() => router.push('/tramites?etapa=visado')} />
              <Card icon="🏗️" title="Estructura" subtitle={`${counts.estructura} pendientes`}
                badgeLabel={counts.estructura > 0 ? `${counts.estructura} activos` : 'al día'}
                badgeType={counts.estructura > 0 ? 'orange' : 'green'}
                onClick={() => router.push('/tramites?etapa=estructura')} />
              <Card icon="🎓" title="Colegio" subtitle={`${counts.colegio} pendientes`}
                badgeLabel={counts.colegio > 0 ? `${counts.colegio} activos` : 'al día'}
                badgeType={counts.colegio > 0 ? 'orange' : 'green'}
                onClick={() => router.push('/tramites?etapa=colegio')} />
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 10px' }}>Comercial y administración</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: '1.75rem' }}>
              <Card icon="💬" title="Consultas" subtitle={`${counts.consultas} nuevas`}
                badgeLabel="al día" badgeType="green"
                onClick={() => router.push('/consultas')} />
              <Card icon="📄" title="Presupuestos" subtitle={`${counts.presupuestos} enviados`}
                badgeLabel={counts.presupuestos_sin_resp > 0 ? `${counts.presupuestos_sin_resp} sin resp.` : 'al día'}
                badgeType={counts.presupuestos_sin_resp > 0 ? 'orange' : 'green'}
                onClick={() => router.push('/presupuestos')} />
              <Card icon="📋" title="Trámites" subtitle={`${counts.tramites} activos`}
                badgeLabel="al día" badgeType="green"
                onClick={() => router.push('/tramites')} />
              <Card icon="💰" title="Cobranza" subtitle="Saldos a cobrar"
                badgeLabel={counts.cobranza_pendiente > 0 ? `${counts.cobranza_pendiente} pendientes` : 'al día'}
                badgeType={counts.cobranza_pendiente > 0 ? 'orange' : 'green'}
                onClick={() => router.push('/cobranza')} />
            </div>

            <button
              onClick={() => router.push('/consultas/nueva')}
              style={{
                width: '100%', padding: 14, fontSize: 15, fontWeight: 700,
                background: TEAL, color: '#1a2332', border: 'none', borderRadius: 14
              }}>
              + Nueva consulta
            </button>
          </>
        )}
      </div>
    </div>
  )
}
