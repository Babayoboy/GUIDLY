import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { isSessionActive } from './useSessions'

export function useIncomingCalls(userId, sessions) {
  const [incomingCall, setIncomingCall] = useState(null)
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions

  useEffect(() => {
    if (!supabase || !userId) return
    let active = true
    const channel = supabase.channel(`call-inbox:${userId}`)
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        const session = sessionsRef.current.find((item) => item.id === payload?.sessionId && isSessionActive(item))
        if (!active || !session || payload?.event !== 'invite' || payload.toUserId !== userId) return
        const peerUserId = session.learnerId === userId ? session.expertId : session.learnerId
        if (payload.fromUserId !== peerUserId) return
        setIncomingCall({
          sessionId: session.id,
          peerUserId: payload.fromUserId,
          name: payload.callerName || 'Guidly user',
          mode: payload.mode === 'video' ? 'video' : 'voice',
        })
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [userId])

  const clearIncomingCall = () => setIncomingCall(null)
  const declineCall = async (call) => {
    if (supabase && call?.sessionId && userId) {
      const channel = supabase.channel(`call-session:${call.sessionId}:${call.peerUserId}`)
      await new Promise((resolve, reject) => {
        channel.subscribe((status, error) => {
          if (status === 'SUBSCRIBED') resolve()
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') reject(error || new Error('Call signaling unavailable'))
        })
      })
      await channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { event: 'decline', sessionId: call.sessionId, fromUserId: userId, toUserId: call.peerUserId },
      })
      await supabase.removeChannel(channel)
    }
    setIncomingCall(null)
  }

  return { incomingCall, clearIncomingCall, declineCall }
}
