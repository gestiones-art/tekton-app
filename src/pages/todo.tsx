import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const TEAL = '#2dd4b0'
const DARK2 = '#243044'
const BORDER = 'rgba(255,255,255,0.08)'

const ESTADO_LABEL: Record<string, string> = {
  dibujo: 'Dibujo', correc_catastro: 'Correc. Catastro', correc_op: 'Correc. OP',
  validar_presu: 'Validar Presu.', catastro: 'Catastro', obras: 'Obras Particulares',
  ordenamiento: 'Ordenamiento Urbano', otros: 'Otros',
  en_dibujo: 'Dibujo', observado_catastro: 'Correc. Catastro',
  presentado_catastro: 'Catastro', correc_visado: 'Correc. OP',
  presentado_obras: 'Obras Particulares',
}

const RESPONSABLE_LABEL: Record<string, string> = {
  admin: 'Adm/Comercial', tecnica: 'Técnica', municipio: 'Municipio',
  cliente: 'Cliente', dibujante: 'Técnica'
}

const RESPONSABLE_COLOR: Record<string, string> = {
  admin: '#3b82f6', tecnica: '#f97316', municipio: TEAL,
  cliente: '#8b5cf6', dibujante: '#f97316'
}

const ESTADO_CONSULTA: Record<string, string> = {
  pendiente: 'Pdte. técnica', pdte_enviar: 'Pdte. enviar',
  enviado: 'Enviado', aceptado: 'Aceptado'
}

const TIPOS_TRAMITE = [
  'Todos',
  'Permiso de construcción',
  'Conforme a obra',
  'Regularización',
  'Demolición total',
  'Consulta previa',
  'Estudio de factibilidad',
]

type Item = {
  id: string
  tipo: 'tramite' | 'consulta'
  numero_p: string
  nombre: string
  domicilio: string
  municipio: string
  tramite: string
  estado: string
  responsable: string
  ultima_nota: string
  dias: number
}

export default function Todo() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('Todos')

  useEffect(() => { loadTodo() }, [])

  async function loadTodo() {
    const hoy = Date.now()

    const { data: tramites } = await supabase
      .from('tramites')
      .select('id, numero_p, nombre, domicilio, municipio, tramite, estado_actual, pelota, ultima_nota, created_at, finalizado')
      .eq('finalizado', false)
      .not('estado_actual', 'eq', 'en_pausa')

    const { data: consultas } = await supabase
      .from('consultas')
      .select('id, numero_p, nombre, domicilio, municipio, tramite, estado, ultima_nota, enviado_at')
      .in('estado', ['pendiente', 'pdte_enviar', 'enviado'])

    const tramiteItems: Item[] = (tramites || []).map(t => ({
      id: t.id,
      tipo: 'tramite',
      numero_p: t.numero_p || '',
      nombre: t.nombre || '',
      domicilio: t.domicilio || '',
      municipio: t.municipio || '',
      tramite: t.tramite || '',
      estado: t.estado_actual || '',
      responsable: t.pelota || 'admin',
      ultima_nota: t.ultima_nota || '',
      dias: t.created_at ? Math.floor((hoy - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    }))

    const consultaItems: Item[] = (consultas || []).map(c => ({
      id: c.id,
      tipo: 'consulta',
      numero_p: c.numero_p || '',
      nombre: c.nombre || '',
      domicilio: c.domicilio || '',
      municipio: c.municipio || '',
      tramite: c.tramite || '',
      estado: c.estado || '',
      responsable: 'admin',
      ultima_nota: c.ultima_nota || '',
      dias: c.enviado_at ? Math.floor((hoy - new Date(c.enviado_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    }))

    const todos = [...tramiteItems, ...consultaItems].sort((a, b) => b.dias - a.dias)
    setItems(todos)
    setLoading(false)
  }

  const diasLabel = (d: number) => {
    if (d === 0) return 'hoy'
    if (d === 1) return '1 día'
    return `${d} días`
  }

  const itemsFiltrados = filtroTipo === 'Todos'
    ? items
    : items.filter(i => i.tramite === filtroTipo)

  return (
    <div style={{ background: '#1a2332', minHeight: '100vh', padding: '1.25rem 1rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
          <button onClick={() => router.push('/')} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>←</button>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#fff' }}>Todo</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{itemsFiltrados.length} activos — más antiguo primero</p>
          </div>
        </div>

        {/* FILTRO POR TIPO */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
          {TIPOS_TRAMITE.map(tipo => (
            <button key={tipo} onClick={() => setFiltroTipo(tipo)} style={{
              fontSize: 11, padding: '5px 12px', borderRadius: 20,
              border: `1.5px solid ${filtroTipo === tipo ? 'rgba(45,212,176,0.4)' : BORDER}`,
              background: filtroTipo === tipo ? 'rgba(45,212,176,0.15)' : 'transparent',
              color: filtroTipo === tipo ? TEAL : 'rgba(255,255,255,0.4)',
              fontWeight: filtroTipo === tipo ? 600 : 400
            }}>{tipo === 'Todos' ? `Todos (${items.length})` : tipo}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>Cargando...</div>
        ) : itemsFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', marginTop: 60 }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
            <p>Sin trámites de este tipo</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {itemsFiltrados.map(item => (
              <button key={`${item.tipo}-${item.id}`}
                onClick={() => router.push(item.tipo === 'tramite' ? `/tramites/${item.id}` : `/consultas/${item.id}`)}
                style={{ background: DARK2, borderRadius: 12, border: `1.5px solid ${BORDER}`, padding: '12px 14px', textAlign: 'left', width: '100%' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                    background: item.tipo === 'tramite' ? 'rgba(96,165,250,0.15)' : 'rgba(251,191,36,0.15)',
                    color: item.tipo === 'tramite' ? '#60a5fa' : '#fbbf24'
                  }}>{item.tipo === 'tramite' ? 'TRÁMITE' : 'CONSULTA'}</span>
                  {item.numero_p && <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{item.numero_p}</span>}
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{item.nombre}</span>
                </div>

                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 4px' }}>
                  {item.domicilio && `${item.domicilio} · `}{item.tramite}{item.municipio && ` · ${item.municipio}`}
                </p>

                {item.ultima_nota && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 6px', fontStyle: 'italic' }}>
                    "{item.ultima_nota.slice(0, 80)}{item.ultima_nota.length > 80 ? '...' : ''}"
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {item.tipo === 'tramite' ? (
                    <>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, border: `1px solid rgba(255,255,255,0.1)`, color: RESPONSABLE_COLOR[item.responsable] || '#888' }}>
                        {RESPONSABLE_LABEL[item.responsable] || item.responsable}
                      </span>
                      {ESTADO_LABEL[item.estado] && (
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, border: `1px solid rgba(255,255,255,0.1)`, color: 'rgba(255,255,255,0.4)' }}>
                          {ESTADO_LABEL[item.estado]}
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, border: `1px solid rgba(255,255,255,0.1)`, color: 'rgba(255,255,255,0.4)' }}>
                      {ESTADO_CONSULTA[item.estado] || item.estado}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                    {diasLabel(item.dias)}
                  </span>
                </div>

              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
