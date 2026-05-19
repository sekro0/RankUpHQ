import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, UserPlus, UserMinus, MessageSquare, ShieldOff, Check, X, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUnreadStore } from '../store/unreadStore'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const TABS = ['Friends', 'Requests', 'Find Players']

export default function Friends() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { clearAllFriendRequests } = useUnreadStore()
  const [tab, setTab] = useState(0)
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [friendshipMap, setFriendshipMap] = useState({}) // userId -> { id, status, isRequester }
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [actioning, setActioning] = useState(null)
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', confirmText: 'Confirm', onConfirm: null })
  const showConfirm = (config) => setConfirmState({ open: true, confirmText: 'Confirm', ...config })
  const closeConfirm = () => setConfirmState(s => ({ ...s, open: false }))

  useEffect(() => {
    if (!user) return
    loadFriendships()

    // Real-time: add incoming friend requests to the list immediately
    const channel = supabase
      .channel(`friends-rt-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${user.id}` },
        async (payload) => {
          if (payload.new.status !== 'pending') return
          const { data: requester } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', payload.new.requester_id)
            .single()
          if (!requester) return
          const newFriendship = { ...payload.new, other: requester }
          setRequests(prev => {
            if (prev.find(r => r.id === payload.new.id)) return prev
            return [...prev, newFriendship]
          })
          setFriendshipMap(prev => ({
            ...prev,
            [requester.id]: { id: payload.new.id, status: 'pending', isRequester: false }
          }))
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const loadFriendships = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('friendships')
        .select('*, requester:profiles!requester_id(id,username,display_name,avatar_url), addressee:profiles!addressee_id(id,username,display_name,avatar_url)')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

      const map = {}
      const accepted = []
      const pending = []

      for (const f of data || []) {
        const isRequester = f.requester_id === user.id
        const other = isRequester ? f.addressee : f.requester
        map[other.id] = { id: f.id, status: f.status, isRequester }

        if (f.status === 'accepted') accepted.push({ ...f, other })
        if (f.status === 'pending' && !isRequester) pending.push({ ...f, other })
      }

      setFriends(accepted)
      setRequests(pending)
      setFriendshipMap(map)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const search = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .ilike('username', `%${searchQuery.trim()}%`)
        .neq('id', user.id)
        .limit(10)
      setSearchResults(data || [])
    } catch { toast.error('Search failed') }
    finally { setSearching(false) }
  }

  const cancelRequest = async (targetId) => {
    const friendship = friendshipMap[targetId]
    if (!friendship) return
    setActioning(targetId)
    try {
      await supabase.from('friendships').delete().eq('id', friendship.id)
      setFriendshipMap(prev => {
        const n = { ...prev }; delete n[targetId]; return n
      })
      toast.success('Request cancelled')
    } catch { toast.error('Failed to cancel') }
    finally { setActioning(null) }
  }

  const sendRequest = async (targetId) => {
    setActioning(targetId)
    try {
      const { data, error } = await supabase.from('friendships')
        .insert({ requester_id: user.id, addressee_id: targetId, status: 'pending' })
        .select().single()
      if (error) throw error
      setFriendshipMap(prev => ({ ...prev, [targetId]: { id: data.id, status: 'pending', isRequester: true } }))
      toast.success('Friend request sent!')
    } catch (err) {
      toast.error(err.message?.includes('unique') ? 'Already sent' : 'Failed to send request')
    } finally { setActioning(null) }
  }

  const acceptRequest = async (friendship) => {
    setActioning(friendship.id)
    try {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendship.id)
      setRequests(prev => prev.filter(r => r.id !== friendship.id))
      setFriends(prev => [...prev, { ...friendship, status: 'accepted' }])
      setFriendshipMap(prev => ({ ...prev, [friendship.other.id]: { ...prev[friendship.other.id], status: 'accepted' } }))
      toast.success(`You're now friends with ${friendship.other.username}!`)
    } catch { toast.error('Failed to accept') }
    finally { setActioning(null) }
  }

  const declineRequest = async (friendship) => {
    setActioning(friendship.id)
    try {
      await supabase.from('friendships').delete().eq('id', friendship.id)
      setRequests(prev => prev.filter(r => r.id !== friendship.id))
      setFriendshipMap(prev => {
        const n = { ...prev }; delete n[friendship.other.id]; return n
      })
      toast.success('Request declined')
    } catch { toast.error('Failed to decline') }
    finally { setActioning(null) }
  }

  const removeFriend = async (friendship) => {
    showConfirm({
      title: 'Remove friend',
      message: `Remove ${friendship.other.display_name || friendship.other.username} from your friends?`,
      confirmText: 'Remove',
      onConfirm: () => doRemoveFriend(friendship),
    })
  }

  const doRemoveFriend = async (friendship) => {
    setActioning(friendship.id)
    try {
      await supabase.from('friendships').delete().eq('id', friendship.id)
      setFriends(prev => prev.filter(f => f.id !== friendship.id))
      setFriendshipMap(prev => {
        const n = { ...prev }; delete n[friendship.other.id]; return n
      })
      toast.success('Friend removed')
    } catch { toast.error('Failed to remove') }
    finally { setActioning(null) }
  }

  const blockUser = async (targetId, existingId) => {
    showConfirm({
      title: 'Block user',
      message: "They won't be able to send you friend requests or appear in your search results.",
      confirmText: 'Block',
      onConfirm: () => doBlockUser(targetId, existingId),
    })
  }

  const doBlockUser = async (targetId, existingId) => {
    setActioning(targetId)
    try {
      if (existingId) {
        await supabase.from('friendships').update({ status: 'blocked' }).eq('id', existingId)
      } else {
        await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: targetId, status: 'blocked' })
      }
      setFriends(prev => prev.filter(f => f.other?.id !== targetId))
      setFriendshipMap(prev => ({ ...prev, [targetId]: { ...prev[targetId], status: 'blocked', isRequester: true } }))
      toast.success('User blocked')
    } catch { toast.error('Failed to block') }
    finally { setActioning(null) }
  }

  const startChat = async (targetId) => {
    try {
      const { data: myConvos } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id)
      const myConvoIds = (myConvos || []).map(c => c.conversation_id)
      if (myConvoIds.length > 0) {
        const { data: shared } = await supabase.from('conversation_participants')
          .select('conversation_id').eq('user_id', targetId).in('conversation_id', myConvoIds).maybeSingle()
        if (shared) { navigate(`/messages/${shared.conversation_id}`); return }
      }
      const convoId = crypto.randomUUID()
      await supabase.from('conversations').insert({ id: convoId })
      await supabase.from('conversation_participants').insert([
        { conversation_id: convoId, user_id: user.id },
        { conversation_id: convoId, user_id: targetId }
      ])
      navigate(`/messages/${convoId}`)
    } catch { toast.error('Failed to start chat') }
  }

  const FriendRow = ({ friendship, showActions = true }) => (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3.5 bg-surface border border-border rounded-xl"
    >
      <Link to={`/profile/${friendship.other?.username}`}>
        <Avatar src={friendship.other?.avatar_url} name={friendship.other?.username} size="md" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/profile/${friendship.other?.username}`} className="text-sm font-semibold text-white hover:text-accent transition-colors">
          {friendship.other?.display_name || friendship.other?.username}
        </Link>
        <p className="text-xs text-muted">@{friendship.other?.username}</p>
      </div>
      {showActions && (
        <div className="flex items-center gap-2">
          <button onClick={() => startChat(friendship.other?.id)} className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Message">
            <MessageSquare size={15} />
          </button>
          <button onClick={() => removeFriend(friendship)} disabled={actioning === friendship.id} className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Remove friend">
            <UserMinus size={15} />
          </button>
          <button onClick={() => blockUser(friendship.other?.id, friendship.id)} disabled={actioning === friendship.id} className="p-2 text-muted hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors" title="Block">
            <ShieldOff size={15} />
          </button>
        </div>
      )}
    </motion.div>
  )

  const SearchResultRow = ({ profile }) => {
    const friendship = friendshipMap[profile.id]
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-3.5 bg-surface border border-border rounded-xl"
      >
        <Link to={`/profile/${profile.username}`}>
          <Avatar src={profile.avatar_url} name={profile.username} size="md" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/profile/${profile.username}`} className="text-sm font-semibold text-white hover:text-accent transition-colors">
            {profile.display_name || profile.username}
          </Link>
          <p className="text-xs text-muted">@{profile.username}</p>
          {profile.bio && <p className="text-xs text-muted truncate mt-0.5">{profile.bio}</p>}
        </div>
        <div>
          {!friendship && (
            <Button size="sm" onClick={() => sendRequest(profile.id)} loading={actioning === profile.id}>
              <UserPlus size={14} /> Add
            </Button>
          )}
          {friendship?.status === 'pending' && friendship.isRequester && (
            <button
              onClick={() => cancelRequest(profile.id)}
              disabled={actioning === profile.id}
              className="text-xs text-muted bg-surface border border-border px-3 py-1.5 rounded-lg hover:text-red-400 hover:border-red-500/30 transition-colors"
            >
              Pending · Cancel
            </button>
          )}
          {friendship?.status === 'pending' && !friendship.isRequester && (
            <span className="text-xs text-accent">Sent you a request</span>
          )}
          {friendship?.status === 'accepted' && (
            <span className="text-xs text-green-400 flex items-center gap-1"><Check size={12} /> Friends</span>
          )}
          {friendship?.status === 'blocked' && (
            <span className="text-xs text-muted">Blocked</span>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-white mb-6">Friends</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-6">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => { setTab(i); if (i === 1) clearAllFriendRequests() }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all relative ${tab === i ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
          >
            {t}
            {i === 1 && requests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Friends tab */}
      {tab === 0 && (
        <div className="space-y-2">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="h-16 bg-surface rounded-xl animate-pulse border border-border" />)
          ) : friends.length === 0 ? (
            <div className="text-center py-16">
              <Users size={48} className="mx-auto mb-4 text-muted opacity-40" />
              <h3 className="text-lg font-semibold text-white mb-2">No friends yet</h3>
              <p className="text-muted text-sm mb-4">Search for players or use Discover to find teammates</p>
              <Button onClick={() => setTab(2)} variant="secondary">Find Players</Button>
            </div>
          ) : (
            <AnimatePresence>
              {friends.map(f => <FriendRow key={f.id} friendship={f} />)}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Requests tab */}
      {tab === 1 && (
        <div className="space-y-2">
          {loading ? (
            [1,2].map(i => <div key={i} className="h-16 bg-surface rounded-xl animate-pulse border border-border" />)
          ) : requests.length === 0 ? (
            <div className="text-center py-16">
              <UserPlus size={48} className="mx-auto mb-4 text-muted opacity-40" />
              <h3 className="text-lg font-semibold text-white mb-2">No pending requests</h3>
              <p className="text-muted text-sm">Friend requests will appear here</p>
            </div>
          ) : (
            <AnimatePresence>
              {requests.map(f => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3.5 bg-surface border border-border rounded-xl"
                >
                  <Link to={`/profile/${f.other?.username}`}>
                    <Avatar src={f.other?.avatar_url} name={f.other?.username} size="md" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${f.other?.username}`} className="text-sm font-semibold text-white hover:text-accent transition-colors">
                      {f.other?.display_name || f.other?.username}
                    </Link>
                    <p className="text-xs text-muted">@{f.other?.username} wants to be your friend</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRequest(f)}
                      disabled={actioning === f.id}
                      className="p-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-lg transition-colors"
                      title="Accept"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={() => declineRequest(f)}
                      disabled={actioning === f.id}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-colors"
                      title="Decline"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Find Players tab */}
      {tab === 2 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="Search by username..."
                className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>
            <Button onClick={search} loading={searching}>Search</Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <AnimatePresence>
                {searchResults.map(p => <SearchResultRow key={p.id} profile={p} />)}
              </AnimatePresence>
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !searching && (
            <div className="text-center py-8 text-muted text-sm">No players found for "{searchQuery}"</div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        onClose={closeConfirm}
        onConfirm={() => { closeConfirm(); confirmState.onConfirm?.() }}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
      />
    </div>
  )
}
