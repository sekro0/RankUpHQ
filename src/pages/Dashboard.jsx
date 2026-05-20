import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Gamepad2, MessageSquare, Users, Trophy, Zap, ArrowRight, Bell } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { GAMES, GAME_BY_ID } from '../utils/constants'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { timeAgo, formatDate } from '../utils/formatters'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const [activeQueues, setActiveQueues] = useState([])
  const [recentConvos, setRecentConvos] = useState([])
  const [upcomingTournaments, setUpcomingTournaments] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [myTeams, setMyTeams] = useState([])
  const [stats, setStats] = useState({ queues: 0, messages: 0, teams: 0, tournaments: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadDashboard()
  }, [user])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [queuesRes, convosRes, tourneysRes, invitesRes, teamsRes] = await Promise.all([
        supabase.from('queue_entries').select('*, game:games(id,name,slug)').eq('user_id', user.id).eq('status', 'waiting'),
        supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id),
        supabase.from('tournament_participants').select('tournament:tournaments(id,name,status,starts_at,game:games(name))').eq('user_id', user.id),
        supabase.from('team_invites').select('*, team:teams(id,name,tag), inviter:profiles!inviter_id(username,avatar_url)').eq('invitee_id', user.id).eq('status', 'pending'),
        supabase.from('team_members').select('*, team:teams(id,name,tag,logo_url,game:games(name))').eq('user_id', user.id),
      ])

      setActiveQueues(queuesRes.data || [])
      setMyTeams(teamsRes.data || [])
      setPendingInvites(invitesRes.data || [])

      const upcoming = (tourneysRes.data || [])
        .map(tp => tp.tournament)
        .filter(t => t && t.status !== 'completed')
        .slice(0, 3)
      setUpcomingTournaments(upcoming)

      const convoIds = (convosRes.data || []).map(c => c.conversation_id).slice(0, 4)
      if (convoIds.length > 0) {
        const convos = []
        for (const cid of convoIds) {
          const { data: other } = await supabase
            .from('conversation_participants')
            .select('profile:profiles!user_id(id,username,avatar_url,display_name)')
            .eq('conversation_id', cid).neq('user_id', user.id).single()
          const { data: lastMsg } = await supabase
            .from('messages').select('content,created_at').eq('conversation_id', cid)
            .order('created_at', { ascending: false }).limit(1).maybeSingle()
          if (other?.profile) convos.push({ id: cid, other: other.profile, lastMessage: lastMsg })
        }
        setRecentConvos(convos)
      }

      setStats({
        queues: (queuesRes.data || []).length,
        messages: (convosRes.data || []).length,
        teams: (teamsRes.data || []).length,
        tournaments: (tourneysRes.data || []).length,
      })
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const leaveQueue = async (entryId) => {
    await supabase.from('queue_entries').delete().eq('id', entryId)
    setActiveQueues(prev => prev.filter(q => q.id !== entryId))
    toast.success('Left queue')
  }

  const acceptInvite = async (invite) => {
    try {
      await supabase.from('team_members').insert({ team_id: invite.team_id, user_id: user.id, role: 'member' })
      await supabase.from('team_invites').update({ status: 'accepted' }).eq('id', invite.id)
      setPendingInvites(prev => prev.filter(i => i.id !== invite.id))
      toast.success(`Joined ${invite.team.name}!`)
      loadDashboard()
    } catch { toast.error('Failed to accept invite') }
  }

  const declineInvite = async (inviteId) => {
    await supabase.from('team_invites').update({ status: 'declined' }).eq('id', inviteId)
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId))
    toast.success('Invite declined')
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8 pb-6 border-b border-border">
        <Link to={`/profile/${profile?.username}`}>
          <Avatar src={profile?.avatar_url} name={profile?.username} size="lg" className="hover:ring-2 hover:ring-accent transition-all" />
        </Link>
        <div>
          <p className="text-xs text-muted uppercase tracking-widest">{greeting}</p>
          <h1 className="text-2xl font-black text-white mt-0.5">{profile?.display_name || profile?.username || 'Player'}</h1>
        </div>

        {/* Stats inline */}
        {!loading && (
          <div className="ml-auto hidden sm:flex items-center divide-x divide-border border border-border rounded bg-card">
            {[
              { icon: Zap, value: stats.queues, label: 'Queues', color: 'text-accent' },
              { icon: MessageSquare, value: stats.messages, label: 'Chats', color: 'text-slate-400' },
              { icon: Users, value: stats.teams, label: 'Teams', color: 'text-emerald-400' },
              { icon: Trophy, value: stats.tournaments, label: 'Events', color: 'text-yellow-400' },
            ].map(({ icon: Icon, value, label, color }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2.5">
                <Icon size={13} className={color} />
                <div>
                  <p className="text-sm font-black text-white leading-none">{value}</p>
                  <p className="text-[10px] text-muted mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-amber-500/30 rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Bell size={13} className="text-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">Team Invites</span>
                <Badge color="warning">{pendingInvites.length}</Badge>
              </div>
              <div className="divide-y divide-border">
                {pendingInvites.map(invite => (
                  <div key={invite.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar src={invite.inviter?.avatar_url} name={invite.inviter?.username} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="text-accent font-medium">{invite.inviter?.username}</span> invited you to{' '}
                        <span className="font-bold">{invite.team?.name}</span> [{invite.team?.tag}]
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => acceptInvite(invite)}>Accept</Button>
                      <Button size="sm" variant="ghost" onClick={() => declineInvite(invite.id)}>Decline</Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Active Queues */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-accent" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">Active Queues</span>
              </div>
              <Link to="/games" className="text-xs text-accent hover:text-accent/80 flex items-center gap-1">Browse <ArrowRight size={11} /></Link>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-surface rounded animate-pulse" />)}</div>
            ) : activeQueues.length === 0 ? (
              <div className="px-4 py-6 text-center text-muted">
                <p className="text-sm mb-2">Not in any queues</p>
                <Link to="/games" className="text-xs text-accent hover:underline">Find a game →</Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activeQueues.map(entry => {
                  const game = entry.game || GAME_BY_ID[entry.game_id]
                  return (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-7 h-7 rounded overflow-hidden shrink-0 bg-surface border border-border/50">
                        {game?.cover_url
                          ? <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover" loading="lazy" />
                          : <span className="w-full h-full flex items-center justify-center text-[10px] font-black"
                              style={{ background: `${game?.color || '#7c3aed'}20`, color: game?.color || '#7c3aed' }}>
                              {game?.name?.charAt(0) || '?'}
                            </span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{game?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted">{[entry.rank, entry.role].filter(Boolean).join(' · ') || 'Waiting...'}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/games/${game?.slug}/queue`)}>View</Button>
                        <Button size="sm" variant="ghost" onClick={() => leaveQueue(entry.id)}>Leave</Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Recent Messages */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={13} className="text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">Recent Messages</span>
              </div>
              <Link to="/messages" className="text-xs text-accent hover:text-accent/80 flex items-center gap-1">All <ArrowRight size={11} /></Link>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-surface rounded animate-pulse" />)}</div>
            ) : recentConvos.length === 0 ? (
              <div className="px-4 py-6 text-center text-muted">
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentConvos.map(convo => (
                  <Link key={convo.id} to={`/messages/${convo.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface/50 transition-colors">
                    <Avatar src={convo.other?.avatar_url} name={convo.other?.username} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{convo.other?.display_name || convo.other?.username}</p>
                      {convo.lastMessage && <p className="text-xs text-muted truncate">{convo.lastMessage.content}</p>}
                    </div>
                    {convo.lastMessage && <span className="text-xs text-muted shrink-0">{timeAgo(convo.lastMessage.created_at)}</span>}
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Quick Join */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Gamepad2 size={13} className="text-accent" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted">Quick Join</span>
            </div>
            <div className="divide-y divide-border">
              {GAMES.slice(0, 5).map(game => (
                <Link key={game.id} to={`/games/${game.slug}/queue`}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface transition-colors group">
                  <div className="w-7 h-7 rounded overflow-hidden shrink-0 bg-surface border border-border/50">
                    {game.cover_url
                      ? <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover" loading="lazy" />
                      : <span className="w-full h-full flex items-center justify-center text-[10px] font-black"
                          style={{ background: `${game.color}20`, color: game.color }}>{game.name.charAt(0)}</span>
                    }
                  </div>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors flex-1 truncate">{game.name}</span>
                  <ArrowRight size={13} className="text-muted group-hover:text-accent transition-colors shrink-0" />
                </Link>
              ))}
              <Link to="/games" className="flex items-center justify-center gap-1 py-2.5 text-xs text-muted hover:text-accent transition-colors">
                All games <ArrowRight size={11} />
              </Link>
            </div>
          </motion.div>

          {/* My Teams */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={13} className="text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">My Teams</span>
              </div>
              <Link to="/teams" className="text-muted hover:text-accent transition-colors"><ArrowRight size={13} /></Link>
            </div>
            {myTeams.length === 0 ? (
              <div className="px-4 py-5 text-center">
                <p className="text-xs text-muted mb-2">Not on any teams yet</p>
                <Link to="/teams/create" className="text-xs text-accent hover:underline">Create one →</Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {myTeams.slice(0, 3).map(tm => (
                  <Link key={tm.team?.id} to={`/teams/${tm.team?.id}`}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface transition-colors group">
                    <div className="w-7 h-7 rounded overflow-hidden shrink-0 bg-accent/10 border border-accent/20">
                      {tm.team?.logo_url
                        ? <img src={tm.team.logo_url} alt={tm.team.name} className="w-full h-full object-cover" loading="lazy" />
                        : <span className="w-full h-full flex items-center justify-center text-accent font-bold text-[10px]">
                            {tm.team?.name?.charAt(0)}
                          </span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 group-hover:text-white transition-colors truncate">{tm.team?.name}</p>
                      <p className="text-xs text-muted">[{tm.team?.tag}]</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* Upcoming Tournaments */}
          {upcomingTournaments.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy size={13} className="text-yellow-400" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted">Tournaments</span>
                </div>
                <Link to="/tournaments" className="text-muted hover:text-accent transition-colors"><ArrowRight size={13} /></Link>
              </div>
              <div className="divide-y divide-border">
                {upcomingTournaments.map(t => (
                  <Link key={t.id} to={`/tournaments/${t.id}`}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 group-hover:text-white truncate">{t.name}</p>
                      {t.starts_at && <p className="text-xs text-muted">{formatDate(t.starts_at)}</p>}
                    </div>
                    <Badge color={t.status === 'in_progress' ? 'warning' : 'success'} className="shrink-0">
                      {t.status === 'in_progress' ? 'Live' : 'Open'}
                    </Badge>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
