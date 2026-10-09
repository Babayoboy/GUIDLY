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

    const load = async () => {
      const result = await supabase.from('expert_profiles')
        .select('user_id,bio,rate_paise,currency,is_published,created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
      if (result.error) throw result.error

      const rows = result.data || []
      const userIds = rows.map((expert) => expert.user_id)
      const [profilesResult, linksResult] = userIds.length ? await Promise.all([
        supabase.from('profiles').select('id,display_name,headline,avatar').in('id', userIds),
        supabase.from('expert_categories').select('expert_id,category_slug').in('expert_id', userIds),
      ]) : [{ data: [], error: null }, { data: [], error: null }]
      if (profilesResult.error) throw profilesResult.error
      if (linksResult.error) throw linksResult.error

      const links = linksResult.data || []
      const slugs = [...new Set(links.map((link) => link.category_slug))]
      const categoriesResult = slugs.length
        ? await supabase.from('categories').select('slug,name').in('slug', slugs)
        : { data: [], error: null }
      if (categoriesResult.error) throw categoriesResult.error

      const profilesById = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]))
      const categoriesBySlug = new Map((categoriesResult.data || []).map((category) => [category.slug, category.name || category.slug]))
      const skillsByExpert = new Map()
      links.forEach((link) => {
        const names = skillsByExpert.get(link.expert_id) || []
        const categoryName = categoriesBySlug.get(link.category_slug)
        if (categoryName) names.push(categoryName)
        skillsByExpert.set(link.expert_id, names)
      })

      if (!active) return
      setError('')
      setExperts(rows.map((expert) => {
        const profile = profilesById.get(expert.user_id)
        const skills = skillsByExpert.get(expert.user_id) || []
        return {
          id: expert.user_id,
          name: profile?.display_name || 'Guidly expert',
          role: profile?.headline || 'Independent expert',
          bio: expert.bio || '',
          college: '',
          degree: '',
          field: skills[0] || 'Career guidance',
          careers: [],
          skills,
          rate: Math.round(Number(expert.rate_paise || 0) / 100),
          currency: expert.currency || 'INR',
          rating: null,
        }
      }))
    }

    const refresh = () => load()
      .catch((queryError) => {
        if (active) setError(`Could not load expert profiles: ${queryError.message || 'Unknown Supabase error'}`)
      })
      .finally(() => { if (active) setLoading(false) })

    refresh()
    const channel = supabase.channel('expert-directory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expert_profiles' }, refresh)
      .subscribe()

    return () => { active = false; supabase.removeChannel(channel) }
  }, [])

  return { experts, loading, error }
}
