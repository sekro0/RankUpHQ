import { create } from 'zustand'
import supabase from '../lib/supabase'
import toast from 'react-hot-toast'

export const useUnreadStore = create((set, get) => ({
  counts: {},             // { [convoId]: number }
  lastReadTimestamps: {}, // { [convoId]: ISOString } — tracks when each convo was last marked read
  total: 0,
  activeConvoId: null,
  channel: null,
  friendRequestsChannel: null,
  friendRequests: 0,
  teamJoinRequests: 0,
  teamJoinRequestsChannel: null,
  teamInvitesChannel: null,
  teamInvites: 0,

  loadCounts: async (userId) => {
    // Read localStorage cache — survives F5 race conditions
    let localCache = {}
    try { localCache = JSON.parse(localStorage.getItem(`ruhq_lr_${userId}`) || '{}') } catch {}

    const { data: parts } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId)
    if (!parts?.length) return

    const newCounts = {}
    await Promise.all(parts.map(async (p) => {
      // Use whichever is more recent: DB value or localStorage value
      const dbTs = p.last_read_at
      const localTs = localCache[p.conversation_id]
      const effectiveTs = dbTs && localTs
        ? (localTs > dbTs ? localTs : dbTs)
        : (dbTs || localTs || null)

      let q = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', p.conversation_id)
        .neq('sender_id', userId)
      if (effectiveTs) q = q.gt('created_at', effectiveTs)
      const { count } = await q
      if (count > 0) newCounts[p.conversation_id] = count
    }))

    set({ counts: newCounts, total: Object.values(newCounts).reduce((a, b) => a + b, 0) })
  },

  markRead: async (convoId, userId, serverTimestamp = null) => {
    // Require a server-side timestamp to avoid client/server clock skew
    if (!serverTimestamp) return
    // Add 1ms so the filter is strictly after the last seen message
    const now = new Date(new Date(serverTimestamp).getTime() + 1).toISOString()

    // Persist to localStorage SYNCHRONOUSLY before the async DB write.
    // This survives F5 / page refresh races where the fetch gets cancelled.
    try {
      const key = `ruhq_lr_${userId}`
      const cache = JSON.parse(localStorage.getItem(key) || '{}')
      if (!cache[convoId] || now > cache[convoId]) {
        cache[convoId] = now
        localStorage.setItem(key, JSON.stringify(cache))
      }
    } catch {}

    // Update Zustand state immediately
    set(s => {
      const counts = { ...s.counts }
      const removed = counts[convoId] || 0
      delete counts[convoId]
      return {
        counts,
        total: Math.max(0, s.total - removed),
        lastReadTimestamps: { ...s.lastReadTimestamps, [convoId]: now },
      }
    })

    // Persist to DB (async — may lose race with F5, but localStorage already saved us)
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: now })
      .eq('conversation_id', convoId)
      .eq('user_id', userId)
  },

  setActiveConvo: (convoId) => set({ activeConvoId: convoId }),

  loadFriendRequests: async (userId) => {
    const { count } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('addressee_id', userId)
      .eq('status', 'pending')
    set({ friendRequests: count || 0 })
  },

  clearFriendRequest: () => set(s => ({ friendRequests: Math.max(0, s.friendRequests - 1) })),
  clearAllFriendRequests: () => set({ friendRequests: 0 }),

  loadTeamJoinRequests: async (userId) => {
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .in('role', ['owner', 'co-leader'])
    if (!memberships?.length) return
    const teamIds = memberships.map(m => m.team_id)
    const counts = await Promise.all(teamIds.map(async (tid) => {
      const { count } = await supabase
        .from('team_join_requests')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', tid)
        .eq('status', 'pending')
      return count || 0
    }))
    const total = counts.reduce((a, b) => a + b, 0)
    set({ teamJoinRequests: total })
  },

  subscribeTeamRequests: async (userId) => {
    const old = get().teamJoinRequestsChannel
    if (old) supabase.removeChannel(old)

    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .in('role', ['owner', 'co-leader'])
    const teamIds = (memberships || []).map(m => m.team_id)
    if (!teamIds.length) return

    const ch = supabase
      .channel('team-join-requests-global')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_join_requests' },
        async (payload) => {
          const req = payload.new
          if (!teamIds.includes(req.team_id)) return
          if (req.status !== 'pending') return
          set(s => ({ teamJoinRequests: s.teamJoinRequests + 1 }))
          const [{ data: requester }, { data: team }] = await Promise.all([
            supabase.from('profiles').select('username, display_name').eq('id', req.user_id).single(),
            supabase.from('teams').select('name').eq('id', req.team_id).single(),
          ])
          const name = requester?.display_name || requester?.username || 'Someone'
          const teamName = team?.name || 'your team'
          toast(`🎮 ${name} wants to join ${teamName}`, {
            duration: 6000,
            style: { background: '#13131a', color: '#e2e8f0', border: '1px solid #2a2a3e' }
          })
        }
      )
      .subscribe()
    set({ teamJoinRequestsChannel: ch })
  },

  clearTeamJoinRequest: () => set(s => ({ teamJoinRequests: Math.max(0, s.teamJoinRequests - 1) })),
  clearAllTeamJoinRequests: () => set({ teamJoinRequests: 0 }),

  loadTeamInvites: async (userId) => {
    const { count } = await supabase
      .from('team_invites')
      .select('id', { count: 'exact', head: true })
      .eq('invitee_id', userId)
      .eq('status', 'pending')
    set({ teamInvites: count || 0 })
  },

  subscribeTeamInvites: (userId) => {
    const old = get().teamInvitesChannel
    if (old) supabase.removeChannel(old)

    const ch = supabase
      .channel('team-invites-global')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_invites', filter: `invitee_id=eq.${userId}` },
        async (payload) => {
          if (payload.new.status !== 'pending') return
          set(s => ({ teamInvites: s.teamInvites + 1 }))
          const [{ data: inviter }, { data: team }] = await Promise.all([
            supabase.from('profiles').select('username, display_name').eq('id', payload.new.inviter_id).single(),
            supabase.from('teams').select('name').eq('id', payload.new.team_id).single(),
          ])
          const name = inviter?.display_name || inviter?.username || 'Someone'
          const teamName = team?.name || 'a team'
          toast(`🎮 ${name} invited you to ${teamName}!`, {
            duration: 6000,
            style: { background: '#13131a', color: '#e2e8f0', border: '1px solid #2a2a3e' }
          })
        }
      )
      .subscribe()
    set({ teamInvitesChannel: ch })
  },

  clearTeamInvite: () => set(s => ({ teamInvites: Math.max(0, s.teamInvites - 1) })),

  subscribeFriendRequests: (userId) => {
    const old = get().friendRequestsChannel
    if (old) supabase.removeChannel(old)

    const ch = supabase
      .channel('friend-requests-global')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${userId}` },
        async (payload) => {
          if (payload.new.status !== 'pending') return
          set(s => ({ friendRequests: s.friendRequests + 1 }))
          const { data: requester } = await supabase
            .from('profiles').select('username, display_name').eq('id', payload.new.requester_id).single()
          const name = requester?.display_name || requester?.username || 'Someone'
          toast(`👋 ${name} sent you a friend request!`, {
            duration: 5000,
            style: { background: '#13131a', color: '#e2e8f0', border: '1px solid #2a2a3e' }
          })
        }
      )
      .subscribe()

    set({ friendRequestsChannel: ch })
  },

  subscribe: (userId) => {
    const old = get().channel
    if (old) supabase.removeChannel(old)

    const ch = supabase
      .channel('unread-global')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new
          if (msg.sender_id === userId) return
          if (msg.conversation_id === get().activeConvoId) return
          // Ignore messages that were already covered by a markRead call
          const lastRead = get().lastReadTimestamps[msg.conversation_id]
          if (lastRead && msg.created_at && msg.created_at <= lastRead) return

          set(s => ({
            counts: { ...s.counts, [msg.conversation_id]: (s.counts[msg.conversation_id] || 0) + 1 },
            total: s.total + 1
          }))

          const { data: sender } = await supabase
            .from('profiles').select('username, display_name').eq('id', msg.sender_id).single()
          const name = sender?.display_name || sender?.username || 'Someone'
          let preview = '📎'
          if (!msg.type || msg.type === 'text') {
            const c = msg.content || ''
            preview = c.length > 40 ? c.slice(0, 40) + '…' : c
          } else if (msg.type === 'poll') {
            preview = '📊 Created a poll'
          } else if (msg.type === 'image') {
            preview = '🖼 Sent an image'
          }

          toast(`💬 ${name}: ${preview}`, {
            duration: 4000,
            style: { background: '#13131a', color: '#e2e8f0', border: '1px solid #2a2a3e' }
          })
        }
      ).subscribe()

    set({ channel: ch })
  },

  unsubscribe: () => {
    const { channel, friendRequestsChannel, teamJoinRequestsChannel, teamInvitesChannel } = get()
    if (channel) { supabase.removeChannel(channel); set({ channel: null }) }
    if (friendRequestsChannel) { supabase.removeChannel(friendRequestsChannel); set({ friendRequestsChannel: null }) }
    if (teamJoinRequestsChannel) { supabase.removeChannel(teamJoinRequestsChannel); set({ teamJoinRequestsChannel: null }) }
    if (teamInvitesChannel) { supabase.removeChannel(teamInvitesChannel); set({ teamInvitesChannel: null }) }
  },

  reset: () => set({ counts: {}, total: 0, activeConvoId: null, friendRequests: 0, lastReadTimestamps: {}, teamJoinRequests: 0, teamInvites: 0 })
}))
