import { useEffect, useRef, useState } from 'react'
import { useStore, nt } from './store'
import { matchMentor, EXPERTISE, money, INR_RATE } from './data'
import { useExperts } from './useExperts'
import { supabase } from './lib/supabase'
import { useAuth } from './context/AuthContext'

const Video = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>)
const Bubble = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>)
const Phone = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>)

const Head = ({ eyebrow, title, em, note }) => (<>
  <p className="eyebrow">{eyebrow}</p><h2>{title} <em>{em}</em></h2>{note && <p className="lead" style={{ marginTop: 0 }}>{note}</p>}
</>)
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
const isPhone = (v) => /^\+?\d{10,13}$/.test(v.replace(/[\s-]/g, ''))

/* ---------- Mentors: keyword search + filters ---------- */
const uniq = (a) => [...new Set(a)].sort()
const LABEL = { field: 'Field', college: 'College', degree: 'Degree', career: 'Career', skill: 'Skill' }
const EMPTY = { field: '', college: '', degree: '', career: '', skill: '', rate: '' }
const HINTS = ['IIT', 'B.Tech', 'Product Manager', 'Python', 'MBA prep']

export function Mentors({ go, onCall }) {
  const { s, set } = useStore()
  const { experts, loading, error } = useExperts()
  const [q, setQ] = useState('')
  const [f, setF] = useState(EMPTY)
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState(null)
  const cur = s.currency || 'INR'
  const options = { field: uniq(experts.map((m) => m.field).filter(Boolean)), college: uniq(experts.map((m) => m.college).filter(Boolean)), degree: uniq(experts.map((m) => m.degree).filter(Boolean)), career: uniq(experts.flatMap((m) => m.careers)), skill: uniq(experts.flatMap((m) => m.skills)) }
  const n = Object.values(f).filter(Boolean).length
  const list = experts.filter((m) => matchMentor(m, q) && (!f.field || m.field === f.field) && (!f.college || m.college === f.college) && (!f.degree || m.degree === f.degree)
    && (!f.career || m.careers.includes(f.career)) && (!f.skill || m.skills.includes(f.skill)) && (!f.rate || m.rate <= +f.rate))
  const book = (m) => {
    if (s.wallet.student < m.rate) return setMsg({ bad: true, text: `Not enough balance to book ${m.name} (${money(m.rate, cur)}). Add funds in Wallet.` })
    set((p) => ({
      wallet: { student: p.wallet.student - m.rate, mentor: p.wallet.mentor + m.rate },
      sessions: [...p.sessions, { id: Date.now(), mentor: m.name, rate: m.rate, when: 'To be scheduled' }],
      tx: [{ id: Date.now(), text: `Session with ${m.name}`, amt: -m.rate }, ...p.tx],
      ...nt(p, 'sessions', `Session booked with ${m.name}.`),
    }))
    setMsg({ text: `Session booked with ${m.name}.` })
  }
  const save = (m) => set((p) => ({ saved: p.saved.includes(m.name) ? p.saved.filter((x) => x !== m.name) : [...p.saved, m.name] }))
  return (<>
    <Head eyebrow="Find mentor" title="Experts available" em="this week." note="Explore mentor profiles and find guidance for your next step." />
    <div className="search">
      <input type="search" placeholder="Search by college, degree, career or skill…" value={q} onChange={(e) => setQ(e.target.value)} />
      <button className={'btn sm' + (show || n ? ' fill' : '')} onClick={() => setShow(!show)}>Filters{n ? ` · ${n}` : ''}</button>
    </div>
    <div className="hints"><small>Try:</small>{HINTS.map((h) => <button key={h} className="chip" onClick={() => setQ(h)}>{h}</button>)}</div>
    {show && (
      <div className="fgrid">
        {Object.keys(LABEL).map((k) => (
          <div key={k}><label className="lbl">{LABEL[k]}</label>
            <select className="field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}><option value="">Any</option>{options[k].map((o) => <option key={o}>{o}</option>)}</select></div>))}
        <div><label className="lbl">Max rate / hour</label>
          <select className="field" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })}><option value="">Any</option>{[499, 999, 1999, 2999].map((r) => <option key={r} value={r}>Up to {money(r, cur)}</option>)}</select></div>
        <div style={{ alignSelf: 'end' }}><button className="btn sm" onClick={() => { setF(EMPTY); setQ('') }}>Clear all</button></div>
      </div>)}
    {msg && <p className={msg.bad ? 'err' : 'okline'}>{msg.text}</p>}
    <p className="count">{loading ? 'Loading expert profiles…' : `${list.length} expert${list.length === 1 ? '' : 's'}`}</p>
    {error && <p className="lead">{error}</p>}
    <div className="grid mgrid">{list.map((m) => (
      <div className="card mcard" key={m.id}>
        <div className="mtop">
          <div className="avatar md">{m.name.replace('Dr. ', '')[0]}</div>
          <div className="mname"><h3>{m.name}</h3><small>{m.role}</small></div>
          {m.rating != null && <span className="rpill">★ {m.rating}</span>}
        </div>
        <p className="bio">{m.bio}</p>
        {(m.degree || m.college) && <p className="meta">{[m.degree, m.college].filter(Boolean).join(' · ')}</p>}
        <div className="tags"><span className="tag">{m.field}</span>{m.skills.slice(0, 2).map((x) => <span className="tag" key={x}>{x}</span>)}</div>
        <div className="mfoot">
          <div className="price"><b>{money(m.rate, cur)}</b><small>/ hour</small></div>
          <button className="btn sm fill" onClick={() => book(m)}>Book session</button>
        </div>
        <div className="mtools">
          <button onClick={() => go('messages', m.name)}><Bubble />Chat</button>
          <button onClick={() => onCall(m.name, 'voice')}><Phone />Voice</button>
          <button onClick={() => onCall(m.name, 'video')}><Video />Video</button>
          <button onClick={() => save(m)}><span className="star">{s.saved.includes(m.name) ? '★' : '☆'}</span>{s.saved.includes(m.name) ? 'Saved' : 'Save'}</button>
        </div>
      </div>))}
      {!loading && !error && !list.length && <p className="lead">No experts match. Try fewer keywords or clear the filters.</p>}</div>
  </>)
}

