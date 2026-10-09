import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

const fmt = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
const endedStatuses = new Set(['cancelled', 'canceled', 'refunded', 'failed', 'rejected', 'completed'])
const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

export default function Call({ sessionId, peerUserId, name, mode, incoming = false, onEnd }) {
  const video = mode === 'video'
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [status, setStatus] = useState(incoming ? 'Incoming call' : 'Checking session…')
  const [error, setError] = useState('')
  const [relayNotice, setRelayNotice] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(mode === 'video')
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const peerRef = useRef(null)
  const channelRef = useRef(null)
  const outboundChannelRef = useRef(null)
  const inviteChannelRef = useRef(null)
  const localStreamRef = useRef(null)
  const queuedCandidates = useRef([])
  const endedRef = useRef(false)
  const sessionRef = useRef(null)
  const inviteTimerRef = useRef(null)
  const expiryTimerRef = useRef(null)

  const sendSignal = async (event, data = {}) => {
    const channel = event === 'invite' ? inviteChannelRef.current : outboundChannelRef.current
    if (!channel) return
    await channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: { event, sessionId, fromUserId: sessionRef.current?.userId, toUserId: peerUserId, ...data },
    })
  }

  const finish = async (notifyPeer = true) => {
    if (endedRef.current) return
    endedRef.current = true
    clearInterval(inviteTimerRef.current)
    clearTimeout(expiryTimerRef.current)
    if (notifyPeer) await sendSignal('hangup').catch(() => {})
    peerRef.current?.close()
    peerRef.current = null
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    if (channelRef.current && supabase) supabase.removeChannel(channelRef.current)
    if (outboundChannelRef.current && supabase) supabase.removeChannel(outboundChannelRef.current)
    if (inviteChannelRef.current && supabase) supabase.removeChannel(inviteChannelRef.current)
    channelRef.current = null
    outboundChannelRef.current = null
    inviteChannelRef.current = null
    onEnd()
  }

  useEffect(() => {
    let active = true
    let localChannel
    let peer

    const setup = async () => {
      if (!supabase || !sessionId || !peerUserId) throw new Error('A valid active session is required to call.')
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const user = authSession?.user
      if (!user) throw new Error('Sign in to start a call.')

      const { data: session, error: sessionError } = await supabase.from('sessions')
        .select('id,learner_id,expert_id,starts_at,duration_minutes,status')
        .eq('id', sessionId)
        .maybeSingle()
      if (sessionError) throw sessionError
      if (!session || ![session.learner_id, session.expert_id].includes(user.id)) throw new Error('You are not a participant in this session.')
      if ((session.status || '').toLowerCase().match(/cancelled|canceled|refunded|failed|rejected|completed/)) throw new Error('Calls are only available during an active session.')
      const startsAt = new Date(session.starts_at).getTime()
      const endsAt = startsAt + Number(session.duration_minutes) * 60000
      if (!(startsAt <= Date.now() && endsAt > Date.now())) throw new Error('Calls are only available during the scheduled session.')
      const expectedPeer = user.id === session.learner_id ? session.expert_id : session.learner_id
      if (expectedPeer !== peerUserId) throw new Error('The other caller is not part of this session.')
      sessionRef.current = { ...session, userId: user.id }
      expiryTimerRef.current = setTimeout(() => finish(true), endsAt - Date.now())
      if (!active) return

      if (!window.isSecureContext) {
        throw new Error('Camera and microphone require a secure page. Open Guidly on HTTPS or localhost.')
      }
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('This browser does not support camera and microphone access. Try a current browser on HTTPS or localhost.')
      }
      if (typeof RTCPeerConnection !== 'function') {
        throw new Error('This browser does not support native WebRTC calls.')
      }
      setStatus(incoming ? 'Preparing to join…' : 'Requesting camera and microphone…')
      let local
      try {
        local = await navigator.mediaDevices.getUserMedia({ audio: true, video })
      } catch (mediaError) {
        if (mediaError.name === 'NotAllowedError' || mediaError.name === 'SecurityError') {
          throw new Error('Allow microphone' + (video ? ' and camera' : '') + ' access in your browser settings, then try again.')
        }
        if (mediaError.name === 'NotFoundError' || mediaError.name === 'DevicesNotFoundError') {
          throw new Error('No compatible ' + (video ? 'camera or microphone' : 'microphone') + ' was found.')
        }
        throw mediaError
      }
      if (!active) { local.getTracks().forEach((track) => track.stop()); return }
      localStreamRef.current = local
      setLocalStream(local)

      let iceServers = STUN_SERVERS
      let hasTurnRelay = false
      const iceConfigUrl = import.meta.env.VITE_ICE_CONFIG_URL || '/api/ice-config'
      if (iceConfigUrl) {
        try {
          const configUrl = new URL(iceConfigUrl, window.location.origin)
          const headers = {}
          if (configUrl.origin === window.location.origin && authSession?.access_token) {
            headers.Authorization = `Bearer ${authSession.access_token}`
          }
          const response = await fetch(configUrl, { credentials: 'omit', headers })
          const config = await response.json()
          if (!response.ok) throw new Error(config.error || `ICE config endpoint returned ${response.status}`)
          if (!Array.isArray(config.iceServers) || !config.iceServers.length) throw new Error('ICE config response must include a non-empty iceServers array')
          hasTurnRelay = config.iceServers.some((server) => {
            const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
            return urls.some((url) => typeof url === 'string' && /^turns?:/i.test(url))
          })
          if (!hasTurnRelay) throw new Error('ICE config has no TURN/TURNS relay URLs')
          iceServers = [...STUN_SERVERS, ...config.iceServers]
          setRelayNotice('Media is routed through the TURN relay for network compatibility.')
          if (!active) { local.getTracks().forEach((track) => track.stop()); return }
        } catch (configError) {
          const detail = configError.message.includes('TURN is not configured')
            ? 'Set METERED_DOMAIN, METERED_API_KEY, SUPABASE_URL, and SUPABASE_ANON_KEY in Vercel, then redeploy.'
            : configError.message
          setRelayNotice(`TURN relay is unavailable (${detail}). This call may fail on restrictive networks.`)
        }
      } else {
        setRelayNotice('TURN relay credentials are unavailable. Calls may fail when either network blocks direct peer connections.')
      }

      peer = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 4,
        iceTransportPolicy: hasTurnRelay ? 'relay' : 'all',
      })
      peerRef.current = peer
      local.getTracks().forEach((track) => peer.addTrack(track, local))
      peer.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track])
        setRemoteStream(stream)
      }
      peer.onicecandidate = (event) => {
        if (event.candidate) sendSignal('ice', { candidate: event.candidate.toJSON() }).catch(() => {})
      }
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') setStatus('Connected')
        if (peer.connectionState === 'failed') setError('Connection failed. Check that your TURN credentials are configured and that the relay endpoint is reachable.')
        if (peer.connectionState === 'disconnected') setStatus('Reconnecting…')
        if (peer.connectionState === 'closed' && !endedRef.current) finish(false)
      }

      localChannel = supabase.channel(`call-session:${sessionId}:${user.id}`)
        .on('broadcast', { event: 'signal' }, async ({ payload }) => {
          if (!active || payload?.sessionId !== sessionId || payload?.toUserId !== user.id || payload?.fromUserId !== peerUserId) return
          try {
            if (payload.event === 'accept' && !incoming) {
              clearInterval(inviteTimerRef.current)
              setStatus('Connecting…')
              const offer = await peer.createOffer()
              await peer.setLocalDescription(offer)
              await sendSignal('offer', { description: peer.localDescription })
            } else if (payload.event === 'offer' && incoming) {
              setStatus('Connecting…')
              await peer.setRemoteDescription(payload.description)
              for (const candidate of queuedCandidates.current.splice(0)) await peer.addIceCandidate(candidate)
              const answer = await peer.createAnswer()
              await peer.setLocalDescription(answer)
              await sendSignal('answer', { description: peer.localDescription })
            } else if (payload.event === 'answer' && !incoming) {
              await peer.setRemoteDescription(payload.description)
              for (const candidate of queuedCandidates.current.splice(0)) await peer.addIceCandidate(candidate)
            } else if (payload.event === 'ice') {
              const candidate = new RTCIceCandidate(payload.candidate)
              if (peer.remoteDescription) await peer.addIceCandidate(candidate)
              else queuedCandidates.current.push(candidate)
            } else if (payload.event === 'decline' || payload.event === 'hangup') {
              setStatus(payload.event === 'decline' ? 'Call declined' : 'Call ended')
              finish(false)
            }
          } catch (signalError) {
            if (active) setError(signalError.message || 'WebRTC negotiation failed.')
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, ({ new: updated }) => {
          if (endedStatuses.has((updated.status || '').toLowerCase())) finish(true)
        })
      channelRef.current = localChannel
      await new Promise((resolve, reject) => {
        localChannel.subscribe((channelStatus, channelError) => {
          if (channelStatus === 'SUBSCRIBED') resolve()
          else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT' || channelStatus === 'CLOSED') {
            reject(channelError || new Error(`Call signaling ${channelStatus.toLowerCase()}`))
          }
        })
      })
      const outboundChannel = supabase.channel(`call-session:${sessionId}:${peerUserId}`)
      outboundChannelRef.current = outboundChannel
      await new Promise((resolve, reject) => {
        outboundChannel.subscribe((channelStatus, channelError) => {
          if (channelStatus === 'SUBSCRIBED') resolve()
          else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT' || channelStatus === 'CLOSED') {
            reject(channelError || new Error(`Peer signaling ${channelStatus.toLowerCase()}`))
          }
        })
      })
      const inviteChannel = supabase.channel(`call-inbox:${peerUserId}`)
      inviteChannelRef.current = inviteChannel
      await new Promise((resolve, reject) => {
        inviteChannel.subscribe((channelStatus, channelError) => {
          if (channelStatus === 'SUBSCRIBED') resolve()
          else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT' || channelStatus === 'CLOSED') {
            reject(channelError || new Error(`Invite signaling ${channelStatus.toLowerCase()}`))
          }
        })
      })
      if (!active) return
      if (incoming) {
        setStatus('Connecting…')
        await sendSignal('accept')
      } else {
        setStatus(`Calling ${name}…`)
        const invitation = { mode, callerName: user.user_metadata?.full_name || user.email }
        await sendSignal('invite', invitation)
        inviteTimerRef.current = setInterval(() => {
          if (!endedRef.current) sendSignal('invite', invitation).catch(() => {})
        }, 1800)
      }
    }

    setup().catch((setupError) => {
      if (active) setError(setupError.message || 'Could not start the call.')
    })

    return () => {
      active = false
      clearInterval(inviteTimerRef.current)
      clearTimeout(expiryTimerRef.current)
      peer?.close()
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
      if (localChannel && supabase) supabase.removeChannel(localChannel)
      if (outboundChannelRef.current && supabase) supabase.removeChannel(outboundChannelRef.current)
      if (inviteChannelRef.current && supabase) supabase.removeChannel(inviteChannelRef.current)
    }
  }, [sessionId, peerUserId, incoming])

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream
  }, [localStream])
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream
    if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream
  }, [remoteStream, video])
  useEffect(() => {
    if (status !== 'Connected') return
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [status])

  const toggleMic = () => {
    localStream?.getAudioTracks().forEach((track) => { track.enabled = !micEnabled })
    setMicEnabled((enabled) => !enabled)
  }
  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach((track) => { track.enabled = !cameraEnabled })
    setCameraEnabled((enabled) => !enabled)
  }

  return (
    <div className="callov" role="dialog" aria-modal="true" aria-label={`${video ? 'Video' : 'Voice'} call with ${name}`}>
      <div className={`callbox native-call${video ? ' video' : ''}`}>
        <small className="lbl" style={{ margin: 0 }}>{video ? 'Video call' : 'Voice call'}</small>
        <div className="call-avatar avatar-lg">{name.replace('Dr. ', '')[0]}</div>
        <h3>{name}</h3>
        <span className="note">{status === 'Connected' ? `Connected · ${fmt(seconds)}` : status}</span>
        {video && <div className="rtc-stage">
          <video ref={remoteVideoRef} className="rtc-remote" autoPlay playsInline />
          {!remoteStream && <span className="rtc-wait">Waiting for {name} to join…</span>}
          <video ref={localVideoRef} className="rtc-local" autoPlay muted playsInline />
        </div>}
        {!video && <audio ref={remoteAudioRef} autoPlay />}
        {error && <p className="err">{error}</p>}
        {relayNotice && !error && <p className="hintt" role="status">{relayNotice}</p>}
        <div className="actions" style={{ justifyContent: 'center' }}>
          <button className={`btn sm${!micEnabled ? ' fill' : ''}`} onClick={toggleMic} disabled={!localStream}>{micEnabled ? 'Mute mic' : 'Unmute mic'}</button>
          {video && <button className={`btn sm${!cameraEnabled ? ' fill' : ''}`} onClick={toggleCamera} disabled={!localStream}>{cameraEnabled ? 'Camera off' : 'Camera on'}</button>}
          <button className="btn sm endbtn" onClick={() => finish(true)}>End call</button>
        </div>
        <small className="note tiny">Peer-to-peer media uses native WebRTC. Networks that block direct connectivity may require a TURN relay.</small>
      </div>
    </div>
  )
}
