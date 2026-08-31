import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { fmtDate, fmtNum, fmtVol, fmtDur } from '../lib/format.js'
import { auditCat, auditLine, fmtWhen } from '../lib/audit.js'
import { workoutVolume, setsDone } from '../lib/history.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

// Admin-only operator dashboard (owner passkey + admin flag; guarded again server-side).
// Deliberately English-only — it isn't part of the translated end-user surface, so it stays
// out of the per-language string packs.

const rel = ts => {
  if (!ts) return 'never'
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}
const dur = ms => { const m = Math.max(0, Math.floor(ms / 60000)); return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h' + (m % 60) + 'm' }

function UserDetail({ id, onChanged, close }) {
  const [d, setD] = useState(null)
const [newPassword, setNewPassword] = useState('')
  const [plans, setPlans] = useState([])
  const [choosingPlan, setChoosingPlan] = useState(false)
const [measurements, setMeasurements] = useState([])
  const [addingMeasurement, setAddingMeasurement] = useState(false)

  const [measurementForm, setMeasurementForm] = useState({
    date: new Date().toISOString().slice(0, 10),

    tanita: {
      weight: '',
      bodyFatPct: '',
      muscleMass: '',
      boneMass: '',
      bmi: '',
      bmr: '',
      metabolicAge: '',
      bodyWaterPct: '',
      visceralFat: ''
    },

    circumferences: {
      chest: '',
      waist: '',
      abdomen: '',
      hips: '',
      thigh: '',
      calf: '',
      arm: ''
    }
  })
  const toast = useUI(s => s.toast)
  useEffect(() => {
  api('/api/admin/user?id=' + encodeURIComponent(id))
    .then(setD)
    .catch(e => toast(e.message))

  api('/api/admin/user/measurements?id=' + encodeURIComponent(id))
    .then(r => setMeasurements(r.measurements || []))
    .catch(e => toast(e.message))
}, [id])
const setTanitaValue = (key, value) => {
  setMeasurementForm(m => ({
    ...m,
    tanita: {
      ...m.tanita,
      [key]: value
    }
  }))
}

const setCircumferenceValue = (key, value) => {
  setMeasurementForm(m => ({
    ...m,
    circumferences: {
      ...m.circumferences,
      [key]: value
    }
  }))
}

const saveMeasurement = () => {
  api('/api/admin/user/measurements', {
    method: 'POST',
    body: JSON.stringify({
      id,
      ...measurementForm
    })
  })
    .then(r => {
      setMeasurements(rows => [r.measurement, ...rows])

      toast('Measurement saved')

      setAddingMeasurement(false)

      setMeasurementForm({
        date: new Date().toISOString().slice(0, 10),

        tanita: {
          weight: '',
          bodyFatPct: '',
          muscleMass: '',
          boneMass: '',
          bmi: '',
          bmr: '',
          metabolicAge: '',
          bodyWaterPct: '',
          visceralFat: ''
        },

        circumferences: {
          chest: '',
          waist: '',
          abdomen: '',
          hips: '',
          thigh: '',
          calf: '',
          arm: ''
        }
      })
    })
    .catch(e => toast(e.message))
}

  if (!d) return <div className="muted small">Loading…</div>
  const u = d.user
  const setDisabled = disabled => {
    api('/api/admin/user/disable', { method: 'POST', body: JSON.stringify({ id: u.id, disabled }) })
      .then(() => { toast(disabled ? 'User disabled' : 'User enabled'); onChanged(); close() })
      .catch(e => toast(e.message))
}
const resetPassword = () => {
  if (newPassword.length < 8) {
    toast('La contraseña debe tener al menos 8 caracteres')
    return
  }

  api('/api/admin/user/password', {
    method: 'POST',
    body: JSON.stringify({
      id: u.id,
      password: newPassword
    })
  })
    .then(() => {
      toast('Contraseña actualizada')
      setNewPassword('')
    })
    .catch(e => toast(e.message))
}
  
  return <>
    <h3 className="capitalize">{u.name}</h3>
{u.username && (
  <div className="small muted" style={{ marginTop: -4, marginBottom: 10 }}>
    Usuario: <strong>{u.username}</strong>
  </div>
)}
    <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '8px 0 12px' }}>
      {u.admin && <span className="tag acc">admin</span>}
      {u.disabled && <span className="tag" style={{ color: 'var(--red)' }}>disabled</span>}
      {u.invitedBy && <span className="tag">invite {u.invitedBy}</span>}
      <span className="tag">joined {u.created ? fmtDate(u.created.slice(0, 10)) : '—'}</span>
    </div>
    <div className="tiles" style={{ textAlign: 'left' }}>
      <div className="tile"><div className="l">Workouts</div><div className="v" style={{ fontSize: '1.1rem' }}>{d.workouts.length}</div></div>
      <div className="tile"><div className="l">Weigh-ins</div><div className="v" style={{ fontSize: '1.1rem' }}>{d.bodyweight.length}</div></div>
      <div className="tile"><div className="l">Routines</div><div className="v" style={{ fontSize: '1.1rem' }}>{d.routines.length}</div></div>
      <div className="tile"><div className="l">Last sync</div><div className="v" style={{ fontSize: '.95rem' }}>{rel(d.lastSync)}</div></div>
    </div>

