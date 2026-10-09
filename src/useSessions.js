import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

let sessionChannelSequence = 0

export const isSessionActive = (session) => {
  if (!session?.startsAt || ['cancelled', 'canceled', 'refunded', 'failed', 'rejected', 'completed'].includes((session.status || '').toLowerCase())) return false
  const startsAt = new Date(session.startsAt).getTime()
  return startsAt <= Date.now() && startsAt + Number(session.duration || 0) * 60000 > Date.now()
}

export function useSessions(userId, role) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!supabase || !userId) {
      setSessions([])
      setLoading(false)
      return () => { active = false }
    }

    const load = async () => {
      let query = supabase.from('sessions')
        .select('id,learner_id,expert_id,title,starts_at,duration_minutes,amount_paise,currency,status,created_at')
        .order('created_at', { ascending: false })
      query = role === 'mentor' ? query.eq('expert_id', userId) : query.eq('learner_id', userId)
      const result = await query
      if (result.error) throw result.error
      const rows = result.data || []
      const profileIds = [...new Set(rows.map((row) => role === 'mentor' ? row.learner_id : row.expert_id).filter(Boolean))]
      const profilesResult = profileIds.length
        ? await supabase.from('profiles').select('id,display_name').in('id', profileIds)
        : { data: [], error: null }
      if (profilesResult.error) throw profilesResult.error
      const names = new Map((profilesResult.data || []).map((profile) => [profile.id, profile.display_name]))
      if (!active) return
      setSessions(rows.map((row) => ({
        id: row.id,
        learnerId: row.learner_id,
        expertId: row.expert_id,
        mentor: names.get(role === 'mentor' ? row.learner_id : row.expert_id) || 'Guidly user',
        rate: Math.round(Number(row.amount_paise || 0) / 100),
        when: row.starts_at ? new Date(row.starts_at).toLocaleString() : 'To be scheduled',
        startsAt: row.starts_at,
        duration: row.duration_minutes,
        status: row.status,
      })))
      setError('')
    }

    const refresh = () => load()
      .catch((queryError) => { if (active) setError(`Could not load sessions: ${queryError.message || 'Unknown Supabase error'}`) })
      .finally(() => { if (active) setLoading(false) })
    refresh()
    const channelId = `sessions-${role}-${userId}-${++sessionChannelSequence}`
    const participantColumn = role === 'mentor' ? 'expert_id' : 'learner_id'
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `${participantColumn}=eq.${userId}` }, refresh)
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [userId, role])

  return { sessions, loading, error }
}
