import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Send, Trash2, Users, ImageIcon, BarChart2, X, Plus, Minus, Search, AtSign, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUnreadStore } from '../store/unreadStore'
import Avatar from '../components/ui/Avatar'
import { timeAgo } from '../utils/formatters'
import toast from 'react-hot-toast'

const URL_REGEX = /(https?:\/\/[^\s]+)/g

// Lazy-loading image with skeleton + zoom overlay
function ChatImage({ src, onLightbox }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div
      className="relative cursor-pointer group max-w-xs"
      onClick={() => onLightbox(src)}
    >
      {!loaded && <div className="w-52 h-40 bg-surface animate-pulse rounded-2xl" />}
      <img
        src={src}
        alt="shared"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`max-w-xs max-h-60 rounded-2xl object-cover transition-all duration-300 group-hover:brightness-90 ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0 w-0 h-0'}`}
      />
      {loaded && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <Maximize2 size={18} className="text-white drop-shadow" />
        </div>
      )}
    </div>
  )
}

function MessageContent({ msg, currentUserId, groupMembers, onVote, onLightbox }) {
  if (msg.type === 'image') {
    return <ChatImage src={msg.content} onLightbox={onLightbox} />
  }

  if (msg.type === 'poll') {
    const meta = msg.metadata || {}
    const options = meta.options || []
    const votes = msg.votes || []
    const totalVotes = votes.length
    const myVote = votes.find(v => v.user_id === currentUserId)
    const getCount = (idx) => votes.filter(v => v.option_index === idx).length
    const getPct = (idx) => totalVotes === 0 ? 0 : Math.round((getCount(idx) / totalVotes) * 100)

    return (
      <div className="w-64 py-1">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart2 size={11} className="text-accent opacity-70" />
          <span className="text-xs text-muted font-semibold uppercase tracking-wide">Poll</span>
        </div>
        <p className="text-sm font-semibold text-white mb-3">{meta.question}</p>
        <div className="space-y-2">
          {options.map((opt, idx) => {
            const pct = getPct(idx)
            const isMyChoice = myVote?.option_index === idx
            return (
              <button
                key={idx}
                onMouseDown={e => e.preventDefault()}
                onClick={() => !myVote && onVote(msg.id, idx)}
                disabled={!!myVote}
                className={`w-full text-left rounded-lg overflow-hidden border transition-all ${
                  isMyChoice ? 'border-accent' : myVote ? 'border-border' : 'border-border hover:border-accent/50'
                } ${myVote ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="relative px-3 py-2 min-h-[36px]">
                  {myVote && (
                    <div
                      className={`absolute inset-y-0 left-0 transition-all ${isMyChoice ? 'bg-accent/25' : 'bg-white/5'}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  )}
                  <div className="relative flex justify-between items-center gap-2">
                    <span className="text-xs text-slate-200 flex-1 truncate">{opt}</span>
                    {myVote && <span className="text-xs text-muted shrink-0">{pct}%</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted mt-2">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}{myVote ? ' · Voted' : ''}
        </p>
      </div>
    )
  }

  // text: render links + @mentions
  const content = msg.content || ''
  const parts = content.split(URL_REGEX)
  return (
    <span className="break-words whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer"
              className="underline opacity-80 hover:opacity-100 break-all"
              onClick={e => e.stopPropagation()}>
              {part}
            </a>
          )
        }
        return part.split(/(@\w+)/g).map((mp, j) => {
          if (mp.startsWith('@') && groupMembers.some(m => m.username === mp.slice(1))) {
            return <span key={`${i}-${j}`} className="font-bold opacity-95">{mp}</span>
          }
          return <span key={`${i}-${j}`}>{mp}</span>
        })
      })}
    </span>
  )
}