/* ---------- Sessions ---------- */
export function Sessions({ go }) {
  const { s, set } = useStore()
  const cur = s.currency || 'INR'
  const [rate, setRate] = useState(null)
  const [stars, setStars] = useState(0)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const open = (id) => { setRate(rate === id ? null : id); setStars(0); setText(''); setErr('') }
  const submit = (x) => {
    if (!stars) return setErr('Pick a star rating first.')
    set((p) => ({ sessions: p.sessions.map((y) => (y.id === x.id ? { ...y, rated: stars } : y)), reviews: [{ id: Date.now(), mentor: x.mentor, from: p.user.name, rating: stars, text: text.trim(), time: Date.now() }, ...p.reviews] }))
    setRate(null)
  }
  return (<>
    <Head eyebrow="Sessions" title="Your sessions &" em="saved mentors." />
    <h3 className="sub">Booked sessions</h3>
    {!s.sessions.length && <p className="lead">No sessions yet. Book one from Mentors.</p>}
    {s.sessions.map((x) => (
      <div className="item col" key={x.id}>
        <div className="between"><b>{x.mentor}</b><span>{x.when}</span><span>{money(x.rate, cur)}</span>
          <span className="actions" style={{ margin: 0 }}>
            <button className="btn sm" onClick={() => go('messages', x.mentor)}>Message</button>
            {x.rated ? <span className="ok">★ {x.rated} rated</span> : <button className="btn sm fill" onClick={() => open(x.id)}>Rate</button>}</span></div>
        {rate === x.id && (
          <div className="ratebox">
            <div className="stars">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={n <= stars ? 'on' : ''} onClick={() => { setStars(n); setErr('') }} aria-label={`${n} star${n > 1 ? 's' : ''}`}>★</button>)}</div>
            <input className="field" placeholder="A few words about your session (optional)" value={text} onChange={(e) => setText(e.target.value)} />
            {err && <p className="err">{err}</p>}
            <div><button className="btn sm fill" onClick={() => submit(x)}>Submit rating</button></div>
          </div>)}
      </div>))}
    <h3 className="sub">Saved mentors</h3>
    {!s.saved.length && <p className="lead">Nothing saved yet.</p>}
    {s.saved.map((n) => <div className="item" key={n}><b>{n}</b><button className="btn sm" onClick={() => go('messages', n)}>Message</button></div>)}
  </>)
}

/* ---------- Messages: chat on the left, people on the right ---------- */
const ini = (n) => n.replace('Dr. ', '')[0]
const dur = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const fsize = (b) => (b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB')
const MAXF = 1.5 * 1024 * 1024
const readURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob) })
const Ico = ({ d, size = 15 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>)
const CLIP = 'M21 11.5l-8.6 8.6a5 5 0 0 1-7-7l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9'
const MIC = 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v1a7 7 0 0 1-14 0v-1M12 18v4'

function VoiceNote({ m }) {
  const a = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  useEffect(() => {
    const el = new Audio(m.url); a.current = el
    el.onended = () => { setPlaying(false); setPos(0) }
    el.ontimeupdate = () => setPos(isFinite(el.duration) && el.duration > 0 ? el.currentTime / el.duration : Math.min(1, el.currentTime / m.dur))
    return () => el.pause()
  }, [m.url])
  const toggle = () => { const el = a.current; if (playing) { el.pause(); setPlaying(false) } else { el.volume = 1; el.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) } }
  const bars = m.peaks || Array(32).fill(0.4)
  return (
    <div className="vn">
      <button type="button" className="vnplay" onClick={toggle} aria-label={playing ? 'Pause voice note' : 'Play voice note'}>{playing ? '❚❚' : '▶'}</button>
      <div className="vnbars">{bars.map((h, i) => <i key={i} className={i / bars.length < pos ? 'on' : ''} style={{ height: Math.max(14, h * 100) + '%' }} />)}</div>
      <span className="vntime">{dur(playing ? Math.round(pos * m.dur) : m.dur)}</span>
    </div>)
}

