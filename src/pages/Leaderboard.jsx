import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Medal, Crown, Gamepad2, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import supabase from '../lib/supabase'
import { useGamesStore } from '../store/gamesStore'
import { RANK_COLORS } from '../utils/constants'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'

function RankBadge({ position }) {
  if (position === 1) return <div className="w-7 h-7 rounded-full bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center"><Crown size={14} className="text-yellow-400" /></div>
  if (position === 2) return <div className="w-7 h-7 rounded-full bg-slate-300/10 border border-slate-300/30 flex items-center justify-center"><Medal size={13} className="text-slate-300" /></div>
  if (position === 3) return <div className="w-7 h-7 rounded-full bg-amber-600/20 border border-amber-600/30 flex items-center justify-center"><Medal size={13} className="text-amber-600" /></div>
  return <span className="w-7 h-7 flex items-center justify-center text-xs font-bold text-muted">#{position}</span>
}

export default function Leaderboard() {
  const { games } = useGamesStore()
  const [selectedGame, setSelectedGame] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showGamePicker, setShowGamePicker] = useState(false)
  const pickerRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowGamePicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (games.length > 0 && !selectedGame) {
      setSelectedGame(games[0])
    }
  }, [games])

  useEffect(() => {
    if (selectedGame) loadLeaderboard()
  }, [selectedGame])

  const loadLeaderboard = async () => {
    setLoading(true)
    // Fetch users who have this game in their user_games, ordered by tournament wins then queue time
    const { data } = await supabase
      .from('user_games')
      .select('*, profile:profiles!user_id(id, username, display_name, avatar_url)')
      .eq('game_id', selectedGame.id)
      .not('profile', 'is', null)
      .limit(50)

    if (data) {
      // Sort by rank index (higher tier = higher on leaderboard)
      const ranksOrder = (selectedGame.ranks || []).map(r => r.value)
      const sorted = [...data].sort((a, b) => {
        const ai = ranksOrder.indexOf(a.rank)
        const bi = ranksOrder.indexOf(b.rank)
        if (ai === -1 && bi === -1) return 0
        if (ai === -1) return 1
        if (bi === -1) return -1
        return bi - ai // higher index = higher rank
      })
      setPlayers(sorted)
    }
    setLoading(false)
  }

  const currentGame = selectedGame

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Trophy size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Leaderboard</h1>
            <p className="text-xs text-muted">Top ranked players by game</p>
          </div>
        </div>

        {/* Game picker */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowGamePicker(!showGamePicker)}
            className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-slate-200 hover:border-accent/50 transition-colors"
          >
            {currentGame?.cover_url
              ? <img src={currentGame.cover_url} alt="" className="w-5 h-5 rounded object-cover" />
              : <Gamepad2 size={15} className="text-muted" />
            }
            <span className="max-w-[100px] truncate">{currentGame?.name || 'Select game'}</span>
            <ChevronDown size={14} className="text-muted" />
          </button>
          {showGamePicker && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20 max-h-64 overflow-y-auto">
              {games.map(g => (
                <button
                  key={g.id}
                  onClick={() => { setSelectedGame(g); setShowGamePicker(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${selectedGame?.id === g.id ? 'text-accent bg-accent/10' : 'text-slate-300 hover:bg-surface'}`}
                >
                  {g.cover_url
                    ? <img src={g.cover_url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                    : <Gamepad2 size={14} className="text-muted shrink-0" />
                  }
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-surface rounded-xl animate-pulse border border-border" />)}
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Trophy size={40} className="mx-auto mb-3 text-muted opacity-30" />
          <p className="text-white font-semibold mb-1">No players yet</p>
          <p className="text-sm text-muted">Be the first to add {currentGame?.name} to your profile!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Top 3 spotlight */}
          {players.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[players[1], players[0], players[2]].map((player, i) => {
                if (!player) return null
                const pos = i === 0 ? 2 : i === 1 ? 1 : 3
                const rankColor = RANK_COLORS[player.rank] || '#7c3aed'
                const heights = { 1: 'pt-0', 2: 'pt-6', 3: 'pt-10' }
                return (
                  <Link
                    key={player.user_id}
                    to={`/profile/${player.profile?.username}`}
                    className={`${heights[pos]} flex flex-col items-center`}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`w-full p-3 bg-card border rounded-xl flex flex-col items-center gap-2 hover:border-accent/50 transition-colors ${
                        pos === 1 ? 'border-yellow-400/30' : pos === 2 ? 'border-slate-300/20' : 'border-amber-600/20'
                      }`}
                    >
                      <RankBadge position={pos} />
                      <Avatar src={player.profile?.avatar_url} name={player.profile?.username} size="md" />
                      <div className="text-center">
                        <p className="text-xs font-semibold text-white truncate max-w-[70px]">{player.profile?.username}</p>
                        {player.rank && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block"
                            style={{ background: `${rankColor}25`, color: rankColor }}>
                            {player.rank}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Rest of list */}
          {players.slice(players.length >= 3 ? 3 : 0).map((player, index) => {
            const pos = (players.length >= 3 ? 3 : 0) + index + 1
            const rankColor = RANK_COLORS[player.rank] || '#7c3aed'
            return (
              <motion.div
                key={player.user_id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link
                  to={`/profile/${player.profile?.username}`}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-accent/30 transition-colors"
                >
                  <RankBadge position={pos} />
                  <Avatar src={player.profile?.avatar_url} name={player.profile?.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{player.profile?.display_name || player.profile?.username}</p>
                    <p className="text-xs text-muted">@{player.profile?.username}</p>
                  </div>
                  {player.rank && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: `${rankColor}20`, color: rankColor }}>
                      {player.rank}
                    </span>
                  )}
                  {player.role && <Badge>{player.role}</Badge>}
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
