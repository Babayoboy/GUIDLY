import { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { useStore } from './store'
import Landing from './Landing'
import Login from './Login'
import Dashboard from './Dashboard'
export default function App() {
  const { user, loading } = useAuth()
  const { set } = useStore()
  const [page, setPage] = useState('landing')
  useEffect(() => { if (!loading) set({ user: user ? { name: user.user_metadata?.full_name || user.email?.split('@')[0], email: user.email, role: user.user_metadata?.requested_account_type === 'expert' ? 'mentor' : 'student' } : null }) }, [user, loading])
  if (loading) return null
  if (user) return <Dashboard onLogout={() => setPage('landing')} />
  return page === 'login' ? <Login onBack={() => setPage('landing')} /> : <Landing onLogin={() => setPage('login')} />
}