function Chat({ name, onBack, onCall }) {
  const { s, set } = useStore()
  const role = s.user.role
  const msgs = s.threads[role][name] || []
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [rec, setRec] = useState(false)
  const [secs, setSecs] = useState(0)
  const [level, setLevel] = useState(0)
  const mr = useRef(null), chunks = useRef([]), samples = useRef([]), tick = useRef(null), ctxRef = useRef(null), cancel = useRef(false), t0 = useRef(0), endRef = useRef(null), fileRef = useRef(null)
  const push = (m) => set((p) => ({ threads: { ...p.threads, [role]: { ...p.threads[role], [name]: [...(p.threads[role][name] || []), { from: 'me', ...m }] } } }))
  const stopAudio = () => { clearInterval(tick.current); ctxRef.current?.close?.(); ctxRef.current = null }
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])
  useEffect(() => () => { stopAudio(); if (mr.current?.state === 'recording') { cancel.current = true; mr.current.stop() } }, [])
  const send = (e) => { e.preventDefault(); if (!text.trim()) return; push({ text: text.trim() }); setText('') }
  const attach = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return
    setErr('')
    if (f.size > MAXF) return setErr(`“${f.name}” is too large. The demo limit is 1.5 MB per file.`)
    try { push({ kind: 'file', name: f.name, size: f.size, mime: f.type, url: await readURL(f) }) } catch { setErr('Couldn’t read that file. Try another one.') }
  }
  const stop = (discard) => { cancel.current = !!discard; stopAudio(); setRec(false); if (mr.current?.state === 'recording') mr.current.stop() }
  const start = async () => {
    setErr('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return setErr('Voice notes aren’t supported in this browser.')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported?.(t))
      const m = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunks.current = []; samples.current = []; cancel.current = false
      const AC = window.AudioContext || window.webkitAudioContext
      const ctx = new AC(); ctxRef.current = ctx
      const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an)
      const buf = new Uint8Array(an.fftSize)
      m.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      m.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop()); if (cancel.current) return
        const all = samples.current, peak = Math.max(0, ...all)
        if (peak < 0.03) return setErr('We couldn’t hear anything. Check that your microphone is on and not muted, then try again.')
        const n = 32, size = Math.max(1, Math.floor(all.length / n))
        const peaks = Array.from({ length: n }, (_, i) => Math.max(0, ...all.slice(i * size, (i + 1) * size)) / peak)
        const d = Math.max(1, Math.round((Date.now() - t0.current) / 1000))
        try { push({ kind: 'voice', dur: d, peaks, url: await readURL(new Blob(chunks.current, { type: m.mimeType || 'audio/webm' })) }) } catch { setErr('Couldn’t save the voice note.') }
      }
      m.start(200); mr.current = m; t0.current = Date.now(); setSecs(0); setRec(true)
      tick.current = setInterval(() => {
        an.getByteTimeDomainData(buf); let pk = 0; for (const v of buf) pk = Math.max(pk, Math.abs(v - 128) / 128)
        samples.current.push(pk); setLevel(pk)
        const sc = Math.round((Date.now() - t0.current) / 1000); setSecs(sc); if (sc >= 45) stop(false)
      }, 100)
    } catch { setErr('Microphone access was blocked. Allow it in your browser settings to record voice notes.') }
  }
  return (
    <div className="chatpanel">
      <div className="chathead">
        <button className="btn sm icon backbtn" onClick={onBack} aria-label="Back to conversations">←</button>
        <div className="avatar sm">{ini(name)}</div><b>{name}</b><span className="grow" />
        <button className="btn sm" onClick={() => onCall(name, 'voice')} title="Voice call"><Phone /> Voice</button>
        <button className="btn sm" onClick={() => onCall(name, 'video')} title="Video call"><Video /> Video</button>
      </div>
      <div className="msgs">
        {!msgs.length && <p className="note" style={{ margin: 'auto' }}>Say hello 👋</p>}
        {msgs.map((m, i) => m.kind === 'call' ? <div key={i} className="callnote">{m.mode === 'video' ? '🎥 Video call' : '📞 Voice call'} · {dur(m.dur)}</div>
          : m.kind === 'voice' ? <div key={i} className={'bubble ' + m.from}><VoiceNote m={m} /></div>
          : m.kind === 'file' ? <div key={i} className={'bubble file ' + m.from}>{m.mime?.startsWith('image/') && <img src={m.url} alt={m.name} />}<a href={m.url} download={m.name}>📎 {m.name}</a><small>{fsize(m.size)}</small></div>
          : <div key={i} className={'bubble ' + m.from}>{m.text}</div>)}
        <div ref={endRef} />
      </div>
      {err && <p className="err" style={{ margin: '0 12px 8px' }}>{err}</p>}
      {rec ? (
        <div className="send recbar"><span className="dot" />Recording {dur(secs)}<span className="lvl"><i style={{ transform: `scaleX(${Math.min(1, level * 3)})` }} /></span><span className="grow" />
          <button type="button" className="btn sm" onClick={() => stop(true)}>Cancel</button><button type="button" className="btn sm fill" onClick={() => stop(false)}>Send</button></div>
      ) : (
        <form className="send" onSubmit={send}>
          <button type="button" className="btn sm icon" title="Attach a file or PDF" aria-label="Attach a file" onClick={() => fileRef.current.click()}><Ico d={CLIP} /></button>
          <input ref={fileRef} type="file" hidden onChange={attach} />
          <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
          {text.trim() ? <button className="btn sm fill">Send</button> : <button type="button" className="btn sm icon" title="Record a voice note" aria-label="Record a voice note" onClick={start}><Ico d={MIC} /></button>}
        </form>)}
    </div>)
}

