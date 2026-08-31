import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { webauthnOK, passkeyLogin, BIO } from '../lib/api.js'
import { hasData } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import { guestAllowed } from '../lib/guest.js'
import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

function RegisterSheet({ close, initialCode = '' }) {
  const { setUser, pushState, pullState, loadConfig } = useStore()
  const config = useStore(s => s.config)

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
const [code, setCode] = useState(initialCode)

  const inviteOnly = !!config?.invite_only
  const ref = useRef(null)

  useEffect(() => {
    setTimeout(() => ref.current?.focus(), 250)
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const go = async () => {
    const n = name.trim()
    const u = username.trim().toLowerCase()

    if (!n) {
      useUI.getState().toast('Introduce tu nombre')
      return
    }

    if (!u) {
      useUI.getState().toast('Introduce un nombre de usuario')
      return
    }

    if (password.length < 8) {
      useUI.getState().toast('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (inviteOnly && !code.trim()) {
      useUI.getState().toast('Necesitas un código de invitación')
      return
    }

    try {
      const r = await fetch('/api/password/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: n,
          username: u,
          password,
          code: code.trim()
        })
      })

      const data = await r.json()

      if (!r.ok) {
        throw new Error(data.error || 'No se pudo crear la cuenta')
      }

      setUser(data.user)
      close()

      if (hasData(useStore.getState().S)) {
        await pushState()
        useUI.getState().toast('Cuenta creada')
      } else {
        await pullState()
        useUI.getState().toast(`Bienvenido, ${data.user.name}`)
      }
    } catch (e) {
      useUI.getState().toast(e.message || 'No se pudo crear la cuenta')
    }
  }

  return <>
    <h3>Crear cuenta</h3>

    <div className="muted small" style={{ marginBottom: 14 }}>
      Crea tus datos de acceso para el Centro Deportivo A-Sport.
    </div>

    <input
      ref={ref}
      className="input"
      placeholder="Nombre"
      maxLength={40}
      value={name}
      onChange={e => setName(e.target.value)}
      autoComplete="name"
    />

    <div style={{ height: 10 }} />

    <input
      className="input"
      placeholder="Usuario"
      maxLength={30}
      value={username}
      onChange={e => setUsername(e.target.value)}
      autoComplete="username"
    />

    <div style={{ height: 10 }} />

    <input
      className="input"
      type="password"
      placeholder="Contraseña"
      value={password}
      onChange={e => setPassword(e.target.value)}
      autoComplete="new-password"
      onKeyDown={e => {
        if (e.key === 'Enter' && (!inviteOnly || code.trim())) go()
      }}
    />

    {inviteOnly && <>
      <div style={{ height: 10 }} />

      <input
        className="input"
        placeholder="Código de invitación"
        maxLength={40}
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        style={{
          letterSpacing: '.14em',
          fontWeight: 600,
          textAlign: 'center'
        }}
      />

      <div className="dim small" style={{ marginTop: 6 }}>
        Introduce el código proporcionado por el Centro Deportivo A-Sport.
      </div>
    </>}

    <div style={{ height: 14 }} />

    <Button variant="primary" onClick={go}>
      Crear cuenta
    </Button>
  </>
}
export default function Login() {
  const { setUser, pullState, setGuest } = useStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
useEffect(() => {
  const hash = window.location.hash || ''
  const match = hash.match(/[?&]invite=([^&]+)/)

  if (!match) return

  const invite = decodeURIComponent(match[1]).toUpperCase()

  useUI.getState().openSheet(close => (
    <RegisterSheet close={close} initialCode={invite} />
  ))

  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search + '#/'
  )
}, [])

  const passwordLogin = async () => {
    try {
      const r = await fetch('/api/password/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await r.json()

      if (!r.ok) throw new Error(data.error || 'Error al iniciar sesión')

      setUser(data.user)
      await pullState()
      useUI.getState().toast(`Bienvenido, ${data.user.name}`)
    } catch (e) {
      useUI.getState().toast(e.message || 'No se pudo iniciar sesión')
    }
  }
  const config = useStore(s => s.config)
  const canGuest = guestAllowed(config)
  const signIn = async () => {
    try { const u = await passkeyLogin(); setUser(u); await pullState(); useUI.getState().toast(t('Welcome back, {0}', u.name)) }
    catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Sign-in failed')) }
  }
  const head = <>
    <div style={{ display: 'flex', justifyContent: 'center' }}>
  <img
    src="/logo-asport.svg"
    alt="Centro Deportivo A-Sport"
    style={{ width: 150, height: 150, objectFit: 'contain' }}
  />
</div>
    <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.028em', margin: '10px 0 4px' }}>Centro Deportivo A-Sport</h1>
  </>
  const wrap = { display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '78vh', textAlign: 'center' }

  // Demo build: no backend to sign in against — the only way in is the local guest profile.
  if (DEMO) return (
    <div className="narrow" style={wrap}>
      {head}
      <div className="muted" style={{ marginBottom: 30 }}>{t('Live demo — everything stays in this browser.')}</div>
      <Button variant="primary" icon="sparkles" onClick={() => setGuest(true)}>{t('Start the demo')}</Button>
      <div className="card small muted" style={{ textAlign: 'left', marginTop: 16 }}>
        {t('This demo runs entirely in your browser on example data — nothing is sent anywhere. Passkey sign-in and sync across your devices come with the openGym server, which you get by self-hosting it.')}
      </div>
      <div className="dim small" style={{ marginTop: 22, lineHeight: 1.6 }}>
        <a href={REPO} target="_blank" rel="noopener">{t('Self-host it in a minute →')}</a>
      </div>
    </div>
  )

  return (
    <div className="narrow" style={wrap}>
      {head}
<div className="muted" style={{ marginBottom: 24 }}>
  Tu perfil en el Centro Deportivo A-Sport
</div>

<input
  className="input"
  placeholder="Usuario"
  value={username}
  onChange={e => setUsername(e.target.value)}
  autoComplete="username"
/>

<div style={{ height: 10 }} />

<input
  className="input"
  type="password"
  placeholder="Contraseña"
  value={password}
  onChange={e => setPassword(e.target.value)}
  autoComplete="current-password"
  onKeyDown={e => {
    if (e.key === 'Enter') passwordLogin()
  }}
/>

<div style={{ height: 12 }} />

<Button variant="primary" onClick={passwordLogin}>
  Entrar
</Button>

      <div style={{ height: 18 }} />

{webauthnOK() ? <>
  <Button variant="primary" icon="person" onClick={signIn}>
    {t('Entrar con passkey')}
  </Button>
        <div style={{ height: 10 }} />
        <Button icon="sparkles" onClick={() => useUI.getState().openSheet(close => <RegisterSheet close={close} />)}>{t('Crear nuevo perfil')}</Button>
        {canGuest && <div style={{ height: 10 }} />}
      </> : <div className="card small muted" style={{ textAlign: 'left' }}>{canGuest
        ? t("This browser doesn't support passkeys — you can still use openGym locally on this device.")
        // Without passkeys and without the guest entrance there is no way in from this browser,
        // so say that plainly instead of offering a local profile that cannot be created.
        : t("This browser doesn't support passkeys, and this instance requires an account. Try a browser or device with passkey support.")}</div>}
      {canGuest && <Button variant="ghost" className="dim" onClick={() => setGuest(true)}>{t('Continue without account')}</Button>}
      <div className="dim small" style={{ marginTop: 26, lineHeight: 1.5 }}>{t('Passkeys use {0} — no passwords.', BIO)}<br />{t('Each profile keeps its own plan, workouts & body weight.')}</div>
    </div>
  )
}
