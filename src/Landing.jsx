import { useEffect, useRef, useState } from 'react'
import Nav from './Nav'
import { matchMentor } from './data'
import { useExperts } from './useExperts'
const d = (s) => ({ '--d': s })
const items = [['home', 'Home'], ['mentors', 'Find Mentor'], ['projects', 'Projects'], ['community', 'Community'], ['about', 'About']].map(([k, l]) => ({ k, l, href: '#' + k }))

export default function Landing({ onLogin }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState('home')
  const root = useRef()
  const { experts, loading, error } = useExperts()
  useEffect(() => {
    const layers = [...root.current.querySelectorAll('.layer')]
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.25 })
    const so = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { threshold: 0.5 })
    layers.forEach((l) => { io.observe(l); so.observe(l) })
    const par = [...root.current.querySelectorAll('[data-speed]')]
    const mq = matchMedia('(min-width:861px) and (prefers-reduced-motion:no-preference)')
    let tick = false
    const onScroll = () => {
      if (!mq.matches || tick) return
      tick = true
      requestAnimationFrame(() => {
        par.forEach((el) => { el.style.transform = `translateY(${el.parentElement.getBoundingClientRect().top * parseFloat(el.dataset.speed)}px)` })
        tick = false
      })
    }
    addEventListener('scroll', onScroll, { passive: true })
    document.documentElement.classList.add('snap')
    return () => { io.disconnect(); so.disconnect(); removeEventListener('scroll', onScroll); document.documentElement.classList.remove('snap') }
  }, [])
  const list = experts.filter((m) => matchMentor(m, q))
  return (
    <div ref={root}>
      <Nav items={items} active={active}><button className="pill" onClick={onLogin}>Log in</button></Nav>
      <main>
        <section className="layer" id="home" style={{ '--w': 'min(640px,100%)' }}>
          <div className="box">
            <p className="eyebrow fx">Student mentorship</p>
            <h1 className="fx" style={d('.1s')}>Guidly</h1>
            <h2 className="fx serif" style={{ ...d('.2s'), marginTop: 14, fontSize: 'clamp(1.3rem,3vw,1.9rem)' }}>Find the right mentor, <em>don’t get lost in confusion.</em></h2>
            <p className="lead fx" style={d('.3s')}>Talk to people who’ve walked your path. Bring your career doubts — get clear, honest direction from mentors who care.</p>
            <div className="fx" style={{ ...d('.4s'), display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a className="btn" href="#mentors">Find a mentor →</a>
              <button className="btn" onClick={onLogin}>Log in to start</button>
            </div>
          </div>
        </section>

        <section className="layer" id="mentors" style={{ '--w': 'min(820px,100%)' }}>
          <div className="box">
            <p className="eyebrow fx">Find Mentor</p>
            <h2 className="fx" style={d('.1s')}>Experts available <em>this week.</em></h2>
            <p className="lead fx" style={d('.15s')}>Explore mentor profiles and find guidance for your next step.</p>
            <div className="search fx" style={d('.2s')}><input type="search" placeholder="Search by college, degree, career or skill…" aria-label="Search mentors" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="grid">
              {list.map((m) => (
                <div className="card" key={m.id}><div className="avatar">{m.name[0]}</div><h3>{m.name}</h3><small>{m.role}</small><span className="tag">{m.field || 'Career guidance'}</span><span className="tag">₹{m.rate}/hr</span></div>
              ))}
              {loading && <p className="lead">Loading expert profiles…</p>}
              {error && <p className="lead">{error}</p>}
              {!loading && !error && !list.length && <p className="lead">No mentors match that search.</p>}
            </div>
          </div>
        </section>

        <section className="layer" id="projects" style={{ '--w': 'min(980px,100%)' }}>
          <div className="box">
            <p className="eyebrow fx">Projects</p>
            <h2 className="fx" style={d('.1s')}>Built by students, <em>shaped by mentors.</em></h2>
            <div className="grid" style={{ marginTop: 24 }}>
              {[['CampusConnect', 'Event app • Priya & team', 'React', 'Firebase'], ['ResumeLens', 'AI resume reviewer • Arjun', 'Python', 'NLP'], ['GreenRoute', 'Eco commute planner • Neha', 'Maps', 'Data'], ['StudyBuddy', 'Peer matching • Rohan', 'Node', 'UX']].map((p, i) => (
                <div className="card fx" style={d(0.15 + i * 0.1 + 's')} key={p[0]}><div className="thumb" /><h3>{p[0]}</h3><small>{p[1]}</small><span className="tag">{p[2]}</span><span className="tag">{p[3]}</span></div>
              ))}
            </div>
          </div>
        </section>

        <section className="layer" id="community" style={{ '--w': 'min(1120px,100%)' }}>
          <div className="box">
            <p className="eyebrow fx">Community</p>
            <h2 className="fx" style={d('.1s')}>Conversations <em>happening now.</em></h2>
            <div style={{ marginTop: 14 }}>
              {[['A', 'Switching from core CS to product — is it too late?', '42 replies • Career change'], ['S', 'How I cracked my first internship interview', '118 replies • Interviews'], ['M', 'Masters abroad vs. job in India: honest takes', '76 replies • Higher studies'], ['K', 'Weekly portfolio review thread', '31 replies • Design']].map((t, i) => (
                <div className="thread fx" style={d(0.15 + i * 0.1 + 's')} key={t[1]}><div className="avatar">{t[0]}</div><div><h3>{t[1]}</h3><p>{t[2]}</p></div></div>
              ))}
            </div>
          </div>
        </section>

        <section className="layer" id="about" style={{ '--w': 'min(1260px,100%)' }}>
          <div className="box">
            <p className="eyebrow fx">About</p>
            <h2 className="fx" style={d('.1s')}>Clarity for every <em>student.</em></h2>
            <div className="two">
              <div className="fx" style={d('.2s')}><h3 className="serif" style={{ fontSize: '1.3rem' }}>Our mission</h3><p className="lead" style={{ marginTop: 10 }}>To make quality career guidance accessible to every student — connecting them with mentors who give real, practical advice instead of noise.</p></div>
              <div className="fx" style={d('.3s')}><h3 className="serif" style={{ fontSize: '1.3rem' }}>Our vision</h3><p className="lead" style={{ marginTop: 10 }}>A world where no student chooses a path out of confusion or fear — where every decision is backed by someone who’s been there.</p></div>
            </div>
            <div className="stats fx" style={d('.4s')}>{[['500+', 'Mentors'], ['12k', 'Students'], ['40+', 'Fields'], ['4.9', 'Avg rating']].map((x) => <div className="stat" key={x[1]}><b>{x[0]}</b>{x[1]}</div>)}</div>
            <button className="btn fx" style={d('.5s')} onClick={onLogin}>Start a conversation →</button>
          </div>
        </section>
      </main>
      <footer>© 2026 Guidly — Find the right mentor.</footer>
    </div>
  )
}
