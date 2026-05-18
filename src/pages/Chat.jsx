import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Send, Trash2, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUnreadStore } from '../store/unreadStore'
import Avatar from '../components/ui/Avatar'
import { timeAgo } from '../utils/formatters'
import toast from 'react-hot-toast'

export default function Chat() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { markRead, setActiveConvo } = useUnreadStore()
  const [messages, setMessages] = useState([])
  const [otherUser, setOtherUser] = useState(null)
  const [groupInfo, setGroupInfo] = useState(null) // { name, memberCount } for group chats
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef()
  const inputRef = useRef()

  useEffect(() => {
    setActiveConvo(id)
    if (user) markRead(id, user.id)
    return () => {
      setActiveConvo(null)
      // Mark read on exit too — covers any messages that arrived while viewing
      if (user) markRead(id, user.id)
    }
  }, [id, user])

  useEffect(() => {
    loadConversation()

    const channel = supabase
      .channel(`chat-${id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('*, sender:profiles!sender_id(id,username,avatar_url)')
            .eq('id', payload.new.id).single()
          if (data) {
            setMessages(prev => {
              if (prev.find(m => m.id === data.id)) return prev
              return [...prev, data]
            })
            // Mark as read immediately since user is viewing this chat
            if (user && data.sender_id !== user.id) markRead(id, user.id)
          }
        }
      ).subscribe()

    return () => supabase.removeChannel(channel)
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversation = async () => {
    setLoading(true)
    try {
      // Check if group or DM
      const { data: convo } = await supabase
        .from('conversations')
        .select('id, name, is_group')
        .eq('id', id)
        .single()

      if (convo?.is_group) {
        const { count } = await supabase
          .from('conversation_participants')
          .select('user_id', { count: 'exact', head: true })
          .eq('conversation_id', id)
        setGroupInfo({ name: convo.name || 'Group Chat', memberCount: count || 0 })
        setOtherUser(null)
      } else {
        const { data: other } = await supabase
          .from('conversation_participants')
          .select('profile:profiles!user_id(id,username,avatar_url,display_name)')
          .eq('conversation_id', id)
          .neq('user_id', user.id)
          .single()
        setOtherUser(other?.profile)
        setGroupInfo(null)
      }

      const { data: msgs } = await supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(id,username,avatar_url)')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })
        .limit(100)
      setMessages(msgs || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e) => {
    e?.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    const content = text.trim()
    setText('')
    try {
      await supabase.from('messages').insert({
        conversation_id: id,
        sender_id: user.id,
        content,
      })
    } catch {
      toast.error('Failed to send message')
      setText(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const deleteConversation = async () => {
    if (!confirm('Delete this conversation? This cannot be undone.')) return
    try {
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', id)
        .eq('user_id', user.id)
      toast.success('Conversation deleted')
      navigate('/messages')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Group messages by day
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
    return groups
  }, {})

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
        <button onClick={() => navigate('/messages')} className="p-2 text-muted hover:text-white hover:bg-surface rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        {groupInfo && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
              <Users size={14} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{groupInfo.name}</p>
              <p className="text-xs text-muted">{groupInfo.memberCount} members</p>
            </div>
          </div>
        )}
        {otherUser && (
          <Link to={`/profile/${otherUser.username}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-1 min-w-0">
            <Avatar src={otherUser.avatar_url} name={otherUser.username} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{otherUser.display_name || otherUser.username}</p>
              <p className="text-xs text-muted">@{otherUser.username}</p>
            </div>
          </Link>
        )}
        <button
          onClick={deleteConversation}
          className="ml-auto p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
          title="Delete conversation"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {groupInfo ? (
              <div className="w-16 h-16 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center mb-4">
                <Users size={28} className="text-accent" />
              </div>
            ) : (
              <Avatar src={otherUser?.avatar_url} name={otherUser?.username} size="lg" className="mb-4" />
            )}
            <p className="text-white font-semibold">{groupInfo?.name || otherUser?.display_name || otherUser?.username}</p>
            <p className="text-sm text-muted mt-1">Say hi to start the conversation!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dayMessages]) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted">{date}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-1">
                {dayMessages.map((msg, i) => {
                  const isOwn = msg.sender_id === user.id
                  const prevMsg = dayMessages[i - 1]
                  const showAvatar = !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id)

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {!isOwn && (
                        <div className="w-7 shrink-0">
                          {showAvatar && <Avatar src={msg.sender?.avatar_url} name={msg.sender?.username} size="xs" />}
                        </div>
                      )}
                      <div className={`group flex flex-col max-w-xs sm:max-w-sm ${isOwn ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                          isOwn
                            ? 'bg-accent text-white rounded-br-sm'
                            : 'bg-surface border border-border text-slate-200 rounded-bl-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-xs text-muted mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {timeAgo(msg.created_at)}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card/50">
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={1000}
            className="flex-1 px-4 py-2.5 bg-surface border border-border rounded-full text-sm text-slate-200 placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="p-2.5 bg-accent hover:bg-accent-hover text-white rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
