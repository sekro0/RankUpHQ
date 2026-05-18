import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Trophy, Users, Calendar, CheckCircle, Play, Award, XCircle, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { GAME_BY_ID } from '../utils/constants'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
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

function BracketView({ matches, participants }) {
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)

  const getParticipantName = (id) => {
    const p = participants.find(pt => pt.id === id)
    return p?.team?.name || p?.profile?.username || 'TBD'
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6 min-w-max py-4">
        {rounds.map(round => (
          <div key={round} className="flex flex-col gap-4 w-52">
            <div className="text-center">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                {round === Math.max(...rounds) ? 'Final' : round === Math.max(...rounds) - 1 ? 'Semi-Final' : `Round ${round}`}
              </span>
            </div>
            <div className="flex flex-col justify-around flex-1 gap-4">
              {matches.filter(m => m.round === round).map(match => (
                <div key={match.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                  <div className={`flex items-center gap-2 px-3 py-2.5 border-b border-border ${match.winner_id === match.participant_a_id ? 'bg-emerald-500/10' : ''}`}>
                    <div className="flex-1 text-sm font-medium text-white truncate">
                      {match.participant_a_id ? getParticipantName(match.participant_a_id) : 'TBD'}
                    </div>
                    {match.score_a !== null && <span className="text-sm font-bold text-white">{match.score_a}</span>}
                    {match.winner_id === match.participant_a_id && <CheckCircle size={14} className="text-emerald-400 shrink-0" />}
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2.5 ${match.winner_id === match.participant_b_id ? 'bg-emerald-500/10' : ''}`}>
                    <div className="flex-1 text-sm font-medium text-white truncate">
                      {match.participant_b_id ? getParticipantName(match.participant_b_id) : 'TBD / BYE'}
                    </div>
                    {match.score_b !== null && <span className="text-sm font-bold text-white">{match.score_b}</span>}
                    {match.winner_id === match.participant_b_id && <CheckCircle size={14} className="text-emerald-400 shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TournamentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [registering, setRegistering] = useState(false)
  const [unregistering, setUnregistering] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [starting, setStarting] = useState(false)
  const [reportModal, setReportModal] = useState(null)
  const [reportScores, setReportScores] = useState({ a: '', b: '' })
  const [myTeams, setMyTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState('')

  useEffect(() => {
    loadTournament()
    if (user) loadMyTeams()
  }, [id])

  const loadTournament = async () => {
    setLoading(true)
    const { data: t } = await supabase
      .from('tournaments')
      .select('*, game:games(id,name), organizer:profiles!organizer_id(id,username,avatar_url)')
      .eq('id', id).single()
    if (!t) { navigate('/tournaments'); return }
    setTournament(t)

    const { data: p } = await supabase
      .from('tournament_participants')
      .select('*, team:teams(id,name,tag,logo_url), profile:profiles!user_id(id,username,avatar_url)')
      .eq('tournament_id', id)
    setParticipants(p || [])

    const { data: m } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', id)
      .order('round').order('match_number')
    setMatches(m || [])
    setLoading(false)
  }

  const loadMyTeams = async () => {
    const { data } = await supabase
      .from('team_members')
      .select('team:teams(id,name)')
      .eq('user_id', user.id)
      .in('role', ['owner', 'captain'])
    setMyTeams(data?.map(m => m.team).filter(Boolean) || [])
  }

  const register = async () => {
    if (!user) { navigate('/login'); return }
    setRegistering(true)
    try {
      const payload = { tournament_id: id }
      if (tournament.participant_type === 'team') {
        if (!selectedTeam) { toast.error('Select a team'); return }
        payload.team_id = selectedTeam
        payload.user_id = user.id
      } else {
        payload.user_id = user.id
      }
      await supabase.from('tournament_participants').insert(payload)
      toast.success('Registered!')
      loadTournament()
    } catch (err) {
      if (err.code === '23505') toast.error('Already registered')
      else toast.error('Failed to register')
    } finally { setRegistering(false) }
  }

  const unregister = async () => {
    const myParticipant = participants.find(p => p.user_id === user?.id)
    if (!myParticipant) return
    setUnregistering(true)
    try {
      await supabase.from('tournament_participants').delete().eq('id', myParticipant.id)
      toast.success('Unregistered from tournament')
      loadTournament()
    } catch { toast.error('Failed to unregister') }
    finally { setUnregistering(false) }
  }

  const cancelTournament = async () => {
    if (!confirm('Cancel this tournament? This cannot be undone.')) return
    setCancelling(true)
    try {
      await supabase.from('tournaments').update({ status: 'cancelled' }).eq('id', id)
      toast.success('Tournament cancelled')
      loadTournament()
    } catch { toast.error('Failed to cancel tournament') }
    finally { setCancelling(false) }
  }

  const startTournament = async () => {
    if (!confirm('Start the tournament and generate bracket?')) return
    setStarting(true)
    try {
      const shuffled = [...participants].sort(() => Math.random() - 0.5)
      const newMatches = []
      for (let i = 0; i < shuffled.length; i += 2) {
        newMatches.push({
          tournament_id: id, round: 1,
          match_number: Math.floor(i / 2) + 1,
          participant_a_id: shuffled[i].id,
          participant_b_id: shuffled[i + 1]?.id ?? null,
          status: shuffled[i + 1] ? 'pending' : 'completed',
          winner_id: shuffled[i + 1] ? null : shuffled[i].id,
        })
      }
      await supabase.from('tournament_matches').insert(newMatches)
      await supabase.from('tournaments').update({ status: 'in_progress' }).eq('id', id)
      toast.success('Tournament started! Bracket generated.')
      setActiveTab('bracket')
      loadTournament()
    } catch (err) { toast.error(err.message) }
    finally { setStarting(false) }
  }

  const reportResult = async () => {
    if (!reportModal) return
    const scoreA = parseInt(reportScores.a)
    const scoreB = parseInt(reportScores.b)
    if (isNaN(scoreA) || isNaN(scoreB)) return toast.error('Enter valid scores')
    if (scoreA === scoreB) return toast.error('No ties allowed')
    const winnerId = scoreA > scoreB ? reportModal.participant_a_id : reportModal.participant_b_id
    try {
      await supabase.from('tournament_matches').update({
        score_a: scoreA, score_b: scoreB,
        winner_id: winnerId, status: 'completed'
      }).eq('id', reportModal.id)
      toast.success('Result reported!')
      setReportModal(null)
      setReportScores({ a: '', b: '' })
      loadTournament()
    } catch { toast.error('Failed to report result') }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-surface rounded-xl animate-pulse border border-border" />)}
    </div>
  )
  if (!tournament) return null

  const isOrganizer = user?.id === tournament.organizer_id
  const isRegistered = participants.some(p => p.user_id === user?.id)
  const isFull = participants.length >= tournament.max_participants
  const statusCfg = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.open
  const game = tournament.game || GAME_BY_ID[tournament.game_id]
  const tabs = ['overview', 'participants', ...(matches.length > 0 ? ['bracket'] : []), 'rules']

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/tournaments')} className="flex items-center gap-2 text-muted hover:text-white mb-6 transition-colors">
        <ArrowLeft size={18} /> Back to Tournaments
      </button>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
        <div className="h-28 bg-gradient-to-br from-accent/20 via-surface to-accent2/10 flex items-center px-6 gap-4">
          <Trophy size={40} className="text-accent opacity-70 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-white truncate">{tournament.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge color={statusCfg.color}>{statusCfg.label}</Badge>
              {game && <Badge>{game.name}</Badge>}
              <Badge color="cyan">{FORMAT_LABELS[tournament.format]}</Badge>
              <Badge>{tournament.participant_type === 'team' ? 'Teams' : 'Solo'}</Badge>
            </div>
          </div>
          <div className="shrink-0 flex gap-2 flex-wrap justify-end">
            {isOrganizer && tournament.status === 'open' && participants.length >= 2 && (
              <Button size="sm" onClick={startTournament} loading={starting}>
                <Play size={14} /> Start
              </Button>
            )}
            {isOrganizer && (tournament.status === 'open' || tournament.status === 'in_progress') && (
              <Button size="sm" variant="danger" onClick={cancelTournament} loading={cancelling}>
                <XCircle size={14} /> Cancel
              </Button>
            )}
            {!isRegistered && tournament.status === 'open' && !isFull && !isOrganizer && (
              tournament.participant_type === 'team' ? (
                myTeams.length > 0 ? (
                  <div className="flex gap-2">
                    <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}
                      className="px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-slate-200 focus:outline-none focus:border-accent">
                      <option value="">Select team</option>
                      {myTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <Button size="sm" loading={registering} onClick={register}>Register</Button>
                  </div>
                ) : (
                  <Link to="/teams/create" className="text-xs text-accent hover:underline flex items-center gap-1">
                    <Users size={12} /> Create a team to join
                  </Link>
                )
              ) : (
                <Button size="sm" loading={registering} onClick={register}>Register</Button>
              )
            )}
            {isRegistered && tournament.status === 'open' && (
              <div className="flex items-center gap-2">
                <Badge color="success"><CheckCircle size={12} className="mr-1" /> Registered</Badge>
                <Button size="sm" variant="secondary" loading={unregistering} onClick={unregister}>
                  <LogOut size={12} /> Leave
                </Button>
              </div>
            )}
            {isRegistered && tournament.status !== 'open' && (
              <Badge color="success"><CheckCircle size={12} className="mr-1" /> Registered</Badge>
            )}
          </div>
        </div>
        <div className="px-6 py-3 border-t border-border flex flex-wrap gap-4 text-sm text-muted">
          <span className="flex items-center gap-1.5"><Users size={14} /> {participants.length}/{tournament.max_participants}</span>
          {tournament.starts_at && <span className="flex items-center gap-1.5"><Calendar size={14} /> {formatDate(tournament.starts_at)}</span>}
          {tournament.prize_info && <span className="text-yellow-400 font-medium">🏆 {tournament.prize_info}</span>}
          <span className="flex items-center gap-1.5">
            <Avatar src={tournament.organizer?.avatar_url} name={tournament.organizer?.username} size="xs" />
            by <Link to={`/profile/${tournament.organizer?.username}`} className="hover:text-accent">{tournament.organizer?.username}</Link>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${activeTab === t ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {tournament.description && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-2">About</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{tournament.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Format', value: FORMAT_LABELS[tournament.format] },
              { label: 'Type', value: tournament.participant_type === 'team' ? 'Team' : 'Solo' },
              { label: 'Registered', value: `${participants.length}/${tournament.max_participants}` },
              { label: 'Status', value: statusCfg.label },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-xs text-muted mb-1">{label}</p>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {participants.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No participants yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {participants.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm font-bold text-muted w-6 text-center">{i + 1}</span>
                  {tournament.participant_type === 'team' && p.team ? (
                    <>
                      {p.team.logo_url
                        ? <img src={p.team.logo_url} className="w-8 h-8 rounded-lg object-cover border border-border" alt="logo" />
                        : <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold text-xs">{p.team.name.charAt(0)}</div>
                      }
                      <span className="text-sm font-semibold text-white">{p.team.name} <span className="text-muted font-normal">[{p.team.tag}]</span></span>
                    </>
                  ) : p.profile ? (
                    <>
                      <Avatar src={p.profile.avatar_url} name={p.profile.username} size="sm" />
                      <Link to={`/profile/${p.profile.username}`} className="text-sm font-semibold text-white hover:text-accent">{p.profile.username}</Link>
                    </>
                  ) : <span className="text-sm text-muted">Unknown</span>}
                  {p.seed && <Badge className="ml-auto">Seed #{p.seed}</Badge>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bracket' && (
        <div className="bg-card border border-border rounded-xl p-4">
          {matches.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <Trophy size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Bracket not generated yet</p>
            </div>
          ) : (
            <>
              <BracketView matches={matches} participants={participants} />
              {isOrganizer && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-white mb-3">Report Match Results</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {matches.filter(m => m.status !== 'completed' && m.participant_a_id && m.participant_b_id).map(match => {
                      const pA = participants.find(p => p.id === match.participant_a_id)
                      const pB = participants.find(p => p.id === match.participant_b_id)
                      const nameA = pA?.team?.name || pA?.profile?.username || 'TBD'
                      const nameB = pB?.team?.name || pB?.profile?.username || 'TBD'
                      return (
                        <button key={match.id} onClick={() => { setReportModal(match); setReportScores({ a: '', b: '' }) }}
                          className="flex items-center gap-2 p-3 bg-surface border border-border rounded-xl hover:border-accent/40 transition-colors text-left text-sm">
                          <Award size={14} className="text-accent shrink-0" />
                          <span className="text-slate-300 truncate">R{match.round}: {nameA} vs {nameB}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="bg-card border border-border rounded-xl p-4">
          {tournament.rules ? (
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{tournament.rules}</p>
          ) : (
            <div className="text-center py-8 text-muted">
              <p className="text-sm">No rules specified</p>
            </div>
          )}
        </div>
      )}

      {/* Report Result Modal */}
      <Modal open={!!reportModal} onClose={() => setReportModal(null)} title="Report Match Result" size="sm">
        {reportModal && (
          <div className="space-y-4">
            {(() => {
              const pA = participants.find(p => p.id === reportModal.participant_a_id)
              const pB = participants.find(p => p.id === reportModal.participant_b_id)
              const nameA = pA?.team?.name || pA?.profile?.username || 'Team A'
              const nameB = pB?.team?.name || pB?.profile?.username || 'Team B'
              return (
                <div className="grid grid-cols-3 items-center gap-3">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white mb-2 truncate">{nameA}</p>
                    <input type="number" min={0} value={reportScores.a} onChange={e => setReportScores(p => ({ ...p, a: e.target.value }))}
                      className="w-full text-center px-3 py-3 text-2xl font-black bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-accent" />
                  </div>
                  <div className="text-center text-muted font-bold">VS</div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white mb-2 truncate">{nameB}</p>
                    <input type="number" min={0} value={reportScores.b} onChange={e => setReportScores(p => ({ ...p, b: e.target.value }))}
                      className="w-full text-center px-3 py-3 text-2xl font-black bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-accent" />
                  </div>
                </div>
              )
            })()}
            <Button className="w-full" onClick={reportResult}>Submit Result</Button>
          </div>
        )}
      </Modal>
    </motion.div>
  )
}
