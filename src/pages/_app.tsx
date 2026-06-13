import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'
import '../styles/globals.css'

const CLAVE = 'Felipe'

export default function App({ Component, pageProps }: AppProps) {
  const [autenticado, setAutenticado] = useState(false)
  const [clave, setClave] = useState('')
  const [error, setError] = useState(false)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const ok = sessionStorage.getItem('tekton_auth')
    if (ok === 'true') setAutenticado(true)
    setCargando(false)
  }, [])

  function ingresar() {
    if (clave === CLAVE) {
      sessionStorage.setItem('tekton_auth', 'true')
      setAutenticado(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  if (cargando) return null

  if (!autenticado) return (
    <div style={{
      background: '#1a2332', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: '#243044', borderRadius: 20, padding: 32, width: '100%', maxWidth: 340,
        border: '1.5px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, background: 'rgba(45,212,176,0.15)',
            borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 14px'
          }}>🏛️</div>
          <p style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Estudio Tekton</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Gestiones municipales</p>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Contraseña</label>
            <input
              type="password"
              value={clave}
              onChange={e => { setClave(e.target.value); setError(false) }}
              onKeyDown={e => e.key === 'Enter' && ingresar()}
              placeholder="Ingresá la clave"
              autoFocus
            />
          </div>
          {error && <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center', margin: 0 }}>Clave incorrecta</p>}
          <button onClick={ingresar} style={{
            padding: 12, fontSize: 14, fontWeight: 600,
            background: '#2dd4b0', color: '#1a2332', border: 'none', borderRadius: 10
          }}>Ingresar →</button>
        </div>
      </div>
    </div>
  )

  return <Component {...pageProps} />
}
