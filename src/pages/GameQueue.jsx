import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, MessageSquare, LogIn, LogOut, Filter, X, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { RANK_COLORS } from '../utils/constants'
import { useGamesStore } from '../store/gamesStore'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { timeAgo } from '../utils/formatters'

function QueueEntryCard({ entry, onMessage, isOwn }) {
  const profile = entry.profile
  const rankColor = RANK_COLORS[entry.rank] || '#7c3aed'
  const ageHours = (Date.now() - new Date(entry.created_at).getTime()) / 3600000
  const isStale = ageHours >= 2

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`flex items-center gap-3 p-4 bg-surface border rounded-xl transition-colors ${isOwn ? 'border-accent/50 bg-accent/5' : isStale ? 'border-orange-500/20' : 'border-border hover:border-border/80'}`}
    >
      <Avatar src={profile?.avatar_url} name={profile?.username} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white text-sm">{profile?.username || 'Unknown'}</span>
          {isOwn && <Badge color="accent">You</Badge>}
          {entry.rank && (
            <span className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: `${rankColor}20`, color: rankColor }}>
              {entry.rank}
            </span>
          )}
          {entry.role && <Badge>{entry.role}</Badge>}
          {isStale && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">
              {ageHours < 24 ? `${Math.floor(ageHours)}h ago` : `${Math.floor(ageHours/24)}d ago`} · may be inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {entry.looking_for && (
            <span className="text-xs text-muted flex items-center gap-1">
              <Users size={11} />
              {entry.looking_for}
            </span>
          )}
          {entry.note && <span className="text-xs text-slate-400 italic truncate max-w-xs">"{entry.note}"</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted hidden sm:block">{timeAgo(entry.created_at)}</span>
        {!isOwn && (
          <button onClick={() => onMessage(profile)} className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors">
            <MessageSquare size={16} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default function GameQueue() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { gameBySlug } = useGamesStore()
  const game = gameBySlug[slug]

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [myEntry, setMyEntry] = useState(null)
  const [joinModal, setJoinModal] = useState(false)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [joinForm, setJoinForm] = useState({ rank: '', role: '', looking_for: '', note: '' })
  const [filters, setFilters] = useState({ rank: '', role: '', looking_for: '' })
  const lookingForOptions = game?.looking_for_options || [{ label: 'Any', value: 'any' }]
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!game) { navigate('/games'); return }
    loadEntries()

    const channel = supabase
      .channel(`queue-${game.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries', filter: `game_id=eq.${game.id}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data } = await supabase.from('queue_entries')
              .select('*, profile:profiles!user_id(id,username,avatar_url)')
              .eq('id', payload.new.id).single()
            if (data) {
              setEntries(prev => {
                if (prev.find(e => e.id === data.id)) return prev
                return [data, ...prev]
              })
              if (data.user_id === user?.id) setMyEntry(data)
            }
          }
          if (payload.eventType === 'DELETE') {
            setEntries(prev => prev.filter(e => e.id !== payload.old.id))
            if (payload.old.user_id === user?.id) setMyEntry(null)
          }
          if (payload.eventType === 'UPDATE') {
            setEntries(prev => prev.map(e => e.id === payload.new.id ? { ...e, ...payload.new } : e))
          }
        }
      ).subscribe()

    return () => supabase.removeChannel(channel)
  }, [slug])

  const loadEntries = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('queue_entries')
      .select('*, profile:profiles!user_id(id,username,avatar_url)')
      .eq('game_id', game.id)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
    if (data) {
      setEntries(data)
      setMyEntry(data.find(e => e.user_id === user?.id) || null)
    }
    setLoading(false)
  }

  const joinQueue = async () => {
    setJoining(true)
    try {
      const { error } = await supabase.from('queue_entries').insert({
        user_id: user.id, game_id: game.id,
        rank: joinForm.rank || null, role: joinForm.role || null,
        looking_for: joinForm.looking_for || null, note: joinForm.note || null,
        status: 'waiting'
      })
      if (error) throw error
      setJoinModal(false)
      toast.success('You joined the queue!')
    } catch (err) {
      if (err.code === '23505') toast.error('You are already in this queue')
      else toast.error(err.message || 'Failed to join queue')
    } finally { setJoining(false) }
  }

  const leaveQueue = async () => {
    if (!myEntry) return
    setLeaving(true)
    try {
      await supabase.from('queue_entries').delete().eq('id', myEntry.id)
      setMyEntry(null)
      toast.success('Left the queue')
    } catch { toast.error('Failed to leave queue') }
    finally { setLeaving(false) }
  }

  const handleMessage = async (profile) => {
    if (!user) { navigate('/login'); return }
    try {
      const { data: myConvos } = await supabase
        .from('conversation_participants')
        .select('conversation_id, conversation:conversations!conversation_id(is_group)')
        .eq('user_id', user.id)
      const myDmIds = (myConvos || []).filter(c => !c.conversation?.is_group).map(c => c.conversation_id)
      if (myDmIds.length > 0) {
        const { data: shared } = await supabase.from('conversation_participants')
          .select('conversation_id').eq('user_id', profile.id).in('conversation_id', myDmIds).maybeSingle()
        if (shared) { navigate(`/messages/${shared.conversation_id}`); return }
      }
      const convoId = crypto.randomUUID()
      const { error: convoError } = await supabase.from('conversations').insert({ id: convoId })
      if (convoError) throw convoError
      await supabase.from('conversation_participants').insert([
        { conversation_id: convoId, user_id: user.id },
        { conversation_id: convoId, user_id: profile.id }
      ])
      navigate(`/messages/${convoId}`)
    } catch (err) { toast.error(err?.message || JSON.stringify(err) || 'Failed to start conversation') }
  }

  const filteredEntries = entries.filter(e => {
    if (filters.rank && e.rank !== filters.rank) return false
    if (filters.role && e.role !== filters.role) return false
    if (filters.looking_for && e.looking_for !== filters.looking_for) return false
    return true
  })

  const hasFilters = Object.values(filters).some(Boolean)

  const avgWaitMin = (() => {
    if (filteredEntries.length === 0) return null
    const now = Date.now()
    const total = filteredEntries.reduce((acc, e) => acc + (now - new Date(e.created_at).getTime()), 0)
    return Math.round(total / filteredEntries.length / 60000)
  })()

  if (!game) return null

  const selectClass = "px-3 py-2 bg-surface border border-border rounded-lg text-slate-200 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/games')} className="p-2 text-muted hover:text-white hover:bg-surface rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white">{game.name}</h1>
            <span className="text-xs text-muted bg-surface border border-border px-2 py-0.5 rounded-full">{game.genre}</span>
          </div>
          <p className="text-sm text-muted">
            {filteredEntries.length} player{filteredEntries.length !== 1 ? 's' : ''} in queue
            {avgWaitMin !== null && (
              <span className="ml-2 inline-flex items-center gap-1 text-muted"><Clock size={11} /> ~{avgWaitMin}m avg wait</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${hasFilters ? 'text-accent border-accent/30 bg-accent/10' : 'text-muted border-border hover:text-white hover:bg-surface'}`}>
            <Filter size={18} />
          </button>
          {myEntry ? (
            <Button variant="danger" size="sm" loading={leaving} onClick={leaveQueue}>
              <LogOut size={14} /> Leave Queue
            </Button>
          ) : (
            <Button size="sm" onClick={() => setJoinModal(true)}>
              <LogIn size={14} /> Join Queue
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4">
            <div className="p-4 bg-surface border border-border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Filters</span>
                {hasFilters && (
                  <button onClick={() => setFilters({ rank: '', role: '', looking_for: '' })} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1">
                    <X size={12} /> Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {game.has_ranks && game.ranks.length > 0 && (
                  <select className={selectClass} value={filters.rank} onChange={e => setFilters(p => ({ ...p, rank: e.target.value }))}>
                    <option value="">Any {game.rank_label || 'rank'}</option>
                    {game.ranks.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                )}
                {game.has_roles && game.roles.length > 0 && (
                  <select className={selectClass} value={filters.role} onChange={e => setFilters(p => ({ ...p, role: e.target.value }))}>
                    <option value="">Any {game.role_label || 'role'}</option>
                    {game.roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                )}
                <select className={selectClass} value={filters.looking_for} onChange={e => setFilters(p => ({ ...p, looking_for: e.target.value }))}>
                  <option value="">Looking for...</option>
                  {lookingForOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-surface rounded-xl animate-pulse border border-border" />)}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-16">
          <Users size={48} className="mx-auto mb-4 text-muted opacity-40" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {hasFilters ? 'No players match your filters' : 'Queue is empty'}
          </h3>
          <p className="text-muted text-sm mb-6">
            {hasFilters ? 'Try adjusting your filters' : 'Be the first to join and wait for others!'}
          </p>
          {!myEntry && !hasFilters && (
            <Button onClick={() => setJoinModal(true)}>Join Queue</Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredEntries.map(entry => (
              <QueueEntryCard
                key={entry.id}
                entry={entry}
                onMessage={handleMessage}
                isOwn={entry.user_id === user?.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Join Queue Modal */}
      <Modal open={joinModal} onClose={() => setJoinModal(false)} title={`Join ${game.name} Queue`}>
        <div className="space-y-4">
          {game.has_ranks && game.ranks.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">{game.rank_label || 'Rank'}</label>
              <select className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 text-sm focus:outline-none focus:border-accent"
                value={joinForm.rank} onChange={e => setJoinForm(p => ({ ...p, rank: e.target.value }))}>
                <option value="">Select {(game.rank_label || 'rank').toLowerCase()}...</option>
                {game.ranks.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          )}
          {game.has_roles && game.roles.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">{game.role_label || 'Role'}</label>
              <select className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 text-sm focus:outline-none focus:border-accent"
                value={joinForm.role} onChange={e => setJoinForm(p => ({ ...p, role: e.target.value }))}>
                <option value="">Select {(game.role_label || 'role').toLowerCase()}...</option>
                {game.roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Looking for</label>
            <select className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 text-sm focus:outline-none focus:border-accent"
              value={joinForm.looking_for} onChange={e => setJoinForm(p => ({ ...p, looking_for: e.target.value }))}>
              <option value="">Select...</option>
              {lookingForOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Note <span className="text-muted">(optional)</span></label>
            <input
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              value={joinForm.note} onChange={e => setJoinForm(p => ({ ...p, note: e.target.value }))}
              placeholder={game.note_placeholder || 'Add a note...'}
              maxLength={100}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button loading={joining} onClick={joinQueue} className="flex-1">
              <LogIn size={14} /> Join Queue
            </Button>
            <Button variant="secondary" onClick={() => setJoinModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
