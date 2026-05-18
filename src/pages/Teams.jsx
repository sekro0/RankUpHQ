import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Users, Search, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import supabase from '../lib/supabase'
import { GAMES, GAME_BY_ID } from '../utils/constants'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

export default function Teams() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [gameFilter, setGameFilter] = useState('')
  const [recruitingOnly, setRecruitingOnly] = useState(false)

  useEffect(() => { loadTeams() }, [])

  const loadTeams = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('teams')
      .select('*, owner:profiles!owner_id(id,username,avatar_url), game:games(id,name,slug), members:team_members(user_id)')
      .order('created_at', { ascending: false })
    setTeams(data || [])
    setLoading(false)
  }

  const filtered = teams.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.tag.toLowerCase().includes(search.toLowerCase())) return false
    if (gameFilter && t.game_id !== gameFilter) return false
    if (recruitingOnly && !t.is_recruiting) return false
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Teams</h1>
          <p className="text-muted">Find a team or create your own</p>
        </div>
        <Button onClick={() => navigate('/teams/create')}>
          <Plus size={16} /> Create Team
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teams..."
            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent" />
        </div>
        <select value={gameFilter} onChange={e => setGameFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-slate-200 focus:outline-none focus:border-accent">
          <option value="">All games</option>
          {GAMES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <label className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg cursor-pointer text-sm text-slate-300 hover:border-accent/50 transition-colors">
          <input type="checkbox" checked={recruitingOnly} onChange={e => setRecruitingOnly(e.target.checked)} className="accent-accent" />
          Recruiting only
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-surface rounded-xl animate-pulse border border-border" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Shield size={48} className="mx-auto mb-4 text-muted opacity-40" />
          <h3 className="text-lg font-semibold text-white mb-2">{search || gameFilter ? 'No teams found' : 'No teams yet'}</h3>
          <p className="text-muted text-sm mb-6">Be the first to create a team!</p>
          <Button onClick={() => navigate('/teams/create')}><Plus size={14} /> Create Team</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((team, i) => {
            const game = team.game || GAME_BY_ID[team.game_id]
            const memberCount = team.members?.length || 0
            return (
              <motion.div key={team.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/teams/${team.id}`}>
                  <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent/40 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                    <div className="h-16 bg-gradient-to-br from-accent/20 via-surface to-accent2/10 relative flex items-center justify-end pr-4">
                      {team.logo_url
                        ? <img src={team.logo_url} alt="logo" className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl object-cover border-2 border-border" />
                        : <div className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-black text-lg">{team.name.charAt(0)}</div>
                      }
                      {team.is_recruiting && <Badge color="success">Recruiting</Badge>}
                    </div>
                    <div className="p-4 pt-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-white">{team.name}</h3>
                          <p className="text-xs text-muted">[{team.tag}]{game ? ` · ${game.name}` : ''}</p>
                        </div>
                      </div>
                      {team.description && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{team.description}</p>}
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-muted">
                        <Users size={12} />
                        <span>{memberCount}/{team.max_members} members</span>
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
