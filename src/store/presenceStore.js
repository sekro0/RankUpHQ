import { create } from 'zustand'
import supabase from '../lib/supabase'

export const usePresenceStore = create((set, get) => ({
  onlineUsers: new Set(),
  channel: null,

  join: (userId) => {
    const existing = get().channel
    if (existing) { try { supabase.removeChannel(existing) } catch {} }

    const ch = supabase.channel('global-presence', {
      config: { presence: { key: userId } }
    })
      .on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState()
        const ids = new Set(
          Object.values(state).flat().map(p => p.userId).filter(Boolean)
        )
        set({ onlineUsers: ids })
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        set(s => {
          const updated = new Set(s.onlineUsers)
          newPresences.forEach(p => { if (p.userId) updated.add(p.userId) })
          return { onlineUsers: updated }
        })
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        set(s => {
          const updated = new Set(s.onlineUsers)
          leftPresences.forEach(p => { if (p.userId) updated.delete(p.userId) })
          return { onlineUsers: updated }
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({ userId, online_at: new Date().toISOString() })
        }
      })

    set({ channel: ch })
  },

  leave: () => {
    const ch = get().channel
    if (ch) {
      try { supabase.removeChannel(ch) } catch {}
      set({ channel: null, onlineUsers: new Set() })
    }
  },

  isOnline: (userId) => {
    if (!userId) return false
    return get().onlineUsers.has(userId)
  }
}))