<div className="card" style={{ marginTop: 14, padding: 14 }}>
  <h4 style={{ margin: '0 0 10px' }}>Cambiar contraseña</h4>

  <input
    className="input"
    type="password"
    placeholder="Nueva contraseña"
    value={newPassword}
    onChange={e => setNewPassword(e.target.value)}
    autoComplete="new-password"
  />

  <div style={{ height: 10 }} />

  <Button
    variant="primary"
    onClick={resetPassword}
    disabled={newPassword.length < 8}
  >
    Restablecer contraseña
  </Button>
</div>
<div style={{ marginTop: 14 }}>
  <div className="row between">
    <div>
      <h4 className="sec" style={{ margin: 0 }}>
        Body composition
      </h4>

      <div className="small muted" style={{ marginTop: 4 }}>
        {measurements.length
          ? `${measurements.length} measurement${measurements.length === 1 ? '' : 's'}`
          : 'No measurements yet'}
      </div>
    </div>

    <Button
      variant="primary"
      size="sm"
      icon="plus"
      onClick={() => setAddingMeasurement(v => !v)}
    >
      New measurement
    </Button>
  </div>

  {addingMeasurement && (
    <div
      className="card"
      style={{
        marginTop: 12,
        padding: 14
      }}
    >
      <h4 style={{ marginTop: 0 }}>Tanita measurement</h4>

      <label className="small muted">Date</label>

      <input
        type="date"
        value={measurementForm.date}
        onChange={e =>
          setMeasurementForm(m => ({
            ...m,
            date: e.target.value
          }))
        }
        style={{
          width: '100%',
          margin: '4px 0 14px',
          padding: 10
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10
        }}
      >
        {[
          ['weight', 'Weight (kg)'],
          ['bodyFatPct', 'Body fat (%)'],
          ['muscleMass', 'Muscle mass (kg)'],
          ['boneMass', 'Bone mass (kg)'],
          ['bmi', 'BMI'],
          ['bmr', 'BMR (kcal)'],
          ['metabolicAge', 'Metabolic age'],
          ['bodyWaterPct', 'Body water (%)'],
          ['visceralFat', 'Visceral fat']
        ].map(([key, label]) => (
          <label key={key} className="small">
            <span className="muted">{label}</span>

            <input
              type="number"
              step="any"
              value={measurementForm.tanita[key]}
              onChange={e => setTanitaValue(key, e.target.value)}
              style={{
                width: '100%',
                marginTop: 4,
                padding: 10
              }}
            />
          </label>
        ))}
      </div>

      <h4 style={{ margin: '18px 0 10px' }}>
        Circumferences
      </h4>

      <div className="small muted" style={{ marginBottom: 10 }}>
        Optional · centimeters
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10
        }}
      >
        {[
          ['chest', 'Chest'],
          ['waist', 'Waist'],
          ['abdomen', 'Abdomen'],
          ['hips', 'Hips'],
          ['thigh', 'Thigh'],
          ['calf', 'Calf'],
          ['arm', 'Arm']
        ].map(([key, label]) => (
          <label key={key} className="small">
            <span className="muted">{label}</span>

            <input
              type="number"
              step="any"
              value={measurementForm.circumferences[key]}
              onChange={e =>
                setCircumferenceValue(key, e.target.value)
              }
              style={{
                width: '100%',
                marginTop: 4,
                padding: 10
              }}
            />
          </label>
        ))}
      </div>

      <div
        className="row"
        style={{
          gap: 8,
          marginTop: 16
        }}
      >
        <Button
          variant="primary"
          onClick={saveMeasurement}
        >
          Save measurement
        </Button>

        <Button
          onClick={() => setAddingMeasurement(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  )}

  {!!measurements.length && (
    <div style={{ marginTop: 12 }}>
      {measurements.slice(0, 5).map(m => (
        <div
          key={m.id}
          className="row between"
          style={{
            padding: '9px 2px',
            borderBottom: '1px solid var(--sep)'
          }}
        >
          <div>
            <div className="small" style={{ fontWeight: 600 }}>
              {fmtDate(m.date)}
            </div>

            <div className="dim" style={{ fontSize: '.72rem' }}>
              {m.tanita?.bodyFatPct != null
                ? `${m.tanita.bodyFatPct}% fat`
                : 'Body composition'}
              {m.tanita?.muscleMass != null
                ? ` · ${m.tanita.muscleMass} kg muscle`
                : ''}
            </div>
          </div>

          <div style={{ fontWeight: 600 }}>
            {m.tanita?.weight ?? '—'} kg
          </div>
        </div>
      ))}
    </div>
  )}
