import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Heart, MessageSquare, RefreshCw, Gamepad2 } from 'lucide-react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useGamesStore } from '../store/gamesStore'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'

function PlayerCard({ profile, gameById, onLike, onDislike, isTop }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-20, 20])
  const likeOpacity = useTransform(x, [20, 100], [0, 1])
  const dislikeOpacity = useTransform(x, [-100, -20], [1, 0])

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 100) onLike()
    else if (info.offset.x < -100) onDislike()
  }

  const games = profile.user_games || []

  return (
    <motion.div
      style={isTop ? { x, rotate, touchAction: 'none' } : {}}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={isTop ? handleDragEnd : undefined}
      className={`absolute inset-0 bg-card border border-border rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none ${!isTop ? 'scale-95 -z-10 translate-y-4' : ''}`}
    >
      {/* Like/Dislike overlay indicators */}
      {isTop && (
        <>
          <motion.div style={{ opacity: likeOpacity }} className="absolute top-6 left-6 z-20 px-4 py-2 border-4 border-green-400 rounded-xl rotate-[-15deg]">
            <span className="text-green-400 text-2xl font-black">LIKE</span>
          </motion.div>
          <motion.div style={{ opacity: dislikeOpacity }} className="absolute top-6 right-6 z-20 px-4 py-2 border-4 border-red-400 rounded-xl rotate-[15deg]">
            <span className="text-red-400 text-2xl font-black">NOPE</span>
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
  const { gameById } = useGamesStore()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  const [matchedProfile, setMatchedProfile] = useState(null)

  useEffect(() => { loadProfiles() }, [])

  const loadProfiles = async () => {
    setLoading(true)
    try {
      // Get IDs the user has already acted on
      const { data: acted } = await supabase
        .from('player_likes')
        .select('target_user_id')
        .eq('user_id', user.id)

      const actedIds = (acted || []).map(a => a.target_user_id)
      actedIds.push(user.id) // exclude self

      // Get profiles with their games
      let query = supabase
        .from('profiles')
        .select('*, user_games(game_id, rank, role, is_main)')
        .limit(20)

      if (actedIds.length > 0) {
        query = query.not('id', 'in', `(${actedIds.join(',')})`)
      }

      // Need at least some profile data
      const { data } = await query

      // Shuffle for random order
      const shuffled = (data || []).sort(() => Math.random() - 0.5)
      setProfiles(shuffled)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load profiles')
    } finally {
      setLoading(false)
    }
  }

  const act = async (liked) => {
    if (actioning || profiles.length === 0) return
    const target = profiles[0]
    setActioning(true)

    // Optimistically remove card
    setProfiles(prev => prev.slice(1))

    try {
      await supabase.from('player_likes').insert({
        user_id: user.id,
        target_user_id: target.id,
        liked
      })

      if (liked) {
        // Check if mutual like
        const { data: theyLiked } = await supabase
          .from('player_likes')
          .select('id')
          .eq('user_id', target.id)
          .eq('target_user_id', user.id)
          .eq('liked', true)
          .maybeSingle()

        if (theyLiked) {
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Discover</h1>
          <p className="text-sm text-muted">Find your next teammate</p>
        </div>
        <button onClick={loadProfiles} className="p-2 text-muted hover:text-white hover:bg-surface rounded-lg transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-16">
          <Gamepad2 size={48} className="mx-auto mb-4 text-muted opacity-40" />
          <h3 className="text-lg font-semibold text-white mb-2">No more players</h3>
          <p className="text-muted text-sm mb-6">You've seen everyone for now. Check back later!</p>
          <Button onClick={loadProfiles} variant="secondary">
            <RefreshCw size={16} /> Refresh
          </Button>
        </div>
      ) : (
        <>
          {/* Card stack */}
          <div className="relative h-[480px] mb-6">
            <AnimatePresence>
              {profiles.slice(0, 2).map((p, i) => (
                <PlayerCard
                  key={p.id}
                  profile={p}
                  gameById={gameById}
                  isTop={i === 0}
                  onLike={() => act(true)}
                  onDislike={() => act(false)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center items-center gap-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => act(false)}
              disabled={actioning}
              className="w-16 h-16 bg-surface border-2 border-red-500/40 hover:border-red-500 text-red-400 hover:text-red-300 rounded-full flex items-center justify-center transition-all disabled:opacity-40 shadow-lg"
            >
              <X size={28} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => act(true)}
              disabled={actioning}
              className="w-16 h-16 bg-surface border-2 border-green-500/40 hover:border-green-500 text-green-400 hover:text-green-300 rounded-full flex items-center justify-center transition-all disabled:opacity-40 shadow-lg"
            >
              <Heart size={28} />
            </motion.button>
          </div>

          <p className="text-center text-xs text-muted mt-4">Swipe or use buttons • {profiles.length} players left</p>
        </>
      )}

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