export function Messages({ chat, onCall }) {
  const { s } = useStore()
  const { experts } = useExperts()
  const role = s.user.role
  const threads = s.threads[role]
  const [cur, setCur] = useState(chat || null)
  const people = role === 'mentor' ? s.mentees.map((m) => ({ name: m.name })) : experts.map((m) => ({ name: m.name, sub: m.role }))
  Object.keys(threads).forEach((n) => { if (!people.find((p) => p.name === n)) people.push({ name: n }) })
  const has = (n) => (threads[n] || []).length > 0
  people.sort((a, b) => has(b.name) - has(a.name))
  const last = (n) => { const m = (threads[n] || []).slice(-1)[0]; return !m ? 'No messages yet' : m.kind === 'file' ? '📎 ' + m.name : m.kind === 'voice' ? '🎙 Voice note' : m.kind === 'call' ? (m.mode === 'video' ? '🎥 Video call' : '📞 Voice call') : (m.from === 'me' ? 'You: ' : '') + m.text }
  return (<>
    <Head eyebrow="Messages" title="Your" em="conversations." />
    <div className={'msgwrap' + (cur ? ' has-chat' : '')}>
      {cur ? <Chat key={cur} name={cur} onBack={() => setCur(null)} onCall={onCall} />
        : <div className="chatpanel empty"><Ico d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" size={26} /><span>Select a conversation to start chatting</span></div>}
      <aside className="plist">
        <small className="lbl">{role === 'mentor' ? 'Mentees' : 'Mentors'}</small>
        {people.map((p) => (
          <button key={p.name} className={'crow' + (p.name === cur ? ' on' : '')} onClick={() => setCur(p.name)}>
            <div className="avatar sm">{ini(p.name)}</div><span><b>{p.name}</b><small>{last(p.name)}</small></span></button>))}
      </aside>
    </div>
  </>)
}

/* ---------- Events ---------- */
export function Events() {
  const { s, set } = useStore()
  const [f, setF] = useState({ title: '', date: '', desc: '' })
  const [e, setE] = useState('')
  const create = (ev) => {
    ev.preventDefault()
    if (!f.title.trim() || !f.date || !f.desc.trim()) return setE('Add a title, a date and a short description.')
    setE('')
    set((p) => ({ events: [{ id: Date.now(), ...f, host: `${p.user.name} (new mentor)` }, ...p.events], ...nt(p, 'events', `Your free event “${f.title}” is live.`) }))
    setF({ title: '', date: '', desc: '' })
  }
  const reg = (ev) => set((p) => {
    const on = p.registered.includes(ev.id)
    return { registered: on ? p.registered.filter((x) => x !== ev.id) : [...p.registered, ev.id], ...(on ? {} : nt(p, 'events', `You’re registered for “${ev.title}”.`)) }
  })
  return (<>
    <Head eyebrow="Free events" title="Free consulting from" em="new mentors." note="New mentors host free sessions to get started. Register to join." />
    {s.user.role === 'mentor' && (
      <form className="form" onSubmit={create} noValidate>
        <h3 className="sub">Create a free event</h3>
        <input className="field" placeholder="Event title" value={f.title} onChange={(x) => setF({ ...f, title: x.target.value })} />
        <input className="field" type="date" value={f.date} onChange={(x) => setF({ ...f, date: x.target.value })} />
        <textarea className="field" placeholder="What will you cover?" value={f.desc} onChange={(x) => setF({ ...f, desc: x.target.value })} />
        {e && <p className="err">{e}</p>}
        <div><button className="btn sm fill">Publish event</button></div>
      </form>)}
    <div className="grid" style={{ marginTop: 20 }}>{s.events.map((ev) => (
      <div className="card" key={ev.id}><span className="tag">Free</span><h3 style={{ marginTop: 10 }}>{ev.title}</h3><small>{ev.host} · {ev.date}</small><p className="bio">{ev.desc}</p>
        <button className={'btn sm' + (s.registered.includes(ev.id) ? '' : ' fill')} onClick={() => reg(ev)}>{s.registered.includes(ev.id) ? '✓ Registered' : 'Register'}</button></div>))}</div>
  </>)
}

/* ---------- Resources ---------- */
export function Resources() {
  const { s, set } = useStore()
  const [f, setF] = useState({ title: '', link: '' })
  const [e, setE] = useState('')
  const add = (ev) => {
    ev.preventDefault()
    if (!f.title.trim()) return setE('Give the resource a title.')
    if (!/^https?:\/\/\S+\.\S+/.test(f.link.trim())) return setE('Enter a valid link starting with http:// or https://')
    setE('')
    set((p) => ({ resources: [{ id: Date.now(), title: f.title.trim(), link: f.link.trim(), by: p.user.name }, ...p.resources], ...nt(p, 'resources', `You shared “${f.title.trim()}”.`) }))
    setF({ title: '', link: '' })
  }
  return (<>
    <Head eyebrow="Resources" title="Shared" em="knowledge." note="Guides, templates and links shared by mentors." />
    {s.user.role === 'mentor' && (
      <form className="form" onSubmit={add} noValidate><h3 className="sub">Share a resource</h3>
        <input className="field" placeholder="Title" value={f.title} onChange={(x) => setF({ ...f, title: x.target.value })} />
        <input className="field" placeholder="https://link" value={f.link} onChange={(x) => setF({ ...f, link: x.target.value })} />
        {e && <p className="err">{e}</p>}
        <div><button className="btn sm fill">Share</button></div></form>)}
    {s.resources.map((r) => <div className="item" key={r.id}><b>{r.title}</b><span>by {r.by}</span><a className="btn sm" href={r.link} target="_blank" rel="noreferrer">Open ↗</a></div>)}
  </>)
}

/* ---------- Wallet ---------- */
const METHODS = [['Google Pay', 'UPI', 'upi'], ['Razorpay', 'Cards, UPI, netbanking', 'razorpay'], ['Paytm / PhonePe / other UPI', 'Any UPI app', 'upi'], ['Debit / credit card', 'Visa, Mastercard, RuPay', 'card']]
const MIN_TOPUP = 249, MAX_TOPUP = 50000
const luhn = (n) => { let sum = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9 } sum += d; alt = !alt } return sum % 10 === 0 }
const EMPTY_CARD = { number: '', expiry: '', cvv: '', name: '' }

