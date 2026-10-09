import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export function useExperts() {
  const [experts, setExperts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!supabase) {
      setError('The expert directory is not configured.')
      setLoading(false)
      return () => { active = false }
    }

    const load = () => supabase.from('expert_profiles')
      .select('user_id,bio,rate_paise,currency,is_published,created_at,profiles(display_name,headline,avatar),expert_categories(category_slug,categories(slug,name))')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!active) return
        if (queryError) setError('Could not load expert profiles.')
        else {
          setError('')
          setExperts((data || []).map((expert) => {
            const categories = (expert.expert_categories || [])
              .map((link) => Array.isArray(link.categories) ? link.categories[0] : link.categories)
              .filter(Boolean)
            const profile = Array.isArray(expert.profiles) ? expert.profiles[0] : expert.profiles
            const names = categories.map((category) => category.name || category.slug).filter(Boolean)
            return {
              id: expert.user_id,
              name: profile?.display_name || 'Guidly expert',
              role: profile?.headline || 'Independent expert',
              bio: expert.bio || '',
              college: '',
              degree: '',
              field: names[0] || 'Career guidance',
              careers: [],
              skills: names,
              rate: Math.round(Number(expert.rate_paise || 0) / 100),
              currency: expert.currency || 'INR',
              rating: null,
            }
          }))
        }
        setLoading(false)
      })
    load()
    const channel = supabase.channel('expert-directory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expert_profiles' }, load)
      .subscribe()

    return () => { active = false; supabase.removeChannel(channel) }
  }, [])

  return { experts, loading, error }
}