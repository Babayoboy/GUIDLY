import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export function useMentees(expertId) {
  const [mentees, setMentees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!supabase || !expertId) {
      setMentees([])
      setLoading(false)
      return () => { active = false }
    }

    const load = async () => {
      const subscriptionsResult = await supabase.from('saved_experts')
        .select('learner_id')
        .eq('expert_id', expertId)
      if (subscriptionsResult.error) throw subscriptionsResult.error

      const learnerIds = [...new Set((subscriptionsResult.data || []).map((subscription) => subscription.learner_id).filter(Boolean))]
      if (!learnerIds.length) {
        if (active) {
          setMentees([])
          setError('')
        }
        return
      }

      const profilesResult = await supabase.from('profiles')
        .select('id,display_name')
        .in('id', learnerIds)
      if (profilesResult.error) throw profilesResult.error

      if (active) {
        setMentees((profilesResult.data || []).map((profile) => ({
          id: profile.id,
          name: profile.display_name || 'Guidly learner',
        })))
        setError('')
      }
    }

    const refresh = () => load()
      .catch((queryError) => {
        if (active) setError(`Could not load your subscribed learners: ${queryError.message || 'Unknown Supabase error'}`)
      })
      .finally(() => { if (active) setLoading(false) })

    refresh()
    const channel = supabase.channel(`mentees-${expertId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_experts', filter: `expert_id=eq.${expertId}` }, refresh)
      .subscribe()

    return () => { active = false; supabase.removeChannel(channel) }
  }, [expertId])

  return { mentees, loading, error }
}