export function Wallet() {
  const { s, set } = useStore()
  const role = s.user.role
  const bal = s.wallet[role]
  const cur = s.currency || 'INR'
  const [amt, setAmt] = useState('')
  const [mi, setMi] = useState(0)
  const [upi, setUpi] = useState('')
  const [card, setCard] = useState(EMPTY_CARD)
  const [errs, setErrs] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [label, kind] = [METHODS[mi][0], METHODS[mi][2]]
  const clr = (k) => setErrs((e) => ({ ...e, [k]: '' }))
  const validate = () => {
    const e = {}, n = Number(amt)
    if (!amt.trim()) e.amt = 'Enter the amount you want to add.'
    else if (!Number.isInteger(n) || n <= 0) e.amt = 'Enter a valid amount in whole rupees.'
    else if (n < MIN_TOPUP) e.amt = `The minimum top-up is ₹${MIN_TOPUP}.`
    else if (n > MAX_TOPUP) e.amt = `The maximum top-up is ₹${MAX_TOPUP.toLocaleString('en-IN')} at a time.`
    if (kind === 'upi' && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi.trim())) e.upi = 'Enter a valid UPI ID, like name@okbank.'
    if (kind === 'card') {
      const num = card.number.replace(/\s/g, '')
      if (num.length < 13 || !luhn(num)) e.number = 'Enter a valid card number.'
      const m = card.expiry.match(/^(\d{2})\/(\d{2})$/)
      const now = new Date()
      if (!m || +m[1] < 1 || +m[1] > 12 || 2000 + +m[2] < now.getFullYear() || (2000 + +m[2] === now.getFullYear() && +m[1] < now.getMonth() + 1)) e.expiry = 'Enter a valid expiry date (MM/YY).'
      if (!/^\d{3,4}$/.test(card.cvv)) e.cvv = 'Enter the 3 or 4 digit CVV.'
      if (!card.name.trim()) e.cname = 'Enter the name on the card.'
    }
    return e
  }
  const pay = (ev) => {
    ev.preventDefault(); setDone('')
    const e = validate(); setErrs(e)
    if (Object.keys(e).length) return
    const v = Number(amt); setBusy(true)
    setTimeout(() => {
      set((p) => ({ wallet: { ...p.wallet, [role]: p.wallet[role] + v }, tx: [{ id: Date.now(), text: `Top-up via ${label}`, amt: v }, ...p.tx], ...nt(p, 'system', `${money(v, cur)} added via ${label}.`) }))
      setBusy(false); setAmt(''); setUpi(''); setCard(EMPTY_CARD); setDone(`${money(v, cur)} added to your wallet via ${label}.`)
    }, 1200)
  }
  const withdraw = () => set((p) => ({ wallet: { ...p.wallet, [role]: 0 }, tx: [{ id: Date.now(), text: 'Withdrawal', amt: -p.wallet[role] }, ...p.tx], ...nt(p, 'system', `${money(p.wallet[role], cur)} withdrawn.`) }))
  return (<>
    <Head eyebrow="Wallet" title="Your" em={role === 'mentor' ? 'earnings.' : 'balance.'} note={role === 'mentor' ? 'Earnings from booked sessions.' : 'Add money to book sessions.'} />
    <div className="seg" role="group" aria-label="Currency">
      {['INR', 'USD'].map((c) => <button key={c} className={cur === c ? 'on' : ''} onClick={() => set({ currency: c })}>{c === 'INR' ? '₹ INR' : '$ USD'}</button>)}
    </div>
    <div className="balance"><small>Balance</small><div className="big">{money(bal, cur)}</div>
      {role === 'mentor' && <div className="actions"><button className="btn sm fill" disabled={bal <= 0} onClick={withdraw}>Withdraw all</button></div>}</div>

    <div className={'walletcols' + (role === 'student' ? ' two' : '')}>
    {role === 'student' && (
      <form className="form topup" onSubmit={pay} noValidate>
        <h3 className="sub">Add money</h3>
        <div className="fgroup">
          <label className="lbl" htmlFor="amt">Amount</label>
          <div className={'amt' + (errs.amt ? ' bad' : '')}><span>₹</span><input id="amt" inputMode="numeric" placeholder={`Minimum ${MIN_TOPUP}`} value={amt} onChange={(e) => { setAmt(e.target.value.replace(/[^\d]/g, '').slice(0, 6)); clr('amt'); setDone('') }} /></div>
          {errs.amt && <p className="err">{errs.amt}</p>}
        </div>
        <div className="fgroup">
          <label className="lbl">Pay with</label>
          <div className="pms">{METHODS.map(([n, sub], i) => (
            <button type="button" key={n} className={'pm' + (mi === i ? ' on' : '')} onClick={() => { setMi(i); setErrs({}); setDone('') }}><b>{n}</b><small>{sub}</small></button>))}</div>
        </div>
        {kind === 'upi' && (
          <div className="fgroup"><label className="lbl" htmlFor="upi">UPI ID</label>
            <input id="upi" className={'field' + (errs.upi ? ' bad' : '')} placeholder="name@okbank" value={upi} onChange={(e) => { setUpi(e.target.value); clr('upi') }} autoComplete="off" />
            {errs.upi && <p className="err">{errs.upi}</p>}</div>)}
        {kind === 'razorpay' && <p className="hintt" style={{ margin: 0 }}>You’ll complete the payment in the Razorpay checkout (demo).</p>}
        {kind === 'card' && (<>
          <div className="fgroup"><label className="lbl">Card number</label>
            <input className={'field' + (errs.number ? ' bad' : '')} inputMode="numeric" autoComplete="off" placeholder="1234 5678 9012 3456" value={card.number} onChange={(e) => { setCard({ ...card, number: e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim() }); clr('number') }} />
            {errs.number && <p className="err">{errs.number}</p>}</div>
          <div className="two2">
            <div className="fgroup"><label className="lbl">Expiry</label>
              <input className={'field' + (errs.expiry ? ' bad' : '')} inputMode="numeric" autoComplete="off" placeholder="MM/YY" value={card.expiry} onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 4); setCard({ ...card, expiry: d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d }); clr('expiry') }} />
              {errs.expiry && <p className="err">{errs.expiry}</p>}</div>
            <div className="fgroup"><label className="lbl">CVV</label>
              <input className={'field' + (errs.cvv ? ' bad' : '')} type="password" inputMode="numeric" autoComplete="off" placeholder="•••" value={card.cvv} onChange={(e) => { setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }); clr('cvv') }} />
              {errs.cvv && <p className="err">{errs.cvv}</p>}</div>
          </div>
          <div className="fgroup"><label className="lbl">Name on card</label>
            <input className={'field' + (errs.cname ? ' bad' : '')} autoComplete="off" placeholder="As printed on the card" value={card.name} onChange={(e) => { setCard({ ...card, name: e.target.value }); clr('cname') }} />
            {errs.cname && <p className="err">{errs.cname}</p>}</div>
        </>)}
        {done && <p className="okline" style={{ margin: 0 }}>✓ {done}</p>}
        <button className="btn fill" style={{ marginTop: 4, justifyContent: 'center' }} disabled={busy}>{busy ? 'Processing…' : `Add ${amt ? '₹' + Number(amt).toLocaleString('en-IN') : 'money'}`}</button>
        <small className="hintt" style={{ margin: 0 }}>Demo checkout: no real payment is processed and card details are never saved.</small>
      </form>)}

    <section className="txcol">
      <h3 className="sub">Transactions</h3>
      {!s.tx.length && <p className="lead">No transactions yet.</p>}
      {s.tx.map((t) => <div className="item" key={t.id}><span>{t.text}</span><b className={t.amt > 0 ? 'pos' : 'neg'}>{t.amt > 0 ? '+' : '−'}{money(Math.abs(t.amt), cur)}</b></div>)}
    </section>
    </div>
  </>)
}

