import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import supabase from '../lib/supabase'
import { useGamesStore } from '../store/gamesStore'

export default function Games() {
  const { games, loaded } = useGamesStore()
  const [queueCounts, setQueueCounts] = useState({})

  useEffect(() => {
    if (!loaded || games.length === 0) return
    loadQueueCounts()
  }, [loaded, games])

  const loadQueueCounts = async () => {
    const { data } = await supabase.from('queue_entries').select('game_id').eq('status', 'waiting')
    if (data) {
      const counts = {}
      data.forEach(e => { counts[e.game_id] = (counts[e.game_id] || 0) + 1 })
      setQueueCounts(counts)
    }
  }

  if (!loaded) return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <div key={i} className="h-36 bg-surface rounded-xl animate-pulse border border-border" />)}
      </div>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">Find Players</h1>
        <p className="text-muted">Choose a game to browse the queue and find teammates</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {games.map((game, i) => {
          const color = game.color || '#7c3aed'
          const activeCount = queueCounts[game.id] || 0
          return (
            <motion.div key={game.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Link to={`/games/${game.slug}/queue`}>
                <div className="group bg-card border border-border rounded-xl overflow-hidden hover:border-accent/50 transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
                  <div className="h-24 relative flex items-center justify-center overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${color}25, ${color}08)` }}>
                    {game.cover_url ? (
                      <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover opacity-60" onError={e => { e.target.style.display='none' }} />
                    ) : (
                      <span className="text-4xl font-black select-none" style={{ color, opacity: 0.5 }}>
                        {game.name.split(' ').map(w => w[0]).join('').slice(0, 3)}
                      </span>
                    )}
                    {activeCount > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        {activeCount}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white text-sm group-hover:text-accent transition-colors">{game.name}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-md border"
                        style={{ background: `${color}15`, color, borderColor: `${color}30` }}>
                        {game.genre}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <Users size={12} />
                        <span>{activeCount > 0 ? `${activeCount} in queue` : 'Join queue'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-accent/10 border border-accent/20 rounded-xl flex items-start gap-3">
        <Zap size={20} className="text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-white">Real-time matchmaking</p>
          <p className="text-sm text-muted mt-0.5">Join a game queue to instantly see and connect with other players looking for teammates. Queues update in real-time.</p>
        </div>
      </div>
    </div>
  )
}
