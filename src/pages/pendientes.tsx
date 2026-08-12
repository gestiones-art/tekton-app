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
  municipio: string
  tramite: string
  estado_actual: string
  pelota: string
  ultima_nota: string
  ultima_accion_at: string
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

const RESPONSABLES = [
  { key: 'admin', label: 'Adm/Comercial', color: '#3b82f6' },
  { key: 'tecnica', label: 'Técnica', color: '#f97316' },
  { key: 'municipio', label: 'Municipio', color: TEAL },
  { key: 'cliente', label: 'Cliente', color: '#a78bfa' },
]

const PELOTA_MAP: Record<string, string> = {
  dibujante: 'tecnica',
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
}

export default function Pendientes() {
  const router = useRouter()
  const [tramites, setTramites] = useState<Tramite[]>([])
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('admin')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: tr } = await supabase
      .from('tramites')
      .select('id, numero_p, nombre, municipio, tramite, estado_actual, pelota, ultima_nota, ultima_accion_at')
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

  const responsableNorm = (t: Tramite) => PELOTA_MAP[t.pelota] || t.pelota
  const diasSinMover = (fecha: string) => Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24))

  const tramitesResp = tramites.filter(t => responsableNorm(t) === tab)
  const consultasResp = tab === 'tecnica'
    ? consultas.filter(c => c.estado === 'pendiente' || c.estado === 'pendiente_validacion')
    : tab === 'admin'
      ? consultas.filter(c => c.estado === 'pdte_enviar' || c.estado === 'enviado')
      : []

  const tramitesAtrasados = tramitesResp.filter(t => diasSinMover(t.ultima_accion_at) > 7)
  const tramitesAlDia = tramitesResp.filter(t => diasSinMover(t.ultima_accion_at) <= 7)
  // Las consultas no tienen ultima_accion_at propio, así que se agrupan siempre en "Resto"
  // salvo que la fecha de creación ya pase los 7 días sin respuesta.
  const consultasAtrasadas = consultasResp.filter(c => diasSinMover(c.created_at) > 7)
  const consultasAlDia = consultasResp.filter(c => diasSinMover(c.created_at) <= 7)

  const totalAtrasado = tramitesAtrasados.length + consultasAtrasadas.length
  const totalResto = tramitesAlDia.length + consultasAlDia.length

  function contarTotal(key: string) {
    const t = tramites.filter(tr => responsableNorm(tr) === key).length
    const c = key === 'tecnica'
      ? consultas.filter(x => x.estado === 'pendiente' || x.estado === 'pendiente_validacion').length
      : key === 'admin'
        ? consultas.filter(x => x.estado === 'pdte_enviar' || x.estado === 'enviado').length
        : 0
    return t + c
  }

  function CardTramite({ t }: { t: Tramite }) {
    const dias = diasSinMover(t.ultima_accion_at)
    return (
      <button key={t.id} onClick={() => router.push(`/tramites/${t.id}`)} style={{
        width: '100%', textAlign: 'left', background: DARK2, borderRadius: 10, padding: '10px 12px',
        border: `1px solid ${dias > 7 ? 'rgba(248,113,113,0.3)' : BORDER}`, marginBottom: 6
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: TEAL }}>{t.numero_p}</span>
            <span style={{ fontSize: 13, color: '#fff', marginLeft: 6 }}>{t.nombre}</span>
          </div>
          {dias > 7 && <span style={{ fontSize: 10, color: '#f87171', flexShrink: 0 }}>⚠ {dias}d</span>}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>
          {ESTADO_LABEL[t.estado_actual] || t.estado_actual?.replace(/_/g, ' ')}
          {t.ultima_nota && <span style={{ fontStyle: 'italic' }}> · "{t.ultima_nota}"</span>}
        </p>
      </button>
    )
  }

  function CardConsulta({ c }: { c: Consulta }) {
    const dias = diasSinMover(c.created_at)
    return (
      <button key={c.id} onClick={() => router.push(`/consultas/${c.id}`)} style={{
        width: '100%', textAlign: 'left', background: 'rgba(251,191,36,0.06)', borderRadius: 10, padding: '10px 12px',
        border: `1px solid ${dias > 7 ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.2)'}`, marginBottom: 6
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.15)', padding: '1px 6px', borderRadius: 10 }}>CONSULTA</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: TEAL }}>{c.numero_p}</span>
            <span style={{ fontSize: 13, color: '#fff' }}>{c.nombre}</span>
          </div>
          {dias > 7 && <span style={{ fontSize: 10, color: '#f87171', flexShrink: 0 }}>⚠ {dias}d</span>}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>{c.tramite} · {c.municipio}</p>
      </button>
    )
  }

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <button onClick={() => router.push('/')} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>←</button>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#fff' }}>Pendientes</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Lo que hay que mover</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' as const, marginBottom: 16, paddingBottom: 2 }}>
          {RESPONSABLES.map(r => (
            <button key={r.key} onClick={() => setTab(r.key)} style={{
              flexShrink: 0, fontSize: 12, padding: '7px 14px', borderRadius: 20,
              background: tab === r.key ? r.color : 'rgba(255,255,255,0.05)',
              border: tab === r.key ? 'none' : `1px solid ${BORDER}`,
              color: tab === r.key ? '#0b1420' : 'rgba(255,255,255,0.6)',
              fontWeight: tab === r.key ? 700 : 400
            }}>{r.label} {contarTotal(r.key)}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>Cargando...</div>
        ) : (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#f87171', margin: '0 0 8px' }}>⚠ Atrasado · {totalAtrasado}</p>
            {totalAtrasado === 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Nada atrasado ✓</p>
            ) : (
              <div style={{ marginBottom: 18 }}>
                {consultasAtrasadas.map(c => <CardConsulta key={c.id} c={c} />)}
                {tramitesAtrasados.map(t => <CardTramite key={t.id} t={t} />)}
              </div>
            )}

            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 8px' }}>Resto de la bandeja · {totalResto}</p>
            {totalResto === 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Sin pendientes ✓</p>
            ) : (
              <div>
                {consultasAlDia.map(c => <CardConsulta key={c.id} c={c} />)}
                {tramitesAlDia.map(t => <CardTramite key={t.id} t={t} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
