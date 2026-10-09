import { useEffect, useState } from 'react'
import { useStore } from './store'
import Logo from './Logo'
export default function Nav({ items = [], active, onPick, onBrand, children }) {
  const { s, toggleTheme } = useStore()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && setOpen(false)
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [])
  return (
    <nav>
      <a className="logo" href="#home" onClick={(e) => { if (onBrand) { e.preventDefault(); onBrand() } setOpen(false) }}><Logo /><span>Guidly</span></a>
      {items.length > 0 && (
        <ul className={'menu' + (open ? ' open' : '')}>
          {items.map((it, i) => (
            <li key={it.k} style={{ '--i': i }}><a href={it.href || '#'} className={active === it.k ? 'active' : ''}
              onClick={(e) => { if (onPick) { e.preventDefault(); onPick(it.k) } setOpen(false) }}>{it.l}</a></li>
          ))}
        </ul>
      )}
      <div className="tools">
        {children}
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle light/dark theme">{s.theme === 'dark' ? '☾' : '☀'}</button>
        {items.length > 0 && <button className="icon-btn burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button>}
      </div>
      <div className={'scrim' + (open ? ' show' : '')} onClick={() => setOpen(false)} />
    </nav>
  )
}