</div>

{!u.admin && !choosingPlan && <button
  className="btn primary"
  style={{ margin: '12px 0 4px' }}
  onClick={() => {
    api('/api/admin/plans')
      .then(({ plans }) => {
        if (!plans?.length) {
          toast('No saved coach plans')
          return
        }

        setPlans(plans)
        setChoosingPlan(true)
      })
      .catch(e => toast(e.message))
  }}
>
  Assign plan
</button>}
{choosingPlan && <>
  <h4 className="sec">Choose training plan</h4>

  <div className="list">
    {plans.map(p => (
      <div
        key={p.id}
        className="item"
        onClick={() => confirmSheet({
          title: `Assign ${p.name} to ${u.name}?`,
          message: 'The training plan and weekly schedule will be copied. Workout history and bodyweight data will not be changed.',
          confirmText: 'Assign plan',
          onConfirm: () => api('/api/admin/user/assign-plan', {
            method: 'POST',
            body: JSON.stringify({
              id: u.id,
              planId: p.id
            })
          })
            .then(r => {
              toast(`Assigned ${r.plan}`)
              onChanged()
              close()
            })
            .catch(e => toast(e.message))
        })}
      >
        <div className="grow">
          <div className="tt">{p.name}</div>
          <div className="ss">
            {p.routines} routines
            {p.description ? ` · ${p.description}` : ''}
          </div>
        </div>

        <Icon name="chevronRight" className="chev" />
      </div>
    ))}
  </div>

  <Button
    size="sm"
    onClick={() => setChoosingPlan(false)}
    style={{ marginTop: 10 }}
  >
    Cancel
  </Button>
</>}
{!u.admin && (
  <Button
    onClick={() => confirmSheet({
      title: `¿Eliminar a ${u.name}?`,
      message: 'Esta acción eliminará la cuenta del usuario. No se puede deshacer.',
      confirmText: 'Eliminar usuario',
      onConfirm: () => api('/api/admin/user/delete', {
        method: 'POST',
        body: JSON.stringify({ id: u.id })
      })
        .then(() => {
          toast('Usuario eliminado')
          onChanged()
          close()
        })
        .catch(e => toast(e.message))
    })}
    style={{
      marginTop: 16,
      marginBottom: 8,
      color: 'var(--red)'
    }}
  >
    Eliminar usuario
  </Button>
)}   
 <h4 className="sec">Workout history</h4>
    {d.workouts.length ? <div className="list" style={{ gap: 0 }}>
      {d.workouts.slice(0, 60).map(w => <div key={w.id} className="row between" style={{ padding: '9px 2px', borderBottom: '1px solid var(--sep)' }}>
        <div><div className="small" style={{ fontWeight: 600 }}>{w.name}</div>
          <div className="dim" style={{ fontSize: '.72rem' }}>{fmtDate(w.d, true)} · {fmtDur((w.end || w.start) - w.start)} · {setsDone(w)} sets{w.prs?.length ? ' · ' + w.prs.length + ' PR' : ''}</div></div>
        <span className="small muted">{fmtVol(w.vol ?? workoutVolume(w), d.unit)}</span>
      </div>)}
    </div> : <div className="empty small">No workouts logged.</div>}
  </>
}

