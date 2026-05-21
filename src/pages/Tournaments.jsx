import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trophy, Users, Calendar, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import supabase from '../lib/supabase'
import { GAMES, GAME_BY_ID } from '../utils/constants'
import { useT } from '../store/langStore'
import { useAuthStore } from '../store/authStore'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatDate } from '../utils/formatters'

const STATUS_CONFIG = {
  open: { key: 'open', color: 'success' },
  in_progress: { key: 'in_progress', color: 'warning' },
  completed: { key: 'completed', color: 'default' },
  cancelled: { key: 'cancelled', color: 'danger' },
}

const FORMAT_LABELS = {
  single_elimination: 'single_elim',
  double_elimination: 'double_elim',
  round_robin: 'round_robin',
}

export default function Tournaments() {
  const navigate = useNavigate()
  const { t } = useT()
  const { user } = useAuthStore()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [gameFilter, setGameFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [myOnly, setMyOnly] = useState(false)
  const [myTournamentIds, setMyTournamentIds] = useState(null)

  useEffect(() => { loadTournaments() }, [])
  useEffect(() => {
    if (!myOnly || myTournamentIds !== null) return
    supabase.from('tournament_participants').select('tournament_id').eq('user_id', user.id)
      .then(({ data }) => setMyTournamentIds((data || []).map(d => d.tournament_id)))
  }, [myOnly])

  const loadTournaments = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tournaments')
      .select('*, game:games(id,name), organizer:profiles!organizer_id(id,username), participants:tournament_participants(id)')
      .order('created_at', { ascending: false })
    setTournaments(data || [])
    setLoading(false)
  }

  const filtered = tournaments.filter(tournament => {
    if (gameFilter && tournament.game_id !== gameFilter) return false
    if (statusFilter && tournament.status !== statusFilter) return false
    if (myOnly && myTournamentIds !== null && !myTournamentIds.includes(tournament.id)) return false
    return true
  })

  const statusLabel = (status) => {
    const cfg = STATUS_CONFIG[status]
    if (!cfg) return status
    if (status === 'open') return t('open')
    if (status === 'in_progress') return t('live')
    if (status === 'completed') return t('completed') || 'Completed'
    if (status === 'cancelled') return t('cancelled') || 'Cancelled'
    return status
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">{t('tournaments')}</h1>
          <p className="text-muted">{t('compete_best')}</p>
        </div>
        <Button onClick={() => navigate('/tournaments/create')}>
          <Plus size={16} /> {t('create_tournament')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={gameFilter} onChange={e => setGameFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-slate-200 focus:outline-none focus:border-accent">
          <option value="">{t('all_games')}</option>
          {GAMES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {['', 'open', 'in_progress', 'completed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === s ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}>
              {s ? statusLabel(s) : t('all')}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMyOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${myOnly ? 'bg-accent/10 border-accent/40 text-accent' : 'border-border text-muted hover:text-white hover:border-border/80'}`}>
          <Star size={12} /> My Tournaments
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-surface rounded-xl animate-pulse border border-border" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Trophy size={48} className="mx-auto mb-4 text-muted opacity-40" />
          <h3 className="text-lg font-semibold text-white mb-2">{t('no_tournaments')}</h3>
          <p className="text-muted text-sm mb-6">{t('be_first_organize')}</p>
          <Button onClick={() => navigate('/tournaments/create')}><Plus size={14} /> {t('create_tournament')}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tournament, i) => {
            const game = tournament.game || GAME_BY_ID[tournament.game_id]
            const statusCfg = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.open
            const participantCount = tournament.participants?.length || 0
            return (
              <motion.div key={tournament.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/tournaments/${tournament.id}`}>
                  <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent/40 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer h-full flex flex-col">
                    {/* Banner or gradient */}
                    <div className="h-28 relative overflow-hidden">
                      {tournament.banner_url
                        ? <img src={tournament.banner_url} alt="banner" className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full bg-gradient-to-br from-accent/15 via-surface to-accent2/10" />
                      }
                      <div className="absolute inset-0 flex items-center justify-between px-4">
                        {tournament.image_url
                          ? <img src={tournament.image_url} alt={tournament.name} className="w-10 h-10 rounded-lg object-cover border-2 border-card/50 shadow" loading="lazy" />
                          : <Trophy size={32} className="text-accent opacity-50" />
                        }
                        <Badge color={statusCfg.color}>{statusLabel(tournament.status)}</Badge>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col gap-2">
                      <h3 className="font-bold text-white text-sm line-clamp-2">{tournament.name}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {game && <Badge>{game.name}</Badge>}
                        <Badge color="cyan">{t(FORMAT_LABELS[tournament.format]) || tournament.format}</Badge>
                        <Badge>{tournament.participant_type === 'team' ? t('team_type') : t('solo_type')}</Badge>
                      </div>
                      <div className="mt-auto space-y-1 pt-2 border-t border-border">
                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <Users size={12} />
                          <span>{participantCount}/{tournament.max_participants} {t('registered_short')}</span>
                        </div>
                        {tournament.starts_at && (
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            <Calendar size={12} />
                            <span>{formatDate(tournament.starts_at)}</span>
                          </div>
                        )}
                        {tournament.prize_info && (
                          <p className="text-xs text-yellow-400 font-medium">🏆 {tournament.prize_info}</p>
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