/* ---------- Profile ---------- */
function VerifyField({ label, type, value, verified, onChange, onVerified, validate, placeholder, err }) {
  const [code, setCode] = useState(null)
  const [entry, setEntry] = useState('')
  const [msg, setMsg] = useState('')
  const send = () => { const e = validate(value); if (e) return setMsg(e); setCode(String(Math.floor(100000 + Math.random() * 900000))); setEntry(''); setMsg('') }
  const confirm = () => { if (entry.trim() === code) { onVerified(); setCode(null); setMsg('') } else setMsg('That code doesn’t match. Check it and try again.') }
  return (
    <div className="fgroup">
      <label className="lbl">{label}</label>
      <div className="vrow">
        <input className={'field' + (err ? ' bad' : '')} type={type} value={value} placeholder={placeholder} onChange={(e) => { onChange(e.target.value); setCode(null); setMsg('') }} />
        {verified ? <span className="ok">✓ Verified</span> : <button type="button" className="btn sm" onClick={send}>Verify</button>}
      </div>
      {code && !verified && (
        <div className="vbox"><small>Demo mode: no {type === 'email' ? 'email' : 'SMS'} service is connected, so your code is <b>{code}</b>.</small>
          <div className="vrow"><input className="field" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={entry} onChange={(e) => setEntry(e.target.value)} /><button type="button" className="btn sm fill" onClick={confirm}>Confirm</button></div></div>)}
      {(err || msg) && <p className="err">{err || msg}</p>}
    </div>)
}
const PREF = [['messages', 'Messages', 'When someone messages you'], ['sessions', 'Sessions & bookings', 'Bookings, feedback and reminders'], ['events', 'Free events', 'New events from new mentors'], ['resources', 'Resources', 'New guides and templates shared']]

