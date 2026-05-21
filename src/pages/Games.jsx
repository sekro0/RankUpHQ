import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Zap, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import supabase from '../lib/supabase'
import { useGamesStore } from '../store/gamesStore'

export default function Games() {
  const { games, loaded } = useGamesStore()
  const [queueCounts, setQueueCounts] = useState({})
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('')

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

  const genres = [...new Set(games.map(g => g.genre).filter(Boolean))]
  const filtered = games.filter(g => {
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false
    if (genreFilter && g.genre !== genreFilter) return false
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white mb-2">Find Players</h1>
        <p className="text-muted">Choose a game to browse the queue and find teammates</p>
      </div>

      {/* Search + genre filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search games..."
            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-slate-200 placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setGenreFilter('')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${!genreFilter ? 'bg-accent text-white border-accent' : 'text-muted border-border hover:text-white hover:border-border/80'}`}>
            All
          </button>
          {genres.map(g => (
            <button key={g} onClick={() => setGenreFilter(genreFilter === g ? '' : g)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${genreFilter === g ? 'bg-accent text-white border-accent' : 'text-muted border-border hover:text-white hover:border-border/80'}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Search size={40} className="mx-auto mb-3 text-muted opacity-40" />
          <p className="text-white font-semibold mb-1">No games found</p>
          <p className="text-sm text-muted">Try a different search or genre</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((game, i) => {
            const color = game.color || '#7c3aed'
            const activeCount = queueCounts[game.id] || 0
            return (
              <motion.div key={game.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Link to={`/games/${game.slug}/queue`}>
                  <div className="group bg-card border border-border rounded-xl overflow-hidden hover:border-accent/50 transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
                    <div className="h-24 relative flex items-center justify-center overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${color}25, ${color}08)` }}>
                      {game.cover_url ? (
                        <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover opacity-80" onError={e => { e.target.style.display='none' }} />
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
      )}

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
