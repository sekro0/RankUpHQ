import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Users, Search, Shield, Compass, Crown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { GAMES, GAME_BY_ID } from '../utils/constants'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

function TeamCard({ team, i, showRole }) {
  const game = team.game || GAME_BY_ID[team.game_id]
  const memberCount = team.members?.length || 0
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
      <Link to={`/teams/${team.id}`}>
        <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent/40 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
          <div className="h-16 bg-gradient-to-br from-accent/20 via-surface to-accent2/10 relative flex items-center justify-end pr-4">
            {team.logo_url
              ? <img src={team.logo_url} alt="logo" className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl object-cover border-2 border-border" />
              : <div className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-black text-lg">{team.name.charAt(0)}</div>
            }
            <div className="flex items-center gap-2">
              {showRole && team.myRole && (
                <Badge color={team.myRole === 'owner' ? 'warning' : team.myRole === 'co-leader' ? 'accent' : 'default'}>
                  {team.myRole === 'owner' && <Crown size={9} className="mr-1 inline" />}
                  {team.myRole}
                </Badge>
              )}
              {team.is_recruiting && <Badge color="success">Recruiting</Badge>}
            </div>
          </div>
          <div className="p-4 pt-3">
            <h3 className="font-bold text-white">{team.name}</h3>
            <p className="text-xs text-muted">[{team.tag}]{game ? ` · ${game.name}` : ''}</p>
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
}

export default function Teams() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [tab, setTab] = useState('mine')

  const [myTeams, setMyTeams] = useState([])
  const [myLoading, setMyLoading] = useState(true)

  const [allTeams, setAllTeams] = useState([])
  const [exploreLoading, setExploreLoading] = useState(false)
  const [exploreLoaded, setExploreLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [gameFilter, setGameFilter] = useState('')
  const [recruitingOnly, setRecruitingOnly] = useState(false)

  useEffect(() => { loadMyTeams() }, [user])

  useEffect(() => {
    if (tab === 'explore' && !exploreLoaded) loadAllTeams()
  }, [tab])

  const loadMyTeams = async () => {
    if (!user) { setMyLoading(false); return }
    setMyLoading(true)
    const { data } = await supabase
      .from('team_members')
      .select('role, team:teams(*, game:games(id,name,slug), members:team_members(user_id))')
      .eq('user_id', user.id)
    const teams = (data || []).map(row => ({ ...row.team, myRole: row.role }))
    setMyTeams(teams)
    setMyLoading(false)
  }

  const loadAllTeams = async () => {
    setExploreLoading(true)
    const { data } = await supabase
      .from('teams')
      .select('*, game:games(id,name,slug), members:team_members(user_id)')
      .order('created_at', { ascending: false })
    setAllTeams(data || [])
    setExploreLoaded(true)
    setExploreLoading(false)
  }

  const myTeamIds = new Set(myTeams.map(t => t.id))

  const filteredExplore = allTeams.filter(t => {
    if (myTeamIds.has(t.id)) return false
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
          <p className="text-muted text-sm">Manage your teams or find new ones</p>
        </div>
        <Button onClick={() => navigate('/teams/create')}>
          <Plus size={16} /> Create Team
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 bg-surface border border-border rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('mine')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded transition-all ${tab === 'mine' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
        >
          <Shield size={14} />
          My Teams
          {myTeams.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === 'mine' ? 'bg-white/20' : 'bg-card border border-border text-slate-300'}`}>
              {myTeams.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('explore')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded transition-all ${tab === 'explore' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
        >
          <Compass size={14} />
          Explore
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'mine' && (
          <motion.div key="mine" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
            {myLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-40 bg-surface rounded-xl animate-pulse border border-border" />)}
              </div>
            ) : myTeams.length === 0 ? (
              <div className="text-center py-20 border border-border rounded-xl bg-card">
                <Shield size={44} className="mx-auto mb-4 text-muted opacity-30" />
                <h3 className="text-lg font-semibold text-white mb-2">You're not in any team yet</h3>
                <p className="text-muted text-sm mb-6">Create your own or explore and request to join one.</p>
                <div className="flex items-center justify-center gap-3">
                  <Button onClick={() => navigate('/teams/create')}><Plus size={14} /> Create Team</Button>
                  <Button variant="secondary" onClick={() => setTab('explore')}><Compass size={14} /> Explore Teams</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myTeams.map((team, i) => <TeamCard key={team.id} team={team} i={i} showRole />)}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'explore' && (
          <motion.div key="explore" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
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

            {exploreLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 bg-surface rounded-xl animate-pulse border border-border" />)}
              </div>
            ) : filteredExplore.length === 0 ? (
              <div className="text-center py-20 border border-border rounded-xl bg-card">
                <Compass size={44} className="mx-auto mb-4 text-muted opacity-30" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {search || gameFilter || recruitingOnly ? 'No teams match your filters' : 'No other teams yet'}
                </h3>
                <p className="text-muted text-sm mb-6">Be the first to create a team!</p>
                <Button onClick={() => navigate('/teams/create')}><Plus size={14} /> Create Team</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExplore.map((team, i) => <TeamCard key={team.id} team={team} i={i} showRole={false} />)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
