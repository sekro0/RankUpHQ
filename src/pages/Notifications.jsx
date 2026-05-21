import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, MessageSquare, UserPlus, Users, Check, X, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUnreadStore } from '../store/unreadStore'
import Avatar from '../components/ui/Avatar'

export default function Notifications() {
  const { user } = useAuthStore()
  const { total, teamJoinRequests, clearFriendRequest, clearTeamInvite } = useUnreadStore()
  const navigate = useNavigate()
  const [friendReqs, setFriendReqs] = useState([])
  const [teamInvites, setTeamInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  const load = async () => {
    setLoading(true)
    const [invitesRes, friendsRes] = await Promise.all([
      supabase.from('team_invites')
        .select('*, team:teams(id,name,logo_url), inviter:profiles!inviter_id(id,username,avatar_url)')
        .eq('invitee_id', user.id)
        .eq('status', 'pending'),
      supabase.from('friendships')
        .select('*, requester:profiles!requester_id(id,username,avatar_url,display_name)')
        .eq('addressee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    setTeamInvites(invitesRes.data || [])
    setFriendReqs(friendsRes.data || [])
    setLoading(false)
  }

  const acceptFriend = async (f) => {
    setActioning(f.id)
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', f.id)
    setFriendReqs(prev => prev.filter(x => x.id !== f.id))
    clearFriendRequest()
    toast.success(`Now friends with ${f.requester?.username}!`)
    setActioning(null)
  }

  const declineFriend = async (f) => {
    setActioning(f.id)
    await supabase.from('friendships').delete().eq('id', f.id)
    setFriendReqs(prev => prev.filter(x => x.id !== f.id))
    clearFriendRequest()
    setActioning(null)
  }

  const acceptTeamInvite = async (invite) => {
    setActioning(invite.id)
    try {
      await supabase.from('team_members').insert({ team_id: invite.team_id, user_id: user.id, role: 'member' })
      await supabase.from('team_invites').update({ status: 'accepted' }).eq('id', invite.id)
      const { data: teamConvo } = await supabase.from('conversations').select('id').eq('team_id', invite.team_id).maybeSingle()
      if (teamConvo) {
        await supabase.from('conversation_participants').insert({ conversation_id: teamConvo.id, user_id: user.id })
      }
      setTeamInvites(prev => prev.filter(i => i.id !== invite.id))
      clearTeamInvite()
      toast.success(`Joined ${invite.team?.name}!`)
      navigate(`/teams/${invite.team_id}`)
    } catch (err) {
      if (err?.code === '23505') toast.error('Already a member')
      else toast.error('Failed to accept invite')
    }
    setActioning(null)
  }

  const declineTeamInvite = async (invite) => {
    setActioning(invite.id)
    await supabase.from('team_invites').update({ status: 'declined' }).eq('id', invite.id)
    setTeamInvites(prev => prev.filter(i => i.id !== invite.id))
    clearTeamInvite()
    toast.success('Invite declined')
    setActioning(null)
  }

  const isEmpty = !loading && friendReqs.length === 0 && teamInvites.length === 0 && total === 0 && teamJoinRequests === 0

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-white mb-6">Notifications</h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-xl animate-pulse border border-border" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="text-center py-20">
          <Bell size={40} className="mx-auto mb-3 text-muted opacity-30" />
          <p className="text-white font-semibold">All caught up!</p>
          <p className="text-sm text-muted mt-1">No pending notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Friend Requests */}
          {friendReqs.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <Avatar src={f.requester?.avatar_url} name={f.requester?.username} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">
                  <Link to={`/profile/${f.requester?.username}`} className="font-semibold hover:text-accent transition-colors">
                    {f.requester?.display_name || f.requester?.username}
                  </Link>
                  {' '}sent you a friend request
                </p>
                <div className="flex gap-2 mt-2.5">
                  <button onClick={() => acceptFriend(f)} disabled={actioning === f.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent text-xs font-medium rounded-lg transition-colors">
                    <Check size={12} /> Accept
                  </button>
                  <button onClick={() => declineFriend(f)} disabled={actioning === f.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-red-500/10 text-muted hover:text-red-400 text-xs rounded-lg transition-colors border border-border">
                    <X size={12} /> Decline
                  </button>
                </div>
              </div>
              <div className="shrink-0 p-2 bg-accent/10 rounded-lg text-accent">
                <UserPlus size={14} />
              </div>
            </motion.div>
          ))}

          {/* Team Invites */}
          {teamInvites.map((invite, i) => (
            <motion.div key={invite.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (friendReqs.length + i) * 0.04 }}
              className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              {invite.team?.logo_url
                ? <img src={invite.team.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-border shrink-0" />
                : <div className="w-9 h-9 rounded-lg bg-accent/20 border border-border flex items-center justify-center text-accent font-bold shrink-0">{invite.team?.name?.charAt(0)}</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">
                  <span className="font-semibold">{invite.inviter?.username}</span>
                  {' '}invited you to join{' '}
                  <Link to={`/teams/${invite.team_id}`} className="font-semibold hover:text-accent transition-colors">{invite.team?.name}</Link>
                </p>
                <div className="flex gap-2 mt-2.5">
                  <button onClick={() => acceptTeamInvite(invite)} disabled={actioning === invite.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent text-xs font-medium rounded-lg transition-colors">
                    <Check size={12} /> Join
                  </button>
                  <button onClick={() => declineTeamInvite(invite)} disabled={actioning === invite.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-red-500/10 text-muted hover:text-red-400 text-xs rounded-lg transition-colors border border-border">
                    <X size={12} /> Decline
                  </button>
                </div>
              </div>
              <div className="shrink-0 p-2 bg-cyan-400/10 rounded-lg text-cyan-400">
                <Users size={14} />
              </div>
            </motion.div>
          ))}

          {/* Unread Messages */}
          {total > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Link to="/messages"
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-accent/30 transition-colors block">
                <div className="shrink-0 p-2 bg-green-400/10 rounded-lg text-green-400">
                  <MessageSquare size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    You have <span className="font-semibold text-accent">{total}</span> unread message{total !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted mt-0.5">Tap to open messages</p>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Team Join Requests */}
          {teamJoinRequests > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Link to="/teams"
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-accent/30 transition-colors block">
                <div className="shrink-0 p-2 bg-yellow-400/10 rounded-lg text-yellow-400">
                  <Trophy size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    <span className="font-semibold text-accent">{teamJoinRequests}</span> pending join request{teamJoinRequests !== 1 ? 's' : ''} for your team
                  </p>
                  <p className="text-xs text-muted mt-0.5">Tap to review</p>
                </div>
              </Link>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
