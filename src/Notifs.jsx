import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
const ago = (t) => { const m = Math.floor((Date.now() - t) / 6e4); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.floor(m / 60) + 'h ago' : Math.floor(m / 1440) + 'd ago' }
export default function Notifs() {
  const { s, set } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const unread = s.notifs.filter((n) => !n.read).length
  useEffect(() => {
    const out = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    addEventListener('pointerdown', out); addEventListener('keydown', esc)
    return () => { removeEventListener('pointerdown', out); removeEventListener('keydown', esc) }
  }, [])
  const mark = (id) => set((p) => ({ notifs: p.notifs.map((n) => (id === 'all' || n.id === id ? { ...n, read: true } : n)) }))
  return (
    <div className="nwrap" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen(!open)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
        {unread > 0 && <span className="badge">{unread}</span>}
      </button>
      {open && (
        <div className="npanel top">
          <div className="nhead"><b>Notifications</b><span><button className="linkbtn" onClick={() => mark('all')}>Mark all read</button><button className="linkbtn" onClick={() => set({ notifs: [] })}>Clear</button></span></div>
          <div className="nlist">
            {!s.notifs.length && <p className="nempty">You’re all caught up.</p>}
            {s.notifs.map((n) => (
              <button key={n.id} className={'nitem' + (n.read ? '' : ' un')} onClick={() => mark(n.id)}><i /><span>{n.text}<small>{ago(n.time)}</small></span></button>))}
          </div>
        </div>)}
    </div>)
}
