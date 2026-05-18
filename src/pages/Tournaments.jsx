import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trophy, Users, Calendar, Filter } from 'lucide-react'
import { motion } from 'framer-motion'
import supabase from '../lib/supabase'
import { GAMES, GAME_BY_ID } from '../utils/constants'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatDate } from '../utils/formatters'

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'success' },
  in_progress: { label: 'In Progress', color: 'warning' },
  completed: { label: 'Completed', color: 'default' },
  cancelled: { label: 'Cancelled', color: 'danger' },
}

const FORMAT_LABELS = {
  single_elimination: 'Single Elimination',
  double_elimination: 'Double Elimination',
  round_robin: 'Round Robin',
}

export default function Tournaments() {
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [gameFilter, setGameFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')

  useEffect(() => { loadTournaments() }, [])

  const loadTournaments = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tournaments')
      .select('*, game:games(id,name), organizer:profiles!organizer_id(id,username), participants:tournament_participants(id)')
      .order('created_at', { ascending: false })
    setTournaments(data || [])
    setLoading(false)
  }

  const filtered = tournaments.filter(t => {
    if (gameFilter && t.game_id !== gameFilter) return false
    if (statusFilter && t.status !== statusFilter) return false
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Tournaments</h1>
          <p className="text-muted">Compete and prove you're the best</p>
        </div>
        <Button onClick={() => navigate('/tournaments/create')}>
          <Plus size={16} /> Create Tournament
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={gameFilter} onChange={e => setGameFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-slate-200 focus:outline-none focus:border-accent">
          <option value="">All games</option>
          {GAMES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {['', 'open', 'in_progress', 'completed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === s ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}>
              {s ? STATUS_CONFIG[s]?.label : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-surface rounded-xl animate-pulse border border-border" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Trophy size={48} className="mx-auto mb-4 text-muted opacity-40" />
          <h3 className="text-lg font-semibold text-white mb-2">No tournaments found</h3>
          <p className="text-muted text-sm mb-6">Be the first to organize one!</p>
          <Button onClick={() => navigate('/tournaments/create')}><Plus size={14} /> Create Tournament</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t, i) => {
            const game = t.game || GAME_BY_ID[t.game_id]
            const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.open
            const participantCount = t.participants?.length || 0
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/tournaments/${t.id}`}>
                  <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent/40 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer h-full flex flex-col">
                    <div className="h-20 bg-gradient-to-br from-accent/15 via-surface to-accent2/10 flex items-center justify-between px-4">
                      <Trophy size={32} className="text-accent opacity-50" />
                      <Badge color={statusCfg.color}>{statusCfg.label}</Badge>
                    </div>
                    <div className="p-4 flex-1 flex flex-col gap-2">
                      <h3 className="font-bold text-white text-sm line-clamp-2">{t.name}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {game && <Badge>{game.name}</Badge>}
                        <Badge color="cyan">{FORMAT_LABELS[t.format] || t.format}</Badge>
                        <Badge>{t.participant_type === 'team' ? 'Teams' : 'Solo'}</Badge>
                      </div>
                      <div className="mt-auto space-y-1 pt-2 border-t border-border">
                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <Users size={12} />
                          <span>{participantCount}/{t.max_participants} registered</span>
                        </div>
                        {t.starts_at && (
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            <Calendar size={12} />
                            <span>{formatDate(t.starts_at)}</span>
                          </div>
                        )}
                        {t.prize_info && (
                          <p className="text-xs text-yellow-400 font-medium">🏆 {t.prize_info}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