export function Profile() {
  const { s, set } = useStore()
  const { user: authUser } = useAuth()
  const role = s.user.role
  const base = role === 'mentor' ? { bio: '', field: '', rate: 499, expertise: [] } : { bio: '', goal: '', college: '' }
  const [d, setD] = useState(() => ({ avatar: '', phone: '', verified: { email: false, phone: false }, ...base, ...s.profile[role], name: s.user.name, email: s.user.email }))
  const [errs, setErrs] = useState({})
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [custom, setCustom] = useState('')
  useEffect(() => {
    if (role !== 'mentor' || !authUser?.id || !supabase) return
    let active = true
    Promise.all([
      supabase.from('profiles').select('display_name,headline').eq('id', authUser.id).maybeSingle(),
      supabase.from('expert_profiles').select('bio,rate_paise,expert_categories(category_slug,categories(name))').eq('user_id', authUser.id).maybeSingle(),
    ]).then(([{ data: account }, { data: expert }]) => {
      if (!active) return
      const expertise = (expert?.expert_categories || []).map((link) => {
        const category = Array.isArray(link.categories) ? link.categories[0] : link.categories
        return category?.name || link.category_slug
      })
      setD((current) => ({
        ...current,
        name: account?.display_name || current.name,
        field: account?.headline || current.field,
        bio: expert?.bio ?? current.bio,
        rate: expert?.rate_paise != null ? Number(expert.rate_paise) / 100 : current.rate,
        expertise: expertise.length ? expertise : current.expertise,
      }))
    })
    return () => { active = false }
  }, [role, authUser?.id])
  const ch = (k, v) => { setSaved(false); setErrs((e) => ({ ...e, [k]: '' })); setD((x) => ({ ...x, [k]: v, verified: k === 'email' || k === 'phone' ? { ...x.verified, [k]: false } : x.verified })) }
  const ver = (k) => setD((x) => ({ ...x, verified: { ...x.verified, [k]: true } }))
  const toggleX = (t) => ch('expertise', d.expertise.includes(t) ? d.expertise.filter((y) => y !== t) : [...d.expertise, t])
  const addX = (e) => { if (e.key !== 'Enter') return; e.preventDefault(); const v = custom.trim(); if (v && !d.expertise.includes(v)) ch('expertise', [...d.expertise, v]); setCustom('') }
  const pick = (e) => {
    const file = e.target.files[0]; if (!file) return
    if (!file.type.startsWith('image/')) return setErrs((x) => ({ ...x, avatar: 'Please choose an image file (JPG or PNG).' }))
    const img = new Image(), url = URL.createObjectURL(file)
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 256
      const m = Math.min(img.width, img.height)
      c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 256, 256)
      ch('avatar', c.toDataURL('image/jpeg', 0.85)); setErrs((x) => ({ ...x, avatar: '' })); URL.revokeObjectURL(url)
    }
    img.src = url; e.target.value = ''
  }
  const emailErr = (v) => (!v.trim() ? 'Enter your email address.' : !isEmail(v.trim()) ? 'That email doesn’t look right. Try name@example.com.' : '')
  const phoneErr = (v) => (!v.trim() ? 'Enter your mobile number.' : !isPhone(v) ? 'Enter a valid mobile number (10–13 digits, optional +country code).' : '')
  const save = async () => {
    const e = {}
    if (!d.name.trim()) e.name = 'Enter your name.'
    const em = emailErr(d.email); if (em) e.email = em
    if (d.phone.trim() && phoneErr(d.phone)) e.phone = phoneErr(d.phone)
    if (role === 'mentor' && !(+d.rate >= 199 && +d.rate <= 2999)) e.rate = 'Rates on Guidly range from ₹199 to ₹2,999 per hour.'
    setErrs(e); setSaveError(''); if (Object.keys(e).length) return setSaved(false)
    const { name, email, ...rest } = d
    if (role === 'mentor') {
      if (!supabase || !authUser?.id) {
        setSaveError('Could not identify your account. Please sign in again.')
        setSaved(false)
        return
      }
      const { error: profileError } = await supabase.from('profiles').update({
        display_name: name.trim(),
        headline: d.field.trim() || 'Independent expert',
      }).eq('id', authUser.id)
      if (profileError) {
        setSaveError('Could not save your public profile details. Please try again.')
        setSaved(false)
        return
      }
      const { error: expertError } = await supabase.from('expert_profiles').upsert({
        user_id: authUser.id,
        bio: d.bio.trim(),
        rate_paise: Math.round(Number(d.rate) * 100),
        currency: 'INR',
        is_published: true,
      })
      if (expertError) {
        setSaveError('Could not save your expert profile. Please try again.')
        setSaved(false)
        return
      }
      const { data: categories, error: categoriesError } = await supabase.from('categories').select('slug,name')
      if (categoriesError) {
        setSaveError('Profile saved, but categories could not be loaded. Please retry.')
        setSaved(false)
        return
      }
      const selected = new Set(d.expertise.map((item) => item.trim().toLowerCase()))
      const categoryLinks = (categories || [])
        .filter((category) => selected.has(category.name.trim().toLowerCase()) || selected.has(category.slug.trim().toLowerCase()))
        .map((category) => ({ expert_id: authUser.id, category_slug: category.slug }))
      const { error: deleteCategoriesError } = await supabase.from('expert_categories').delete().eq('expert_id', authUser.id)
      if (deleteCategoriesError) {
        setSaveError('Profile saved, but categories could not be updated.')
        setSaved(false)
        return
      }
      if (categoryLinks.length) {
        const { error: insertCategoriesError } = await supabase.from('expert_categories').insert(categoryLinks)
        if (insertCategoriesError) {
          setSaveError('Profile saved, but categories could not be updated.')
          setSaved(false)
          return
        }
      }
    }
    set((p) => ({ user: { ...p.user, name: name.trim(), email: email.trim() }, profile: { ...p.profile, [role]: rest }, ...nt(p, 'system', 'Profile saved.') }))
    setSaved(true)
  }
  const inp = (k, ph, type = 'text') => (<input className={'field' + (errs[k] ? ' bad' : '')} type={type} value={d[k] ?? ''} placeholder={ph} onChange={(e) => ch(k, e.target.value)} />)
  const row = (label, k, ph, type) => (<div className="fgroup"><label className="lbl">{label}</label>{inp(k, ph, type)}{errs[k] && <p className="err">{errs[k]}</p>}</div>)
  return (
    <div className="pwrap">
      <p className="eyebrow">Profile</p>
      <h2>Manage your <em>profile.</em></h2>
      <div className="pgrid">
        <aside className="pcard pleft">
          <div className="avatar-lg">{d.avatar ? <img src={d.avatar} alt="Profile" /> : <span>{(d.name || '?')[0].toUpperCase()}</span>}</div>
          <b>{d.name || 'Your name'}</b><small>{role === 'mentor' ? 'Mentor' : 'Student'}</small>
          <div className="actions" style={{ justifyContent: 'center' }}>
            <label className="btn sm fill" style={{ cursor: 'pointer' }}>Upload photo<input type="file" accept="image/*" hidden onChange={pick} /></label>
            {d.avatar && <button type="button" className="btn sm" onClick={() => ch('avatar', '')}>Remove</button>}
          </div>
          {errs.avatar && <p className="err">{errs.avatar}</p>}
          <div className="badges"><span className={'bdg' + (d.verified.email ? ' on' : '')}>Email {d.verified.email ? 'verified' : 'not verified'}</span><span className={'bdg' + (d.verified.phone ? ' on' : '')}>Mobile {d.verified.phone ? 'verified' : 'not verified'}</span></div>
        </aside>
        <div className="pright">
          <section className="pcard">
            <h3 className="ptitle">Personal details</h3>
            {row('Full name', 'name', 'Your name')}
            <VerifyField label="Email" type="email" value={d.email} verified={d.verified.email} placeholder="name@example.com" err={errs.email} validate={emailErr} onChange={(v) => ch('email', v)} onVerified={() => ver('email')} />
            <VerifyField label="Mobile number" type="tel" value={d.phone} verified={d.verified.phone} placeholder="+91 98765 43210" err={errs.phone} validate={phoneErr} onChange={(v) => ch('phone', v)} onVerified={() => ver('phone')} />
            <div className="fgroup"><label className="lbl">About you</label><textarea className="field" value={d.bio} placeholder="A short intro" onChange={(e) => ch('bio', e.target.value)} /></div>
            {role === 'student' ? <>{row('Career goal', 'goal', 'e.g. Software internship')}{row('College', 'college', 'Your college')}</>
              : <>{row('Professional headline', 'field', 'e.g. Product designer, Career coach')}{row('Rate per hour (₹199–₹2,999)', 'rate', '499', 'number')}</>}
          </section>
          {role === 'mentor' && (
            <section className="pcard">
              <h3 className="ptitle">What you can mentor on</h3>
              <small className="hintt">Pick the topics you have real knowledge of. Students see these when searching.</small>
              <div className="chips">{[...EXPERTISE, ...d.expertise.filter((x) => !EXPERTISE.includes(x))].map((t) => <button type="button" key={t} className={'chip' + (d.expertise.includes(t) ? ' on' : '')} onClick={() => toggleX(t)}>{t}</button>)}</div>
              <input className="field" value={custom} placeholder="Add your own and press Enter" onChange={(e) => setCustom(e.target.value)} onKeyDown={addX} />
            </section>)}
          <section className="pcard">
            <h3 className="ptitle">Notifications</h3>
            {PREF.map(([k, l, sub]) => (
              <label className="switch" key={k}><span><b>{l}</b><small>{sub}</small></span>
                <input type="checkbox" checked={s.notifPrefs[k] !== false} onChange={(e) => set((p) => ({ notifPrefs: { ...p.notifPrefs, [k]: e.target.checked } }))} /><i /></label>))}
          </section>
          <div className="saverow"><button className="btn fill" style={{ marginTop: 0 }} onClick={save}>Save changes</button>{saved && <span className="okline">✓ Profile saved</span>}{saveError && <p className="err">{saveError}</p>}</div>
        </div>
      </div>
    </div>)
}