function InvitesCard({ invites, reload }) {
  const toast = useUI(s => s.toast)
  const gen = () => api('/api/admin/invites/new', { method: 'POST', body: '{}' })
    .then(({ invite }) => { navigator.clipboard?.writeText(invite.code).catch(() => {}); toast('Code ' + invite.code + ' created & copied'); reload() })
    .catch(e => toast(e.message))
  const revoke = code => api('/api/admin/invites/revoke', { method: 'POST', body: JSON.stringify({ code }) })
    .then(() => { toast('Code revoked'); reload() }).catch(e => toast(e.message))
  const open = (invites || []).filter(i => !i.usedBy)
  const used = (invites || []).filter(i => i.usedBy)
  return <div className="card">
    <div className="row between"><h2 style={{ margin: 0 }}>Invite codes</h2>
      <Button variant="primary" size="sm" onClick={gen} icon="plus">Generate</Button></div>
    <div className="small muted" style={{ margin: '6px 0 10px' }}>{open.length} unused · {used.length} redeemed</div>
    {open.map(i => <div key={i.code} className="row between" style={{ padding: '7px 2px', borderBottom: '1px solid var(--sep)' }}>
      <span style={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontWeight: 500, letterSpacing: '.06em' }}
        onClick={() => { navigator.clipboard?.writeText(i.code).catch(() => {}); toast('Copied ' + i.code) }}>{i.code}</span>
      <button className="iconbtn" style={{ width: 32, height: 30, borderRadius: 8, fontSize: 15, color: 'var(--red)' }} onClick={() => revoke(i.code)} aria-label="revoke"><Icon name="trash" /></button>
    </div>)}
    {used.map(i => <div key={i.code} className="row between dim" style={{ padding: '7px 2px', fontSize: '.8rem' }}>
      <span style={{ fontFamily: 'monospace' }}>{i.code}</span><span>→ {i.usedByName || 'used'}</span>
    </div>)}
    {!open.length && !used.length && <div className="dim small">No codes yet — generate one to invite someone.</div>}
  </div>
}

