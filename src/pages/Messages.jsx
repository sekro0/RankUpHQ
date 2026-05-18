import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Search, Trash2, Users, Plus, Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUnreadStore } from '../store/unreadStore'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { timeAgo } from '../utils/formatters'

export default function Messages() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { counts } = useUnreadStore()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // New group modal
  const [groupModal, setGroupModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [friendSearch, setFriendSearch] = useState('')
  const [friendResults, setFriendResults] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [searchingFriends, setSearchingFriends] = useState(false)

  useEffect(() => {
    if (!user) return
    loadConversations()

    const channel = supabase
      .channel('messages-list-rt')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new
          setConversations(prev => {
            const convo = prev.find(c => c.id === msg.conversation_id)
            if (!convo) return prev
            const updated = prev.map(c =>
              c.id === msg.conversation_id ? { ...c, lastMessage: msg } : c
            )
            return updated.sort((a, b) => {
              const ta = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at) : new Date(0)
              const tb = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at) : new Date(0)
              return tb - ta
            })
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const loadConversations = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: participations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id)

      if (!participations?.length) { setLoading(false); return }

      const convoIds = participations.map(p => p.conversation_id)

      // Fetch conversation metadata (name, is_group) in one query
      const { data: convoMeta } = await supabase
        .from('conversations')
        .select('id, name, is_group, team_id')
        .in('id', convoIds)

      const metaMap = Object.fromEntries((convoMeta || []).map(c => [c.id, c]))

      const results = []
      for (const convoId of convoIds) {
        const meta = metaMap[convoId] || {}

        // Last message (same for DM and group)
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('conversation_id', convoId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (meta.is_group) {
          // For group: use conversation name, get participant count
          const { count } = await supabase
            .from('conversation_participants')
            .select('user_id', { count: 'exact', head: true })
            .eq('conversation_id', convoId)

          results.push({
            id: convoId,
            isGroup: true,
            name: meta.name || 'Group Chat',
            memberCount: count || 0,
            lastMessage: lastMsg,
          })
        } else {
          // DM: get other participant
          const { data: other } = await supabase
            .from('conversation_participants')
            .select('user_id, profile:profiles!user_id(id, username, avatar_url, display_name)')
            .eq('conversation_id', convoId)
            .neq('user_id', user.id)
            .single()

          results.push({
            id: convoId,
            isGroup: false,
            other: other?.profile,
            lastMessage: lastMsg,
          })
        }
      }

      results.sort((a, b) => {
        const ta = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at) : new Date(0)
        const tb = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at) : new Date(0)
        return tb - ta
      })

      setConversations(results)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const deleteConversation = async (convoId, e) => {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    try {
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', convoId)
        .eq('user_id', user.id)
      setConversations(prev => prev.filter(c => c.id !== convoId))
      toast.success('Conversation deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const searchFriends = async () => {
    if (!friendSearch.trim()) return
    setSearchingFriends(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `%${friendSearch.trim()}%`)
        .neq('id', user.id)
        .limit(8)
      setFriendResults((data || []).filter(p => !selectedMembers.find(m => m.id === p.id)))
    } catch { toast.error('Search failed') }
    finally { setSearchingFriends(false) }
  }

  const toggleMember = (profile) => {
    setSelectedMembers(prev =>
      prev.find(m => m.id === profile.id)
        ? prev.filter(m => m.id !== profile.id)
        : [...prev, profile]
    )
  }

  const createGroup = async () => {
    if (!groupName.trim()) { toast.error('Enter a group name'); return }
    if (selectedMembers.length === 0) { toast.error('Add at least one member'); return }
    setCreatingGroup(true)
    try {
      const convoId = crypto.randomUUID()
      await supabase.from('conversations').insert({
        id: convoId,
        name: groupName.trim(),
        is_group: true,
        created_by: user.id,
      })
      const allMembers = [user.id, ...selectedMembers.map(m => m.id)]
      await supabase.from('conversation_participants').insert(
        allMembers.map(uid => ({ conversation_id: convoId, user_id: uid }))
      )
      setGroupModal(false)
      setGroupName('')
      setSelectedMembers([])
      setFriendSearch('')
      setFriendResults([])
      navigate(`/messages/${convoId}`)
    } catch {
      toast.error('Failed to create group')
    } finally {
      setCreatingGroup(false)
    }
  }

  const filtered = conversations.filter(c => {
    if (!search) return true
    const name = c.isGroup ? c.name : (c.other?.username || c.other?.display_name || '')
    return name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-white">Messages</h1>
          <Button size="sm" variant="secondary" onClick={() => setGroupModal(true)}>
            <Plus size={14} /> New Group
          </Button>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-surface rounded-xl animate-pulse border border-border" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare size={48} className="mx-auto mb-4 text-muted opacity-40" />
          <h3 className="text-lg font-semibold text-white mb-2">{search ? 'No results' : 'No conversations yet'}</h3>
          <p className="text-muted text-sm">
            {search ? 'Try a different name' : 'Visit a player\'s profile and click "Message" to start chatting'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((convo, i) => (
            <motion.div
              key={convo.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative group flex items-center gap-3 p-3.5 rounded-xl hover:bg-surface border border-transparent hover:border-border transition-all"
            >
              <button
                onClick={() => navigate(`/messages/${convo.id}`)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                {convo.isGroup ? (
                  <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
                    <Users size={16} className="text-accent" />
                  </div>
                ) : (
                  <Avatar src={convo.other?.avatar_url} name={convo.other?.username} size="md" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white group-hover:text-accent transition-colors">
                      {convo.isGroup
                        ? convo.name
                        : (convo.other?.display_name || convo.other?.username || 'Unknown User')
                      }
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {convo.lastMessage && (
                        <span className="text-xs text-muted">{timeAgo(convo.lastMessage.created_at)}</span>
                      )}
                      {counts[convo.id] > 0 && (
                        <span className="min-w-[20px] h-5 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5">
                          {counts[convo.id] > 99 ? '99+' : counts[convo.id]}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${counts[convo.id] > 0 ? 'text-slate-300 font-medium' : 'text-muted'}`}>
                    {convo.isGroup && convo.memberCount
                      ? `${convo.memberCount} members${convo.lastMessage ? ' · ' + (convo.lastMessage.sender_id === user.id ? 'You: ' : '') + convo.lastMessage.content : ''}`
                      : convo.lastMessage
                        ? (convo.lastMessage.sender_id === user.id ? 'You: ' : '') + convo.lastMessage.content
                        : 'Start the conversation'
                    }
                  </p>
                </div>
              </button>
              <button
                onClick={(e) => deleteConversation(convo.id, e)}
                className="shrink-0 p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Delete conversation"
              >
                <Trash2 size={15} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* New Group Modal */}
      <Modal open={groupModal} onClose={() => { setGroupModal(false); setGroupName(''); setSelectedMembers([]); setFriendSearch(''); setFriendResults([]) }} title="New Group Chat">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Group Name</label>
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="e.g. Squad, Team Practice..."
              maxLength={50}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Add Members</label>
            <div className="flex gap-2 mb-2">
              <input
                value={friendSearch}
                onChange={e => setFriendSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchFriends()}
                placeholder="Search by username..."
                className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent"
              />
              <Button size="sm" onClick={searchFriends} loading={searchingFriends}>Search</Button>
            </div>

            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedMembers.map(m => (
                  <span key={m.id} className="flex items-center gap-1 px-2 py-1 bg-accent/20 text-accent text-xs rounded-full border border-accent/30">
                    {m.username}
                    <button onClick={() => toggleMember(m)} className="hover:text-white">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {friendResults.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {friendResults.map(p => {
                  const selected = !!selectedMembers.find(m => m.id === p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleMember(p)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${selected ? 'bg-accent/10 border-accent/30' : 'bg-surface border-border hover:border-accent/30'}`}
                    >
                      <Avatar src={p.avatar_url} name={p.username} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{p.display_name || p.username}</p>
                        <p className="text-xs text-muted">@{p.username}</p>
                      </div>
                      {selected && <Check size={14} className="text-accent shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <Button onClick={createGroup} loading={creatingGroup} className="w-full" disabled={!groupName.trim() || selectedMembers.length === 0}>
            Create Group ({selectedMembers.length + 1} members)
          </Button>
        </div>
      </Modal>
    </div>
  )
}
