import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import Nav from './Nav'
import Notifs from './Notifs'
import Call from './Call'
import { Mentors, Sessions, Messages, Events, Resources, Wallet, Profile, Stats } from './Views'
const NAV = {
  student: [['mentors', 'Mentors'], ['messages', 'Messages'], ['sessions', 'Sessions'], ['events', 'Free Events'], ['resources', 'Resources'], ['wallet', 'Wallet'], ['profile', 'Profile']],
  mentor: [['messages', 'Messages'], ['stats', 'Stats'], ['events', 'Free Events'], ['resources', 'Resources'], ['wallet', 'Wallet'], ['profile', 'Profile']],
}
const VIEWS = { stats: Stats, mentors: Mentors, sessions: Sessions, messages: Messages, events: Events, resources: Resources, wallet: Wallet, profile: Profile }
export default function Dashboard({ onLogout }) {
  const { user, signOut } = useAuth()
  const role = user?.user_metadata?.requested_account_type === 'expert' ? 'mentor' : 'student'
  const [loadingRole, setLoadingRole] = useState(false)
  const [view, setView] = useState(null)
  const [chat, setChat] = useState(null)
  const [call, setCall] = useState(null)
  useEffect(() => { setLoadingRole(false) }, [user])
  useEffect(() => {
    if (!loadingRole && !view && NAV[role]) {
      setView(NAV[role][0][0])
    }
  }, [loadingRole, role, view])
  useEffect(() => { document.body.classList.add('dash'); return () => document.body.classList.remove('dash') }, [])
  useEffect(() => { document.body.dataset.view = view + (view === 'messages' && chat ? '-chat' : ''); return () => { delete document.body.dataset.view } }, [view, chat])
  const handleLogout = async () => {
    await signOut()
    onLogout()
  }
  if (loadingRole) return null
  const items = NAV[role]?.map(([k, l]) => ({ k, l })) || []
  const W = { mentors: '1100px', events: '900px', messages: '940px', stats: '760px', profile: '960px', wallet: role === 'student' ? '980px' : '680px' }[view] || '680px'
  const go = (v, c) => { setView(v); setChat(c || null); scrollTo({ top: 0 }) }
  const V = VIEWS[view]
  if (!V) return null
  return (<>
    <Nav items={items} active={view} onPick={go} onBrand={() => go(items[0]?.k)}>
      <button className="pill" onClick={handleLogout}>Log out</button>
      <Notifs />
    </Nav>
    <main><section className="layer in applayer" style={{ '--w': `min(${W},100%)` }}>
      <div className={'box appbox' + (view === 'profile' ? ' center' : '')} key={view + (chat || '')}><V go={go} chat={chat} onCall={(name, mode) => setCall({ name, mode })} /></div>
    </section></main>
    {call && <Call name={call.name} mode={call.mode} onEnd={() => setCall(null)} />}
  </>)
}