// Who signed in, who tried and failed, what an admin changed. A card rather than its own route:
// the dashboard is deliberately one page of cards, and the 95 % use of this is a glance at the
// last twenty events. Paging follows Library.jsx's house style — "Show more", not page numbers.
function AuditCard({ tick }) {
  const toast = useUI(s => s.toast)
  const [meta, setMeta] = useState(null)      // last response minus the rows: total, retention, …
  const [rows, setRows] = useState([])
  const [cat, setCat] = useState('')

  const load = (c, before) => api('/api/admin/audit?limit=50&cat=' + c + (before ? '&before=' + before : ''))
    .then(r => { setMeta(r); setRows(x => (before ? x.concat(r.events) : r.events)) })
    .catch(e => toast(e.message))
  const pick = c => { setCat(c); setRows([]); setMeta(null); load(c) }
  // Reloads on mount and whenever the header's ↻ bumps the tick. Deliberately not on the 15s
  // poll that drives "training now": this is history, not presence.
  useEffect(() => { load(cat) }, [tick])

  const clear = () => confirmSheet({
    title: 'Clear the activity log?',
    message: 'Every recorded event is deleted. The clear itself is logged, so the gap stays visible.',
    confirmText: 'Clear', danger: true,
    onConfirm: () => api('/api/admin/audit/clear', { method: 'POST', body: '{}' })
      .then(() => { toast('Activity log cleared'); pick(cat) }).catch(e => toast(e.message))
  })

  if (meta && !meta.enabled) return null      // AUDIT_LOG=0 — the card isn't there at all

  return <div className="card">
    <div className="row between"><h2 style={{ margin: 0 }}>Activity log</h2>
      <button className="iconbtn" style={{ width: 32, height: 30, borderRadius: 8, fontSize: 15, color: 'var(--red)' }}
        onClick={clear} aria-label="clear log"><Icon name="trash" /></button></div>
    <div className="small muted" style={{ margin: '6px 0 10px' }}>
      {meta ? fmtNum(meta.total) + ' events'
        + (meta.retention.days ? ' · last ' + meta.retention.days + ' days' : '')
        + (meta.ip_mode === 'off' ? ' · no IP addresses' : '') : 'Loading…'}</div>
    <div className="chips" style={{ marginBottom: 10 }}>
      {[['', 'All'], ['auth', 'Sign-ins'], ['admin', 'Admin'], ['fail', 'Failed']].map(([v, l]) =>
        <button key={v} className={'chip' + (cat === v ? ' on' : '')} onClick={() => pick(v)}>{l}</button>)}
    </div>
    {rows.map(e => {
      const line = auditLine(e)
      return <div key={e.id} className="row between" style={{ padding: '8px 2px', borderBottom: '1px solid var(--sep)' }}>
        <div className="grow">
          <div className="small" style={{ fontWeight: 600 }}>{line.title}
            {/* a red pill, not a red row: twenty fumbled Face IDs in a row shouldn't read as an incident */}
            {!e.ok && <span className="tag" style={{ marginLeft: 6, color: 'var(--red)' }}>failed</span>}
            {auditCat(e.ev) === 'admin' && <span className="tag acc" style={{ marginLeft: 6 }}>admin</span>}</div>
          {line.sub && <div className="dim" style={{ fontSize: '.72rem' }}>{line.sub}</div>}
        </div>
        <span className="small muted" style={{ flex: 'none', marginLeft: 8 }}>{fmtWhen(e.ts, meta?.now)}</span>
      </div>
    })}
    {meta && !rows.length && <div className="dim small">Nothing logged yet.</div>}
    {meta?.nextBefore && <div style={{ marginTop: 10 }}>
      <Button size="sm" onClick={() => load(cat, meta.nextBefore)}>Show more</Button></div>}
  </div>
}

