import { useEffect } from 'react'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useGamesStore } from '../store/gamesStore'
import { useUnreadStore } from '../store/unreadStore'

export default function AuthProvider({ children }) {
  const { setSession, setUser, setProfile, setLoading, clear } = useAuthStore()
  const loadGames = useGamesStore(s => s.loadGames)
  const { loadCounts, subscribe, unsubscribe, reset, loadFriendRequests, subscribeFriendRequests, loadTeamJoinRequests, subscribeTeamRequests } = useUnreadStore()

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (data) setProfile(data)
    } catch (e) {}
  }

  useEffect(() => {
    loadGames()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        loadCounts(session.user.id)
        subscribe(session.user.id)
        loadFriendRequests(session.user.id)
        subscribeFriendRequests(session.user.id)
        loadTeamJoinRequests(session.user.id)
        subscribeTeamRequests(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user.id)
        loadCounts(session.user.id)
        subscribe(session.user.id)
        loadFriendRequests(session.user.id)
        subscribeFriendRequests(session.user.id)
        loadTeamJoinRequests(session.user.id)
        subscribeTeamRequests(session.user.id)
      }
      if (event === 'SIGNED_OUT') {
        clear()
        unsubscribe()
        reset()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return children
}
