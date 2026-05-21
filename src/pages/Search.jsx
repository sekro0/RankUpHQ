import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, Users, Trophy, User, Gamepad2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import supabase from '../lib/supabase'
import { useGamesStore } from '../store/gamesStore'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'players', label: 'Players', icon: User },
  { key: 'teams', label: 'Teams', icon: Users },
  { key: 'tournaments', label: 'Tournaments', icon: Trophy },
]

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [q, setQ] = useState(initialQ)
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({ players: [], teams: [], tournaments: [] })
  const { gameById } = useGamesStore()
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (q.trim().length < 2) {
      setResults({ players: [], teams: [], tournaments: [] })
      return
    }
    debounceRef.current = setTimeout(() => {
      doSearch(q.trim())
      setSearchParams({ q: q.trim() }, { replace: true })
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [q])

  const doSearch = async (query) => {
    setLoading(true)
    const like = `%${query}%`
    const [playersRes, teamsRes, tournamentsRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .or(`username.ilike.${like},display_name.ilike.${like}`)
        .limit(10),
      supabase.from('teams')
        .select('id, name, tag, logo_url, game_id, is_recruiting, max_members')
        .or(`name.ilike.${like},tag.ilike.${like}`)
        .limit(8),
      supabase.from('tournaments')
        .select('id, name, format, status, max_participants, image_url, game_id')
        .ilike('name', like)
        .limit(8),
    ])
    setResults({
      players: playersRes.data || [],
      teams: teamsRes.data || [],
      tournaments: tournamentsRes.data || [],
    })
    setLoading(false)
  }

  const hasResults = results.players.length + results.teams.length + results.tournaments.length > 0
  const isEmpty = q.trim().length >= 2 && !loading && !hasResults

  const showPlayers = tab === 'all' || tab === 'players'
  const showTeams = tab === 'all' || tab === 'teams'
  const showTournaments = tab === 'all' || tab === 'tournaments'

  const STATUS_COLORS = { open: 'success', live: 'accent', completed: 'default', cancelled: 'danger' }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Search input */}
      <div className="relative mb-6">
        <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search players, teams, tournaments..."
          className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
        {loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <Spinner size="sm" />
          </div>
        )}
      </div>

      {/* Tabs */}
      {q.trim().length >= 2 && (
        <div className="flex gap-1 mb-5 bg-surface rounded-lg p-1 border border-border">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === t.key ? 'bg-card text-white shadow' : 'text-muted hover:text-slate-300'
              }`}
            >
              {t.icon && <t.icon size={12} />}
              {t.label}
              {t.key !== 'all' && results[t.key]?.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-accent/20 text-accent' : 'bg-surface text-muted'}`}>
                  {results[t.key].length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty states */}
      {q.trim().length < 2 && (
        <div className="text-center py-16">
          <SearchIcon size={40} className="mx-auto mb-3 text-muted opacity-30" />
          <p className="text-white font-semibold mb-1">Search anything</p>
          <p className="text-sm text-muted">Find players, teams, or tournaments</p>
        </div>
      )}

      {isEmpty && (
        <div className="text-center py-12">
          <p className="text-white font-semibold mb-1">No results for "{q}"</p>
          <p className="text-sm text-muted">Try a different search term</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Players */}
        {showPlayers && results.players.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <User size={12} /> Players ({results.players.length})
            </p>
            <div className="space-y-1">
              {results.players.map((player, i) => (
                <motion.div key={player.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link
                    to={`/profile/${player.username}`}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-accent/30 transition-colors"
                  >
                    <Avatar src={player.avatar_url} name={player.username} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{player.display_name || player.username}</p>
                      <p className="text-xs text-muted">@{player.username}</p>
                      {player.bio && <p className="text-xs text-slate-400 mt-0.5 truncate">{player.bio}</p>}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Teams */}
        {showTeams && results.teams.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Users size={12} /> Teams ({results.teams.length})
            </p>
            <div className="space-y-1">
              {results.teams.map((team, i) => {
                const game = gameById[team.game_id]
                return (
                  <motion.div key={team.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link
                      to={`/teams/${team.id}`}
                      className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-accent/30 transition-colors"
                    >
                      {team.logo_url
                        ? <img src={team.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-border shrink-0" />
                        : <div className="w-10 h-10 rounded-xl bg-accent/20 border border-border flex items-center justify-center text-accent font-bold text-base shrink-0">{team.name.charAt(0)}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{team.name} <span className="text-muted font-normal">[{team.tag}]</span></p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {game && <Badge color="cyan">{game.name}</Badge>}
                          {team.is_recruiting && <Badge color="success">Recruiting</Badge>}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tournaments */}
        {showTournaments && results.tournaments.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Trophy size={12} /> Tournaments ({results.tournaments.length})
            </p>
            <div className="space-y-1">
              {results.tournaments.map((t, i) => {
                const game = gameById[t.game_id]
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link
                      to={`/tournaments/${t.id}`}
                      className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-accent/30 transition-colors"
                    >
                      {t.image_url
                        ? <img src={t.image_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-border shrink-0" />
                        : <div className="w-10 h-10 rounded-xl bg-accent/10 border border-border flex items-center justify-center shrink-0"><Trophy size={18} className="text-accent opacity-60" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {game && <Badge color="cyan">{game.name}</Badge>}
                          <Badge color={STATUS_COLORS[t.status] || 'default'}>{t.status}</Badge>
                          <span className="text-xs text-muted">{t.max_participants} slots</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
