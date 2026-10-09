import { useState } from 'react'
import { useStore } from './store'
import Landing from './Landing'
import Login from './Login'
import Dashboard from './Dashboard'
export default function App() {
  const { s } = useStore()
  const [page, setPage] = useState('landing')
  if (s.user) return <Dashboard onLogout={() => setPage('landing')} />
  return page === 'login' ? <Login onBack={() => setPage('landing')} /> : <Landing onLogin={() => setPage('login')} />
}
