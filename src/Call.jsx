import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
export default function Call({ name, mode, onEnd }) {
  const { set } = useStore()
  const video = mode === 'video'
  const [stream, setStream] = useState(null)
  const [err, setErr] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [on, setOn] = useState(false)
  const [secs, setSecs] = useState(0)
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(video)
  const [level, setLevel] = useState(0)
  const vid = useRef(null)

  // join with the user's own mic (and camera for video calls)
  useEffect(() => {
    let st, ctx, id, dead = false
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
        st = await navigator.mediaDevices.getUserMedia({ audio: true, video })
        if (dead) { st.getTracks().forEach((t) => t.stop()); return }
        setStream(st)
        const AC = window.AudioContext || window.webkitAudioContext
        ctx = new AC(); const an = ctx.createAnalyser(); an.fftSize = 512
        ctx.createMediaStreamSource(st).connect(an)
        const buf = new Uint8Array(an.fftSize)
        id = setInterval(() => { an.getByteTimeDomainData(buf); let p = 0; for (const v of buf) p = Math.max(p, Math.abs(v - 128) / 128); setLevel(p) }, 120)
      } catch { setErr(video ? 'Camera or microphone access was blocked. Allow both in your browser settings, then try again.' : 'Microphone access was blocked. Allow it in your browser settings, then try again.') }
    })()
    return () => { dead = true; clearInterval(id); st?.getTracks().forEach((t) => t.stop()); ctx?.close?.() }
  }, [video, attempt])
  useEffect(() => { if (vid.current && stream) vid.current.srcObject = stream }, [stream, cam])
  useEffect(() => { if (!stream) return; const t = setTimeout(() => setOn(true), 1500); return () => clearTimeout(t) }, [stream])
  useEffect(() => { if (!on) return; const i = setInterval(() => setSecs((x) => x + 1), 1000); return () => clearInterval(i) }, [on])

  const toggleMic = () => { stream?.getAudioTracks().forEach((t) => (t.enabled = !mic)); setMic(!mic) }
  const toggleCam = () => { stream?.getVideoTracks().forEach((t) => (t.enabled = !cam)); setCam(!cam) }
  const end = () => {
    if (on) set((p) => { const r = p.user.role, th = p.threads[r]; return { threads: { ...p.threads, [r]: { ...th, [name]: [...(th[name] || []), { from: 'me', kind: 'call', mode, dur: secs }] } } } })
    onEnd()
  }
  useEffect(() => { const k = (e) => e.key === 'Escape' && end(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) })
  const status = err ? '' : !stream ? (video ? 'Starting camera…' : 'Starting microphone…') : on ? `Connected · ${fmt(secs)}` : 'Calling…'
  return (
    <div className="callov" role="dialog" aria-label={`${video ? 'Video' : 'Voice'} call with ${name}`}>
      <div className={'callbox' + (video ? ' video' : '')}>
        <small className="lbl" style={{ margin: 0 }}>{video ? 'Video call' : 'Voice call'}</small>
        {video ? (
          <div className="stage">
            <div className="avatar-lg" style={{ width: 72, height: 72, fontSize: '1.8rem' }}>{name.replace('Dr. ', '')[0]}</div>
            <b>{name}</b><span className="note">{status}</span>
            <small className="note tiny">Demo: {name}’s video will appear here once a call server is connected.</small>
            {stream && cam ? <video ref={vid} className="pip" autoPlay muted playsInline /> : <div className="pip off">{stream ? 'Camera off' : ''}</div>}
          </div>
        ) : (<>
          <div className="avatar-lg" style={{ width: 84, height: 84, fontSize: '2rem' }}>{name.replace('Dr. ', '')[0]}</div>
          <h3>{name}</h3><span className="note">{status}</span>
          <small className="note tiny">Demo: the other side connects once a call server is added.</small>
        </>)}
        {stream && <div className="lvl" title="Your microphone level"><i style={{ transform: `scaleX(${mic ? Math.min(1, level * 3) : 0})` }} /></div>}
        {err && <p className="err">{err}</p>}
        <div className="actions" style={{ justifyContent: 'center' }}>
          {err ? <button className="btn sm fill" onClick={() => { setErr(''); setAttempt((a) => a + 1) }}>Try again</button> : <>
            <button className={'btn sm' + (!mic ? ' fill' : '')} onClick={toggleMic} disabled={!stream}>{mic ? 'Mute' : 'Unmute'}</button>
            {video && <button className={'btn sm' + (!cam ? ' fill' : '')} onClick={toggleCam} disabled={!stream}>{cam ? 'Camera off' : 'Camera on'}</button>}</>}
          <button className="btn sm endbtn" onClick={end}>{err ? 'Close' : 'End call'}</button>
        </div>
      </div>
    </div>)
}