export default function Chat() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { markRead, setActiveConvo } = useUnreadStore()
  const [messages, setMessages] = useState([])
  const [otherUser, setOtherUser] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [groupInfo, setGroupInfo] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showPollModal, setShowPollModal] = useState(false)
  const [pollDraft, setPollDraft] = useState({ question: '', options: ['', ''] })
  const [mentionQuery, setMentionQuery] = useState(null)
  const [imagePreview, setImagePreview] = useState(null) // { file, url }
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mentionNavIdx, setMentionNavIdx] = useState(0)
  const bottomRef = useRef()
  const inputRef = useRef()
  const imageInputRef = useRef()
  const messagesRef = useRef([])
  const messageElRefs = useRef({})

  useEffect(() => { messagesRef.current = messages }, [messages])

  const myUsername = profile?.username

  // Messages where the current user is mentioned (by others)
  const myMentionIds = messages
    .filter(m => myUsername && (m.content || '').includes(`@${myUsername}`) && m.sender_id !== user?.id)
    .map(m => m.id)

  useEffect(() => {
    setActiveConvo(id)
    return () => {
      if (user) {
        const msgs = messagesRef.current
        const latest = msgs[msgs.length - 1]
        markRead(id, user.id, latest?.created_at ?? null)
      }
      setActiveConvo(null)
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
              return [...prev, { ...data, votes: [] }]
            })
            if (user && data.sender_id !== user.id) markRead(id, user.id, data.created_at)
          }
        }
      ).subscribe()

    return () => supabase.removeChannel(channel)
  }, [id])

  useEffect(() => {
    if (!searchOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, searchOpen])

  // Close search when Escape pressed globally
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const loadConversation = async () => {
    setLoading(true)
    try {
      const { data: convo } = await supabase
        .from('conversations')
        .select('id, name, is_group')
        .eq('id', id)
        .single()

      if (convo?.is_group) {
        const [{ count }, { data: members }] = await Promise.all([
          supabase.from('conversation_participants')
            .select('user_id', { count: 'exact', head: true })
            .eq('conversation_id', id),
          supabase.from('conversation_participants')
            .select('profile:profiles!user_id(id,username,avatar_url,display_name)')
            .eq('conversation_id', id),
        ])
        setGroupInfo({ name: convo.name || 'Group Chat', memberCount: count || 0 })
        setGroupMembers(members?.map(m => m.profile).filter(Boolean) || [])
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
        setGroupMembers([])
      }

      const { data: msgs } = await supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(id,username,avatar_url)')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })
        .limit(100)

      const msgsData = msgs || []
      const pollIds = msgsData.filter(m => m.type === 'poll').map(m => m.id)
      let votesMap = {}
      if (pollIds.length > 0) {
        const { data: votes } = await supabase
          .from('poll_votes')
          .select('message_id, user_id, option_index')
          .in('message_id', pollIds)
        for (const v of (votes || [])) {
          if (!votesMap[v.message_id]) votesMap[v.message_id] = []
          votesMap[v.message_id].push(v)
        }
      }

      const enriched = msgsData.map(m => ({ ...m, votes: votesMap[m.id] || [] }))
      setMessages(enriched)
      if (user && enriched.length > 0) {
        markRead(id, user.id, enriched[enriched.length - 1].created_at)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleTextChange = (e) => {
    const val = e.target.value
    setText(val)
    if (!groupInfo) { setMentionQuery(null); return }
    const cursor = e.target.selectionStart
    const beforeCursor = val.slice(0, cursor)
    const match = beforeCursor.match(/@(\w*)$/)
    setMentionQuery(match ? match[1] : null)
  }

  const insertMention = (username) => {
    const cursor = inputRef.current?.selectionStart || text.length
    const before = text.slice(0, cursor)
    const after = text.slice(cursor)
    setText(before.replace(/@\w*$/, `@${username} `) + after)
    setMentionQuery(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const filteredMentions = mentionQuery !== null
    ? groupMembers
        .filter(m => m.username.toLowerCase().startsWith(mentionQuery.toLowerCase()) && m.id !== user?.id)
        .slice(0, 5)
    : []

  // Fix: don't include `type` for regular text messages (avoids breaking if migration not run)
  const sendMessage = async (e) => {
    e?.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    const content = text.trim()
    setText('')
    setMentionQuery(null)
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

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setImagePreview({ file, url: URL.createObjectURL(file) })
    e.target.value = ''
  }

  const sendImage = async () => {
    if (!imagePreview || uploading) return
    setUploading(true)
    try {
      const ext = imagePreview.file.name.split('.').pop()
      const path = `${id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('chat-images').upload(path, imagePreview.file)
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(path)
      await supabase.from('messages').insert({
        conversation_id: id,
        sender_id: user.id,
        content: publicUrl,
        type: 'image',
      })
      URL.revokeObjectURL(imagePreview.url)
      setImagePreview(null)
    } catch (err) {
      toast.error('Failed to upload image')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const cancelImagePreview = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview.url)
    setImagePreview(null)
  }

  const sendPoll = async () => {
    if (!pollDraft.question.trim()) { toast.error('Question is required'); return }
    const opts = pollDraft.options.filter(o => o.trim())
    if (opts.length < 2) { toast.error('Add at least 2 options'); return }
    try {
      await supabase.from('messages').insert({
        conversation_id: id,
        sender_id: user.id,
        content: pollDraft.question.trim(),
        type: 'poll',
        metadata: { question: pollDraft.question.trim(), options: opts },
      })
      setShowPollModal(false)
      setPollDraft({ question: '', options: ['', ''] })
    } catch {
      toast.error('Failed to create poll')
    }
  }

  const votePoll = async (messageId, optionIndex) => {
    try {
      await supabase.from('poll_votes').insert({ message_id: messageId, user_id: user.id, option_index: optionIndex })
      const { data: votes } = await supabase
        .from('poll_votes').select('message_id, user_id, option_index').eq('message_id', messageId)
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, votes: votes || [] } : m))
    } catch {
      toast.error('Failed to vote')
    }
  }

  const deleteConversation = async () => {
    try {
      await supabase.from('conversation_participants').delete()
        .eq('conversation_id', id).eq('user_id', user.id)
      toast.success('Conversation deleted')
      navigate('/messages')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const jumpToMention = () => {
    if (!myMentionIds.length) return
    const targetId = myMentionIds[mentionNavIdx % myMentionIds.length]
    messageElRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setMentionNavIdx(i => (i + 1) % myMentionIds.length)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setMentionQuery(null); return }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (filteredMentions.length > 0 && mentionQuery !== null) {
        e.preventDefault()
        insertMention(filteredMentions[0].username)
        return
      }
      e.preventDefault()
      sendMessage()
    }
  }

  const displayMessages = searchQuery.trim()
    ? messages.filter(m => m.type !== 'image' && (m.content || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  const groupedMessages = displayMessages.reduce((groups, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
    return groups
  }, {})

  const highlightSearch = (content) => {
    if (!searchQuery.trim()) return content
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = content.split(new RegExp(`(${escaped})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? <mark key={i} className="bg-accent/40 text-white rounded-sm px-0.5">{part}</mark>
        : part
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative">

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxSrc(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
              onClick={() => setLightboxSrc(null)}
            >
              <X size={22} />
            </button>
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              src={lightboxSrc}
              alt="Image"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
        <button onClick={() => navigate('/messages')} className="p-2 text-muted hover:text-white hover:bg-surface rounded-lg transition-colors shrink-0">
          <ArrowLeft size={18} />
        </button>

        {searchOpen ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              autoFocus
              className="flex-1 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-slate-200 placeholder-muted focus:outline-none focus:border-accent"
            />
            {searchQuery && (
              <span className="text-xs text-muted whitespace-nowrap shrink-0">
                {displayMessages.length} result{displayMessages.length !== 1 ? 's' : ''}
              </span>
            )}
            <button onClick={() => { setSearchOpen(false); setSearchQuery('') }} className="p-1.5 text-muted hover:text-white shrink-0">
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
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
            <div className="ml-auto flex items-center gap-1 shrink-0">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-muted hover:text-white hover:bg-surface rounded-lg transition-colors"
                title="Search messages"
              >
                <Search size={16} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative">

        {/* Mention jump banner */}
        <AnimatePresence>
          {myMentionIds.length > 0 && !searchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="sticky top-0 z-10 flex justify-center"
            >
              <button
                onClick={jumpToMention}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/90 hover:bg-accent text-white text-xs font-medium rounded-full shadow-lg transition-colors"
              >
                <AtSign size={11} />
                {myMentionIds.length} mention{myMentionIds.length !== 1 ? 's' : ''} — tap to jump ↓
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {searchQuery.trim() ? (
              <>
                <Search size={28} className="text-muted mb-2 opacity-40" />
                <p className="text-sm text-muted">No results for "{searchQuery}"</p>
              </>
            ) : groupInfo ? (
              <>
                <div className="w-16 h-16 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center mb-4">
                  <Users size={28} className="text-accent" />
                </div>
                <p className="text-white font-semibold">{groupInfo.name}</p>
                <p className="text-sm text-muted mt-1">Say hi to start the conversation!</p>
              </>
            ) : (
              <>
                <Avatar src={otherUser?.avatar_url} name={otherUser?.username} size="lg" className="mb-4" />
                <p className="text-white font-semibold">{otherUser?.display_name || otherUser?.username}</p>
                <p className="text-sm text-muted mt-1">Say hi to start the conversation!</p>
              </>
            )}
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
                  const isPoll = msg.type === 'poll'
                  const isImage = msg.type === 'image'
                  const isMentioned = myMentionIds.includes(msg.id)

                  return (
                    <motion.div
                      key={msg.id}
                      ref={el => { if (el) messageElRefs.current[msg.id] = el }}
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {!isOwn && (
                        <div className="w-7 shrink-0">
                          {showAvatar && <Avatar src={msg.sender?.avatar_url} name={msg.sender?.username} size="xs" />}
                        </div>
                      )}
                      <div className={`group flex flex-col max-w-xs sm:max-w-sm ${isOwn ? 'items-end' : 'items-start'}`}>
                        {groupInfo && showAvatar && !isOwn && (
                          <span className="text-xs text-muted ml-1 mb-0.5">{msg.sender?.username}</span>
                        )}
                        <div className={
                          isImage ? '' :
                          isPoll
                            ? `px-3 py-2 rounded-2xl ${isOwn ? 'bg-accent/15 border border-accent/25' : 'bg-surface border border-border'}`
                            : `px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                isMentioned
                                  ? 'border-l-2 border-accent bg-accent/5 pl-2.5 rounded-bl-sm text-slate-200'
                                  : isOwn
                                    ? 'bg-accent text-white rounded-br-sm'
                                    : 'bg-surface border border-border text-slate-200 rounded-bl-sm'
                              }`
                        }>
                          {searchQuery.trim() && !isImage && !isPoll ? (
                            <span className="break-words whitespace-pre-wrap text-sm">
                              {highlightSearch(msg.content || '')}
                            </span>
                          ) : (
                            <MessageContent
                              msg={msg}
                              currentUserId={user.id}
                              groupMembers={groupMembers}
                              onVote={votePoll}
                              onLightbox={setLightboxSrc}
                            />
                          )}
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

      {/* Poll Creation Modal */}
      <AnimatePresence>
        {showPollModal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="mx-4 mb-2 bg-card border border-border rounded-2xl p-4 shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart2 size={14} className="text-accent" /> Create Poll
              </h3>
              <button onClick={() => setShowPollModal(false)} className="text-muted hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <input
              value={pollDraft.question}
              onChange={e => setPollDraft(p => ({ ...p, question: e.target.value }))}
              placeholder="Ask a question..."
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-slate-200 placeholder-muted focus:outline-none focus:border-accent mb-3"
            />
            <div className="space-y-2 mb-3">
              {pollDraft.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={opt}
                    onChange={e => {
                      const opts = [...pollDraft.options]
                      opts[i] = e.target.value
                      setPollDraft(p => ({ ...p, options: opts }))
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-slate-200 placeholder-muted focus:outline-none focus:border-accent"
                  />
                  {pollDraft.options.length > 2 && (
                    <button
                      onClick={() => setPollDraft(p => ({ ...p, options: p.options.filter((_, j) => j !== i) }))}
                      className="p-2 text-muted hover:text-red-400 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              {pollDraft.options.length < 5 ? (
                <button
                  onClick={() => setPollDraft(p => ({ ...p, options: [...p.options, ''] }))}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Add option
                </button>
              ) : <span />}
              <button
                onClick={sendPoll}
                className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
              >
                Send Poll
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview before send */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="mx-4 mb-2 p-3 bg-card border border-border rounded-2xl flex items-end gap-3 shadow-xl"
          >
            <img
              src={imagePreview.url}
              alt="preview"
              className="w-24 h-20 object-cover rounded-xl border border-border shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted truncate mb-2">{imagePreview.file.name}</p>
              <div className="flex gap-2">
                <button
                  onClick={cancelImagePreview}
                  className="px-3 py-1.5 text-xs text-muted hover:text-white border border-border rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendImage}
                  disabled={uploading}
                  className="px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  {uploading
                    ? <><div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> Sending...</>
                    : <><Send size={11} /> Send</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* @Mention Dropdown */}
      <AnimatePresence>
        {filteredMentions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="mx-4 mb-1 bg-card border border-border rounded-xl overflow-hidden shadow-xl"
          >
            {filteredMentions.map(member => (
              <button
                key={member.id}
                onMouseDown={e => { e.preventDefault(); insertMention(member.username) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface transition-colors text-left"
              >
                <Avatar src={member.avatar_url} name={member.username} size="xs" />
                <div>
                  <p className="text-sm text-white font-medium leading-tight">{member.display_name || member.username}</p>
                  <p className="text-xs text-muted">@{member.username}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card/50">
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="p-2.5 text-muted hover:text-white hover:bg-surface rounded-full transition-colors shrink-0"
            title="Send image"
          >
            <ImageIcon size={16} />
          </button>
          {groupInfo && (
            <button
              type="button"
              onClick={() => setShowPollModal(p => !p)}
              className={`p-2.5 rounded-full transition-colors shrink-0 ${showPollModal ? 'text-accent bg-accent/10' : 'text-muted hover:text-white hover:bg-surface'}`}
              title="Create poll"
            >
              <BarChart2 size={16} />
            </button>
          )}
          <input
            ref={inputRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={groupInfo ? 'Message... (@ to mention)' : 'Type a message...'}
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

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); deleteConversation() }}
        title="Delete conversation"
        message="This will remove the conversation from your inbox. This cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}
