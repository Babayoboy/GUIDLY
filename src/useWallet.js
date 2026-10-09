import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export function useWallet(userId) {
  const [balancePaise, setBalancePaise] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!supabase || !userId) {
      setBalancePaise(0)
      setTransactions([])
      setLoading(false)
      return () => { active = false }
    }

    const refresh = async () => {
      const [balanceResult, transactionsResult] = await Promise.all([
        supabase.rpc('get_my_credit_balance'),
        supabase.from('credit_transactions')
          .select('id,transaction_type,amount_paise,note,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
      ])
      if (balanceResult.error) throw balanceResult.error
      if (transactionsResult.error) throw transactionsResult.error
      if (!active) return

      setBalancePaise(Number(balanceResult.data || 0))
      setTransactions((transactionsResult.data || []).map((transaction) => ({
        id: transaction.id,
        text: transaction.note || transaction.transaction_type.replaceAll('_', ' '),
        amount: Number(transaction.amount_paise) / 100,
        createdAt: transaction.created_at,
      })))
      setError('')
    }

    const update = () => refresh()
      .catch((queryError) => { if (active) setError(`Could not load wallet balance: ${queryError.message || 'Unknown Supabase error'}`) })
      .finally(() => { if (active) setLoading(false) })

    update()
    const channel = supabase.channel(`credit-ledger-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_transactions', filter: `user_id=eq.${userId}` }, update)
      .subscribe()

    return () => { active = false; supabase.removeChannel(channel) }
  }, [userId])

  return { balancePaise, transactions, loading, error }
}