export default function Admin() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const openSheet = useUI(s => s.openSheet)
  const [users, setUsers] = useState(null)
  const [invites, setInvites] = useState(null)
  const [plans, setPlans] = useState([])
  const [inviteOnly, setInviteOnly] = useState(false)
  const [tick, setTick] = useState(0)          // the ↻ button; the activity log listens to it

  const loadUsers = () => api('/api/admin/users').then(d => { setUsers(d.users); setInviteOnly(d.invite_only) }).catch(e => toast(e.message || 'Failed to load'))
  const loadInvites = () => api('/api/admin/invites').then(d => setInvites(d.invites)).catch(() => {})
  const loadPlans = () => api('/api/admin/plans')
  .then(d => setPlans(d.plans || []))
  .catch(e => toast(e.message || 'Failed to load plans'))
  // poll every 15s so the "training now" section stays live without a manual refresh
  useEffect(() => { if (!user?.admin) return; loadUsers(); loadInvites();loadPlans(); const iv = setInterval(loadUsers, 15000); return () => clearInterval(iv) }, [])
  if (!user?.admin) return null

  const openUser = id => openSheet(close => <UserDetail id={id} onChanged={loadUsers} close={close} />)
  const liveUsers = (users || []).filter(u => u.live)
  const activeCount = (users || []).filter(u => u.lastSync && Date.now() - u.lastSync < 7 * 86400000).length
  const disabledCount = (users || []).filter(u => u.disabled).length

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label="Back"><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8 }}><h1 style={{ margin: 0 }}>Admin</h1>
        <div className="sub">{users ? users.length + ' users · ' + activeCount + ' active this week' : 'Loading…'}</div></div>
      <button className="iconbtn" onClick={() => { loadUsers(); loadInvites(); setTick(n => n + 1) }} aria-label="refresh">↻</button>
    </div>

    <div className="tiles" style={{ marginBottom: 12 }}>
      <div className="tile"><div className="l">Users</div><div className="v">{users ? users.length : '—'}</div></div>
      <div className="tile"><div className="l">Training now</div><div className="v" style={{ color: liveUsers.length ? 'var(--acc)' : undefined }}>{users ? liveUsers.length : '—'}</div></div>
      <div className="tile"><div className="l">Active 7d</div><div className="v">{users ? activeCount : '—'}</div></div>
      <div className="tile"><div className="l">Disabled</div><div className="v">{users ? disabledCount : '—'}</div></div>
    </div>

    {liveUsers.length > 0 && <div className="card" style={{ borderColor: 'var(--acc)' }}>
      <h2 className="row" style={{ margin: '0 0 8px', gap: 6 }}><Icon name="dot" style={{ fontSize: 10, color: 'var(--green)' }} />Training now</h2>
      {liveUsers.map(u => <div key={u.id} className="row between" style={{ padding: '8px 2px', borderBottom: '1px solid var(--sep)' }} onClick={() => openUser(u.id)}>
        <div><div className="small" style={{ fontWeight: 600 }}>{u.name}</div>
          <div className="dim" style={{ fontSize: '.72rem' }}>{u.live.name} · ex {u.live.exIdx}/{u.live.exTotal} · {u.live.setsDone}/{u.live.setsTotal} sets</div></div>
        <span className="tag acc">{dur(Date.now() - u.live.startedAt)}</span>
      </div>)}
    </div>}
    <div className="card">
  <div className="row between">
    <h2 style={{ margin: 0 }}>Coach plans</h2>

    <Button
      variant="primary"
      size="sm"
      icon="plus"
      onClick={() => {
        const name = window.prompt('Plan name');

        if (!name?.trim()) return;

        api('/api/admin/plans', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim()
          })
        })
          .then(() => {
            toast('Plan saved');
            loadPlans();
          })
          .catch(e => toast(e.message));
      }}
    >
      Save current
    </Button>
  </div>

  <div
    className="small muted"
    style={{ margin: '6px 0 10px' }}
  >
    {plans.length} saved plans
  </div>

  {plans.map(p => (
    <div
      key={p.id}
      className="row between"
      style={{
        padding: '9px 2px',
        borderBottom: '1px solid var(--sep)'
      }}
    >
      <div>
        <div
          className="small"
          style={{ fontWeight: 600 }}
        >
          {p.name}
        </div>

        <div
          className="dim"
          style={{ fontSize: '.72rem' }}
        >
          {p.routines} routines
        </div>
      </div>
    </div>
  ))}

  {!plans.length && (
    <div className="dim small">
      No coach plans saved yet.
    </div>
  )}
</div>
    <InvitesCard invites={invites} reload={loadInvites} />

    <h4 className="sec">Users</h4>
    <div className="list">
      {(users || []).map(u => <div key={u.id} className="item" onClick={() => openUser(u.id)} style={u.disabled ? { opacity: .55 } : null}>
        <div className="grow"><div className="tt">{u.live && <Icon name="dot" style={{ fontSize: 9, color: 'var(--green)', display: 'inline-block', marginRight: 5 }} />}{u.name} {u.admin && <span className="tag acc" style={{ marginLeft: 4 }}>admin</span>}{u.disabled && <span className="tag" style={{ marginLeft: 4, color: 'var(--red)' }}>off</span>}</div>
          <div className="ss">{u.live ? 'training now · ' + u.live.name : u.workouts + ' workouts' + (u.lastWorkout ? ' · last ' + fmtDate(u.lastWorkout) : '') + ' · synced ' + rel(u.lastSync)}</div></div>
        {u.hasPush && <Icon name="bell" title="push enabled" style={{ fontSize: 15, color: 'var(--label-3)' }} />}<Icon name="chevronRight" className="chev" />
      </div>)}
      {users && !users.length && <div className="empty">No users yet.</div>}
    </div>

    <div style={{ marginTop: 14 }}><AuditCard tick={tick} /></div>
  </div>
}
