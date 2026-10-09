import { createContext, useContext, useEffect, useState } from 'react'
import { seed } from './data'
const Ctx = createContext()
export const useStore = () => useContext(Ctx)
// add a notification (respects the user's notification settings); spread the result into a set() patch
export const nt = (p, type, text) =>
  (p.notifPrefs || {})[type] === false ? {} : { notifs: [{ id: Date.now() + Math.random(), type, text, read: false, time: Date.now() }, ...(p.notifs || [])].slice(0, 30) }
export function StoreProvider({ children }) {
  const [s, setS] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('guidly-v2')) || {}
      delete saved.wallet
      delete saved.tx
      return { ...seed, ...saved }
    } catch { return seed }
  })
  useEffect(() => { try { localStorage.setItem('guidly-v2', JSON.stringify(s)) } catch {} document.documentElement.dataset.theme = s.theme }, [s])
  const set = (p) => setS((prev) => ({ ...prev, ...(typeof p === 'function' ? p(prev) : p) }))
  const toggleTheme = () => set((p) => ({ theme: p.theme === 'dark' ? 'light' : 'dark' }))
  return <Ctx.Provider value={{ s, set, toggleTheme }}>{children}</Ctx.Provider>
}
