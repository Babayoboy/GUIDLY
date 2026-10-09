import { useState } from 'react'
import { useStore } from './store'
import Nav from './Nav'
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
const rules = {
  name: (v) => (!v.trim() ? 'Enter your full name.' : ''),
  email: (v) => (!v.trim() ? 'Enter your email address.' : !isEmail(v.trim()) ? 'That email doesn’t look right. Try name@example.com.' : ''),
  password: (v) => (!v ? 'Enter your password.' : v.length < 6 ? 'Password must be at least 6 characters.' : ''),
}
export default function Login({ onBack }) {
  const { set } = useStore()
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('student')
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState({})
  const [sent, setSent] = useState('')
  const ch = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (err[k]) setErr({ ...err, [k]: '' }) }
  const field = (k, label, type, ph, auto) => (
    <div className="fgroup">
      <label className="lbl" htmlFor={k}>{label}</label>
      <input id={k} className={'field' + (err[k] ? ' bad' : '')} type={type} placeholder={ph} value={f[k]} onChange={ch(k)} aria-invalid={!!err[k]} autoComplete={auto} />
      {err[k] && <p className="err" role="alert">{err[k]}</p>}
    </div>)
  const submit = (e) => {
    e.preventDefault()
    const keys = mode === 'login' ? ['name', 'email', 'password'] : ['email']
    const errs = {}; keys.forEach((k) => { const m = rules[k](f[k]); if (m) errs[k] = m })
    setErr(errs)
    if (Object.keys(errs).length) return setTimeout(() => document.querySelector('[aria-invalid="true"]')?.focus(), 0)
    if (mode === 'forgot') return setSent(f.email.trim())
    set({ user: { role, name: f.name.trim(), email: f.email.trim() } })
  }
  const switchMode = (m) => { setMode(m); setErr({}); setSent('') }
  return (<>
    <Nav onBrand={onBack}><button className="pill" onClick={onBack}>← Back</button></Nav>
    <main><section className="layer in applayer" style={{ '--w': 'min(480px,100%)', alignItems: 'center' }}>
      <form className="box appbox" onSubmit={submit} noValidate>
        {mode === 'login' ? (<>
          <p className="eyebrow">Welcome</p>
          <h2>Log in to <em>start.</em></h2>
          <p className="lead" style={{ marginTop: 0 }}>Choose how you want to use Guidly.</p>
          <div className="roles">
            <button type="button" className={'role' + (role === 'student' ? ' on' : '')} onClick={() => setRole('student')}><b>I need guidance</b><small>Student seeking a mentor</small></button>
            <button type="button" className={'role' + (role === 'mentor' ? ' on' : '')} onClick={() => setRole('mentor')}><b>I’m a mentor</b><small>Offer mentorship</small></button>
          </div>
          <div className="form" style={{ maxWidth: 'none' }}>
            {field('name', 'Full name', 'text', 'Your name', 'name')}
            {field('email', 'Email', 'email', 'name@example.com', 'email')}
            {field('password', 'Password', 'password', 'At least 6 characters', 'current-password')}
            <button type="button" className="linkbtn" style={{ alignSelf: 'flex-start' }} onClick={() => switchMode('forgot')}>Forgot password?</button>
          </div>
          <button className="btn fill" style={{ marginTop: 6 }}>Continue →</button>
        </>) : (<>
          <p className="eyebrow">Account</p>
          <h2>Reset your <em>password.</em></h2>
          <p className="lead" style={{ marginTop: 0 }}>Enter the email you signed up with and we’ll send you a reset link.</p>
          <div className="form" style={{ maxWidth: 'none' }}>{field('email', 'Email', 'email', 'name@example.com', 'email')}</div>
          {sent && <p className="okbox">If an account exists for <b>{sent}</b>, a reset link is on its way. <small>(Demo mode: no email service is connected, so nothing is actually sent.)</small></p>}
          <div className="actions" style={{ marginTop: 6 }}>
            <button className="btn fill">Send reset link</button>
            <button type="button" className="btn sm" onClick={() => switchMode('login')}>← Back to log in</button>
          </div>
        </>)}
      </form>
    </section></main>
  </>)
}
