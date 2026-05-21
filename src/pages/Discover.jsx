import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Heart, Star, MessageSquare, RefreshCw, Gamepad2, ThumbsUp, Filter } from 'lucide-react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useGamesStore } from '../store/gamesStore'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'

function PlayerCard({ profile, gameById, onLike, onDislike, isTop, exitDirection }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-22, 22])
  const likeOpacity = useTransform(x, [30, 110], [0, 1])
  const dislikeOpacity = useTransform(x, [-110, -30], [1, 0])
  const greenTint = useTransform(x, [0, 150], [0, 0.12])
  const redTint = useTransform(x, [-150, 0], [0.12, 0])
  const cardScale = useTransform(x, [-200, 0, 200], [0.97, 1, 0.97])

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 100) onLike()
    else if (info.offset.x < -100) onDislike()
  }

  const games = profile.user_games || []

  return (
    <motion.div
      style={isTop ? { x, rotate, scale: cardScale, touchAction: 'none' } : {}}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      onDragEnd={isTop ? handleDragEnd : undefined}
      exit={isTop
        ? { x: exitDirection === 'right' ? 700 : -700, opacity: 0, rotate: exitDirection === 'right' ? 25 : -25, transition: { duration: 0.3, ease: 'easeOut' } }
        : { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
      }
      className={`absolute inset-0 bg-card border border-border rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none ${!isTop ? 'scale-95 -z-10 translate-y-4' : ''}`}
    >
      {/* Drag tint overlays */}
      {isTop && (
        <>
          <motion.div style={{ opacity: greenTint }} className="absolute inset-0 bg-green-500 z-10 pointer-events-none rounded-2xl" />
          <motion.div style={{ opacity: redTint }} className="absolute inset-0 bg-red-500 z-10 pointer-events-none rounded-2xl" />
        </>
      )}

      {/* Like/Dislike overlay indicators */}
      {isTop && (
        <>
          <motion.div style={{ opacity: likeOpacity }} className="absolute top-6 left-6 z-20 px-4 py-2 border-4 border-green-400 rounded-xl rotate-[-15deg] shadow-lg">
            <span className="text-green-400 text-2xl font-black tracking-wide">LIKE</span>
          </motion.div>
          <motion.div style={{ opacity: dislikeOpacity }} className="absolute top-6 right-6 z-20 px-4 py-2 border-4 border-red-400 rounded-xl rotate-[15deg] shadow-lg">
            <span className="text-red-400 text-2xl font-black tracking-wide">NOPE</span>
          </motion.div>
        </>
      )}

      {/* Banner */}
      <div className="h-36 relative overflow-hidden bg-gradient-to-br from-accent/30 via-surface to-accent2/20">
        {profile.banner_url && <img src={profile.banner_url} alt="banner" className="w-full h-full object-cover" draggable={false} />}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/80" />
      </div>

      {/* Avatar */}
      <div className="absolute top-20 left-5">
        <div className="p-0.5 bg-card rounded-full">
          <Avatar src={profile.avatar_url} name={profile.username} size="lg" />
        </div>
      </div>

      {/* Content - scrollable */}
      <div className="px-5 pt-12 pb-5 space-y-4 overflow-y-auto max-h-[calc(100%-144px)]">
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-xl font-black text-white">{profile.display_name || profile.username}</h2>
            {profile.age && <span className="text-muted text-sm">{profile.age}</span>}
            {profile.country && <span className="text-muted text-sm">📍 {profile.country}</span>}
          </div>
          <p className="text-sm text-muted">@{profile.username}</p>
        </div>

        {profile.bio && (
          <p className="text-sm text-slate-300 leading-relaxed">{profile.bio}</p>
        )}

        {games.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Games</p>
            <div className="flex flex-wrap gap-2">
              {games.map(ug => {
                const game = gameById[ug.game_id]
                return (
                  <div key={ug.game_id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ background: `${game?.color || '#7c3aed'}15`, color: game?.color || '#7c3aed', border: `1px solid ${game?.color || '#7c3aed'}30` }}>
                    <span className="font-black">{game?.name?.charAt(0)}</span>
                    <span>{game?.name}</span>
                    {ug.rank && <span className="text-white/50">• {ug.rank}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Social links */}
        {(profile.discord_tag || profile.twitch_handle || profile.twitter_handle) && (
          <div className="flex flex-wrap gap-2">
            {profile.discord_tag && <span className="text-xs text-muted bg-surface px-2 py-1 rounded">💬 {profile.discord_tag}</span>}
            {profile.twitch_handle && <span className="text-xs text-muted bg-surface px-2 py-1 rounded">🎮 {profile.twitch_handle}</span>}
            {profile.twitter_handle && <span className="text-xs text-muted bg-surface px-2 py-1 rounded">𝕏 {profile.twitter_handle}</span>}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function MatchModal({ profile, onClose, onMessage }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.4 }}
        className="bg-card border border-border rounded-2xl p-8 text-center max-w-sm w-full"
      >
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-black text-white mb-1">It's a Match!</h2>
        <p className="text-muted mb-6">You and <span className="text-white font-semibold">{profile.display_name || profile.username}</span> liked each other</p>

        <div className="flex justify-center mb-6">
          <Avatar src={profile.avatar_url} name={profile.username} size="xl" />
        </div>

        <div className="flex gap-3">
          <Button onClick={onMessage} className="flex-1">
            <MessageSquare size={16} /> Send Message
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Keep Swiping
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Discover() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { gameById, games } = useGamesStore()
  const [tab, setTab] = useState(0) // 0=swipe, 1=liked me
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  const [matchedProfile, setMatchedProfile] = useState(null)
  const [exitDirection, setExitDirection] = useState('right')
  const [gameFilter, setGameFilter] = useState('')
  const [pendingGameFilter, setPendingGameFilter] = useState('')
  const [likedMeProfiles, setLikedMeProfiles] = useState([])
  const [likedMeLoading, setLikedMeLoading] = useState(false)

  useEffect(() => { loadProfiles() }, [])
  useEffect(() => { if (tab === 1) loadLikedMe() }, [tab])

  const loadProfiles = async (gf = gameFilter) => {
    setLoading(true)
    try {
      const { data: acted } = await supabase
        .from('player_likes')
        .select('target_user_id')
        .eq('user_id', user.id)

      const actedIds = (acted || []).map(a => a.target_user_id)
      actedIds.push(user.id)

      let query = supabase
        .from('profiles')
        .select(gf
          ? '*, user_games!inner(game_id, rank, role, is_main)'
          : '*, user_games(game_id, rank, role, is_main)')
        .limit(20)

      if (actedIds.length > 0) {
        query = query.not('id', 'in', `(${actedIds.join(',')})`)
      }
      if (gf) {
        query = query.eq('user_games.game_id', gf)
      }

      const { data } = await query
      const shuffled = (data || []).sort(() => Math.random() - 0.5)
      setProfiles(shuffled)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load profiles')
    } finally {
      setLoading(false)
    }
  }

  const applyGameFilter = () => {
    setGameFilter(pendingGameFilter)
    loadProfiles(pendingGameFilter)
  }

  const loadLikedMe = async () => {
    setLikedMeLoading(true)
    try {
      const { data: likes } = await supabase
        .from('player_likes')
        .select('user_id')
        .eq('target_user_id', user.id)
        .eq('liked', true)

      if (!likes?.length) { setLikedMeProfiles([]); return }

      const likerIds = likes.map(l => l.user_id)
      const { data: profs } = await supabase
        .from('profiles')
        .select('*, user_games(game_id, rank, role, is_main)')
        .in('id', likerIds)

      setLikedMeProfiles(profs || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLikedMeLoading(false)
    }
  }

  const act = async (liked, explicitTarget = null) => {
    if (actioning) return
    const target = explicitTarget || profiles[0]
    if (!target) return
    setActioning(true)
    if (!explicitTarget) setExitDirection(liked !== false ? 'right' : 'left')

    if (!explicitTarget) setProfiles(prev => prev.slice(1))
    else setLikedMeProfiles(prev => prev.filter(p => p.id !== target.id))

    try {
      await supabase.from('player_likes').insert({
        user_id: user.id,
        target_user_id: target.id,
        liked: liked !== false,
        super_like: liked === 'super'
      })

      if (liked === true || liked === 'super') {
        // Check if mutual like
        const { data: theyLiked } = await supabase
          .from('player_likes')
          .select('id')
          .eq('user_id', target.id)
          .eq('target_user_id', user.id)
          .eq('liked', true)
          .maybeSingle()

        if (theyLiked) {
          // Auto-create friendship on match
          const { data: existing } = await supabase
            .from('friendships')
            .select('id')
            .or(`and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`)
            .maybeSingle()
          if (!existing) {
            await supabase.from('friendships').insert({
              requester_id: user.id,
              addressee_id: target.id,
              status: 'accepted'
            })
          }
          setMatchedProfile(target)
        }
      }
    } catch (err) {
      toast.error('Failed to record action')
    } finally {
      setActioning(false)
    }
  }

  const handleMessage = async () => {
    if (!matchedProfile) return
    try {
      const { data: myConvos } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id)
      const myConvoIds = (myConvos || []).map(c => c.conversation_id)
      if (myConvoIds.length > 0) {
        const { data: shared } = await supabase.from('conversation_participants')
          .select('conversation_id').eq('user_id', matchedProfile.id).in('conversation_id', myConvoIds).maybeSingle()
        if (shared) { setMatchedProfile(null); navigate(`/messages/${shared.conversation_id}`); return }
      }
      const convoId = crypto.randomUUID()
      const { error } = await supabase.from('conversations').insert({ id: convoId })
      if (error) throw error
      await supabase.from('conversation_participants').insert([
        { conversation_id: convoId, user_id: user.id },
        { conversation_id: convoId, user_id: matchedProfile.id }
      ])
      setMatchedProfile(null)
      navigate(`/messages/${convoId}`)
    } catch {
      navigate('/messages')
    }
  }

  if (loading) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mb-4" />
        <p className="text-muted text-sm">Finding players...</p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-white">Discover</h1>
          <p className="text-sm text-muted">Find your next teammate</p>
        </div>
        <button onClick={() => loadProfiles(gameFilter)} className="p-2 text-muted hover:text-white hover:bg-surface rounded-lg transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-4">
        {[{ label: 'Swipe', icon: Heart }, { label: 'Liked Me', icon: ThumbsUp }].map(({ label, icon: Icon }, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${tab === i ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Game filter (swipe tab only) */}
      {tab === 0 && (
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <select
              value={pendingGameFilter}
              onChange={e => setPendingGameFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-slate-300 focus:outline-none focus:border-accent appearance-none"
            >
              <option value="">All games</option>
              {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <Button size="sm" onClick={applyGameFilter} variant={gameFilter ? 'primary' : 'secondary'}>
            {gameFilter ? 'Applied' : 'Apply'}
          </Button>
          {gameFilter && (
            <button onClick={() => { setPendingGameFilter(''); setGameFilter(''); loadProfiles('') }}
              className="px-3 py-2 text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg transition-colors">
              Clear
            </button>
          )}
        </div>
      )}

      {/* Liked Me tab */}
      {tab === 1 && (
        <div className="space-y-2 pb-4">
          {likedMeLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          ) : likedMeProfiles.length === 0 ? (
            <div className="text-center py-16">
              <ThumbsUp size={48} className="mx-auto mb-4 text-muted opacity-40" />
              <h3 className="text-lg font-semibold text-white mb-2">No likes yet</h3>
              <p className="text-muted text-sm">Keep swiping — someone will like you back!</p>
            </div>
          ) : (
            likedMeProfiles.map(p => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3.5 bg-surface border border-border rounded-xl">
                <Avatar src={p.avatar_url} name={p.username} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{p.display_name || p.username}</p>
                  <p className="text-xs text-muted">@{p.username}</p>
                  {p.user_games?.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {p.user_games.slice(0, 2).map(ug => {
                        const g = gameById[ug.game_id]
                        return g ? <span key={ug.game_id} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${g.color}15`, color: g.color }}>{g.name}</span> : null
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => act(true, p)} className="p-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors">
                    <Heart size={15} />
                  </button>
                  <button onClick={() => act(false, p)} className="p-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">
                    <X size={15} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {tab === 0 && (profiles.length === 0 ? (
        <div className="text-center py-16">
          <Gamepad2 size={48} className="mx-auto mb-4 text-muted opacity-40" />
          <h3 className="text-lg font-semibold text-white mb-2">No more players</h3>
          <p className="text-muted text-sm mb-6">You've seen everyone for now. Check back later!</p>
          <Button onClick={() => loadProfiles(gameFilter)} variant="secondary">
            <RefreshCw size={16} /> Refresh
          </Button>
        </div>
      ) : (
        <>
          <div className="relative h-[clamp(256px,calc(100svh-380px),480px)] mb-6">
            <AnimatePresence>
              {profiles.slice(0, 2).map((p, i) => (
                <PlayerCard
                  key={p.id}
                  profile={p}
                  gameById={gameById}
                  isTop={i === 0}
                  exitDirection={exitDirection}
                  onLike={() => act(true)}
                  onDislike={() => act(false)}
                />
              ))}
            </AnimatePresence>
          </div>
          <div className="flex justify-center items-center gap-5">
            <div className="flex flex-col items-center gap-1.5">
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.88 }}
                onClick={() => act(false)} disabled={actioning}
                className="w-14 h-14 bg-surface border-2 border-red-500/40 hover:border-red-500 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 shadow-lg">
                <X size={22} strokeWidth={2.5} />
              </motion.button>
              <span className="text-[10px] text-muted uppercase tracking-widest">Nope</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }}
                onClick={() => act('super')} disabled={actioning}
                className="w-12 h-12 bg-surface border-2 border-yellow-500/40 hover:border-yellow-400 hover:bg-yellow-500/10 text-yellow-400 hover:text-yellow-300 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 shadow-lg">
                <Star size={18} strokeWidth={2.5} />
              </motion.button>
              <span className="text-[10px] text-muted uppercase tracking-widest">Super</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.88 }}
                onClick={() => act(true)} disabled={actioning}
                className="w-14 h-14 bg-surface border-2 border-green-500/40 hover:border-green-500 hover:bg-green-500/10 text-green-400 hover:text-green-300 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 shadow-lg">
                <Heart size={20} strokeWidth={2.5} />
              </motion.button>
              <span className="text-[10px] text-muted uppercase tracking-widest">Like</span>
            </div>
          </div>
          <p className="text-center text-xs text-muted mt-4">Swipe or tap • {profiles.length} players left</p>
        </>
      ))}

      {/* Match modal */}
      <AnimatePresence>
        {matchedProfile && (
          <MatchModal
            profile={matchedProfile}
            onClose={() => setMatchedProfile(null)}
            onMessage={handleMessage}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