/* ---------- Stats (mentors): feedback received + comparison ---------- */
export function Stats() {
  const { s } = useStore()
  const mine = s.reviews.filter((r) => r.mentor === s.user.name || r.mentor === '__me__')
  const sample = mine.some((r) => r.mentor === '__me__')
  const count = mine.length
  const avg = count ? mine.reduce((a, r) => a + r.rating, 0) / count : 0
  const ago = (t) => { const d = Math.floor((Date.now() - t) / 864e5); return d < 1 ? 'today' : d + 'd ago' }
  return (<>
    <Head eyebrow="Stats" title="Your feedback &" em="ratings." note="Ratings students give you after sessions." />
    {sample && <p className="hintt">Sample reviews are shown until students rate you.</p>}
    {!count ? <p className="lead" style={{ marginTop: 20 }}>No ratings yet. They’ll appear here after students rate your sessions.</p> : (<>
      <div className="tiles">
        <div className="tile"><b>★ {avg.toFixed(1)}</b><small>Average rating</small></div>
        <div className="tile"><b>{count}</b><small>Reviews</small></div>
      </div>
      <h3 className="sub">Rating breakdown</h3>
      <div className="bars">{[5, 4, 3, 2, 1].map((n) => { const c = mine.filter((r) => r.rating === n).length; return (
        <div className="brow" key={n} style={{ gridTemplateColumns: '38px 1fr 28px' }}><span>{n} ★</span><div className="btrack"><i style={{ width: (c / count) * 100 + '%' }} /></div><span>{c}</span></div>) })}</div>
      <p className="hintt">Mentor-wide comparisons are not available yet.</p>
      <h3 className="sub">Feedback from students</h3>
      {mine.map((r) => (
        <div className="item col" key={r.id}>
          <div className="between"><b>{r.from}</b><span className="gold">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span><span>{ago(r.time)}</span></div>
          {r.text && <span style={{ textAlign: 'left' }}>{r.text}</span>}
        </div>))}
    </>)}
  </>)
}
