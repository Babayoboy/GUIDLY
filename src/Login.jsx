import { useState, useContext } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './context/AuthContext'
import Nav from './Nav'
const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v)
export default function Login({ onBack }) {
  const { setUser } = useAuth()
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('student')
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState({})
  const [sent, setSent] = useState('')
  const [submitErr, setSubmitErr] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const ch = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (err[k]) setErr({ ...err, [k]: '' }) }
  const field = (k, label, type, ph, auto, showToggle) => (
    <div className="fgroup">
      <label className="lbl" htmlFor={k}>{label}</label>
      <div className="inp">
        <input id={k} className={'field' + (err[k] ? ' bad' : '')} type={showToggle && showPw ? 'text' : type} placeholder={ph} value={f[k]} onChange={ch(k)} aria-invalid={!!err[k]} autoComplete={auto} />
        {showToggle && <button type="button" className="eye" onClick={() => setShowPw(!showPw)}>{showPw ? 'Hide' : 'Show'}</button>}
      </div>
      {err[k] && <p className="err" role="alert">{err[k]}</p>}
    </div>)
  const switchMode = (m) => { setMode(m); setErr({}); setSent(''); setSubmitErr('') }
  const submit = async (e) => {
    e.preventDefault()
    const n = {}
    if (mode === 'signup') {
      if (f.name.trim().length < 2) n.name = 'Enter your full name.'
      if (!isEmail(f.email.trim())) n.email = 'Enter a valid email, like you@example.com.'
      if (f.password.length < 8) n.password = 'Use at least 8 characters.'
    } else if (mode === 'login') {
      if (!isEmail(f.email.trim())) n.email = 'Enter a valid email, like you@example.com.'
      if (f.password.length < 8) n.password = 'Use at least 8 characters.'
    } else if (mode === 'forgot') {
      if (!isEmail(f.email.trim())) n.email = 'Enter your email first to reset password.'
    }
    setErr(n)
    setSubmitErr('')
    if (Object.keys(n).length) return setTimeout(() => document.querySelector('[aria-invalid="true"]')?.focus(), 0)
    if (!supabase) { setSubmitErr('Authentication is not configured yet.'); return }
    setIsLoading(true)
    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password })
        if (error) throw error
        await setUser(data.user)
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: f.email.trim(),
          password: f.password,
          options: { data: { full_name: f.name.trim(), requested_account_type: role === 'mentor' ? 'expert' : 'learner' } }
        })
        if (error) throw error
        if (!data.session) {
          setSubmitErr(role === 'mentor'
            ? 'Account created. Verify your email, then log in to manage your expert profile.'
            : 'Account created. Check your email to verify it, then log in.')
          setMode('login')
          setF({ name: '', email: '', password: '' })
          return
        }
        await setUser(data.user)
        if (role === 'mentor') setSubmitErr('Your expert profile is listed. Complete your details from Profile.')
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email.trim())
        if (error) throw error
        setSent(f.email.trim())
        setSubmitErr('Password reset link sent to your email!')
      }
    } catch (e) {
      setSubmitErr(e.message || 'Authentication failed.')
    } finally {
      setIsLoading(false)
    }
  }
  return (<>
    <Nav onBrand={onBack}><button className="pill" onClick={onBack}>← Back</button></Nav>
    <main><section className="layer in applayer" style={{ '--w': 'min(480px,100%)', alignItems: 'center' }}>
      <form className="box appbox" onSubmit={submit} noValidate>
        {mode === 'login' ? (<>
          <p className="eyebrow">Welcome back</p>
          <h2>Log in to <em>continue.</em></h2>
          <div className="form" style={{ maxWidth: 'none' }}>
            {field('email', 'Email', 'email', 'name@example.com', 'email')}
            {field('password', 'Password', 'password', 'At least 8 characters', 'current-password', true)}
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}><input type="checkbox" /> Remember me</label>
              <button type="button" className="linkbtn" style={{ alignSelf: 'flex-start' }} onClick={() => switchMode('forgot')}>Forgot password?</button>
            </div>
          </div>
          {submitErr && <p className="err" style={{ marginTop: 8 }}>{submitErr}</p>}
          <button className="btn fill" style={{ marginTop: 6 }} disabled={isLoading}>{isLoading ? 'Signing in...' : 'Continue →'}</button>
          <p className="linkbtn" style={{ marginTop: 12, textAlign: 'center' }}>
            Don't have an account? <button type="button" onClick={() => switchMode('signup')}>Sign up</button>
          </p>
        </>) : mode === 'signup' ? (<>
          <p className="eyebrow">Get started</p>
          <h2>Create your <em>account.</em></h2>
          <p className="lead" style={{ marginTop: 0 }}>Choose how you want to use Guidly.</p>
          <div className="roles" role="radiogroup" aria-label="I want to">
            <button type="button" className={'role' + (role === 'student' ? ' on' : '')} onClick={() => setRole('student')}>
              <input type="radio" name="role" checked={role === 'student'} onChange={() => setRole('student')} style={{ display: 'none' }} />
              <b>I need guidance</b><small>Student seeking a mentor</small>
            </button>
            <button type="button" className={'role' + (role === 'mentor' ? ' on' : '')} onClick={() => setRole('mentor')}>
              <input type="radio" name="role" checked={role === 'mentor'} onChange={() => setRole('mentor')} style={{ display: 'none' }} />
              <b>I'm a mentor</b><small>Offer mentorship</small>
            </button>
          </div>
          <div className="form" style={{ maxWidth: 'none' }}>
            {field('name', 'Full name', 'text', 'Your name', 'name')}
            {field('email', 'Email', 'email', 'name@example.com', 'email')}
            {field('password', 'Password', 'password', 'At least 8 characters', 'new-password', true)}
          </div>
          {submitErr && <p className="err" style={{ marginTop: 8 }}>{submitErr}</p>}
          <button className="btn fill" style={{ marginTop: 6 }} disabled={isLoading}>{isLoading ? 'Creating account...' : 'Create account →'}</button>
          <p className="linkbtn" style={{ marginTop: 12, textAlign: 'center' }}>
            Already have an account? <button type="button" onClick={() => switchMode('login')}>Log in</button>
          </p>
        </>) : (<>
          <p className="eyebrow">Account</p>
          <h2>Reset your <em>password.</em></h2>
          <p className="lead" style={{ marginTop: 0 }}>Enter the email you signed up with and we'll send you a reset link.</p>
          <div className="form" style={{ maxWidth: 'none' }}>{field('email', 'Email', 'email', 'name@example.com', 'email')}</div>
          {sent && <p className="okbox">If an account exists for <b>{sent}</b>, a reset link is on its way.</p>}
          {submitErr && <p className="err" style={{ marginTop: 8 }}>{submitErr}</p>}
          <div className="actions" style={{ marginTop: 6 }}>
            <button className="btn fill" disabled={isLoading}>{isLoading ? 'Sending...' : 'Send reset link'}</button>
            <button type="button" className="btn sm" onClick={() => switchMode('login')}>← Back to log in</button>
          </div>
        </>)}
      </form>
    </section></main>
  </>)
}