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

type Tramite = {
  id: string
  numero_p: string
  nombre: string
  domicilio: string
  municipio: string
  tramite: string
  estado_actual: string
  n_parcelaria: string
  n_expediente: string
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
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Tramite[]>([])
  const [buscando, setBuscando] = useState(false)

  const now = new Date()
  const fecha = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => { loadCounts() }, [])

  useEffect(() => {
    if (busqueda.length < 2) { setResultados([]); return }
    const timer = setTimeout(() => buscar(), 400)
    return () => clearTimeout(timer)
  }, [busqueda])

  async function buscar() {
    setBuscando(true)
    const { data } = await supabase
      .from('tramites')
      .select('id, numero_p, nombre, domicilio, municipio, tramite, estado_actual, n_parcelaria, n_expediente')
      .or(`n_expediente.ilike.%${busqueda}%,n_parcelaria.ilike.%${busqueda}%,nombre.ilike.%${busqueda}%,numero_p.ilike.%${busqueda}%`)
      .limit(5)
    setResultados(data || [])
    setBuscando(false)
  }

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
        validar, validar_vencidas,
        dibujos: dibujo_tramites.length, dibujos_hoy: 0,
        corr_catastro: catastro_tramites.length, corr_catastro_vencidas: 0,
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
