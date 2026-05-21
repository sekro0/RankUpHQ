import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bell, MessageSquare, UserPlus, Users, Check, X, Trophy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUnreadStore } from '../store/unreadStore'
import Avatar from './ui/Avatar'

export default function NotificationPanel() {
  const { user } = useAuthStore()
  const { total, friendRequests, teamJoinRequests, teamInvites: storeTeamInvites, clearFriendRequest, clearTeamInvite } = useUnreadStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [teamInvites, setTeamInvites] = useState([])
  const [friendReqList, setFriendReqList] = useState([])
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [actioning, setActioning] = useState(null)
  const ref = useRef(null)

  const totalBadge = friendRequests + storeTeamInvites + (total > 0 ? 1 : 0) + teamJoinRequests

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && user) {
      loadNotifications()
    }
  }, [open, user])

  const loadNotifications = async () => {
    setLoadingInvites(true)
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
        .limit(10),
    ])
    setTeamInvites(invitesRes.data || [])
    setFriendReqList(friendsRes.data || [])
    setLoadingInvites(false)
  }

  const acceptFriend = async (friendship) => {
    setActioning(friendship.id)
    try {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendship.id)
      setFriendReqList(prev => prev.filter(f => f.id !== friendship.id))
      clearFriendRequest()
      toast.success(`Now friends with ${friendship.requester?.username}!`)
    } catch { toast.error('Failed to accept') }
    finally { setActioning(null) }
  }

  const declineFriend = async (friendship) => {
    setActioning(friendship.id)
    try {
      await supabase.from('friendships').delete().eq('id', friendship.id)
      setFriendReqList(prev => prev.filter(f => f.id !== friendship.id))
      clearFriendRequest()
    } catch { toast.error('Failed to decline') }
    finally { setActioning(null) }
  }

  const acceptTeamInvite = async (invite) => {
    setActioning(invite.id)
    try {
      await supabase.from('team_members').insert({ team_id: invite.team_id, user_id: user.id, role: 'member' })
      await supabase.from('team_invites').update({ status: 'accepted' }).eq('id', invite.id)
      // Add to team chat
      const { data: teamConvo } = await supabase.from('conversations').select('id').eq('team_id', invite.team_id).maybeSingle()
      if (teamConvo) {
        await supabase.from('conversation_participants').insert({ conversation_id: teamConvo.id, user_id: user.id })
      }
      setTeamInvites(prev => prev.filter(i => i.id !== invite.id))
      clearTeamInvite()
      toast.success(`Joined ${invite.team?.name}!`)
      navigate(`/teams/${invite.team_id}`)
      setOpen(false)
    } catch (err) {
      if (err?.code === '23505') toast.error('Already a member')
      else toast.error('Failed to accept invite')
    }
    finally { setActioning(null) }
  }

  const declineTeamInvite = async (invite) => {
    setActioning(invite.id)
    try {
      await supabase.from('team_invites').update({ status: 'declined' }).eq('id', invite.id)
      setTeamInvites(prev => prev.filter(i => i.id !== invite.id))
      clearTeamInvite()
      toast.success('Invite declined')
    } catch { toast.error('Failed to decline') }
    finally { setActioning(null) }
  }

  const hasAnything = friendReqList.length > 0 || teamInvites.length > 0 || total > 0 || teamJoinRequests > 0

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-1.5 rounded transition-colors ${open ? 'text-white bg-surface' : 'text-muted hover:text-white hover:bg-surface'}`}
      >
        <Bell size={16} />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {totalBadge > 99 ? '99+' : totalBadge}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {totalBadge > 0 && (
                <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-semibold">{totalBadge}</span>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loadingInvites ? (
                <div className="p-6 text-center">
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
                </div>
              ) : !hasAnything ? (
                <div className="p-8 text-center">
                  <Bell size={28} className="mx-auto mb-2 text-muted opacity-40" />
                  <p className="text-sm text-muted">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {/* Friend Requests */}
                  {friendReqList.map(friendship => (
                    <div key={friendship.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        <Avatar src={friendship.requester?.avatar_url} name={friendship.requester?.username} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white">
                          <span className="font-semibold">{friendship.requester?.display_name || friendship.requester?.username}</span>
                          {' '}sent you a friend request
                        </p>
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={() => acceptFriend(friendship)}
                            disabled={actioning === friendship.id}
                            className="flex items-center gap-1 px-2.5 py-1 bg-accent/20 hover:bg-accent/30 text-accent text-xs font-medium rounded transition-colors"
                          >
                            <Check size={11} /> Accept
                          </button>
                          <button
                            onClick={() => declineFriend(friendship)}
                            disabled={actioning === friendship.id}
                            className="flex items-center gap-1 px-2.5 py-1 bg-surface hover:bg-red-500/10 text-muted hover:text-red-400 text-xs rounded transition-colors border border-border"
                          >
                            <X size={11} /> Decline
                          </button>
                        </div>
                      </div>
                      <div className="shrink-0 p-1.5 bg-accent/10 rounded-lg text-accent">
                        <UserPlus size={13} />
                      </div>
                    </div>
                  ))}

                  {/* Team Invites */}
                  {teamInvites.map(invite => (
                    <div key={invite.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        {invite.team?.logo_url
                          ? <img src={invite.team.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-border" />
                          : <div className="w-8 h-8 rounded-lg bg-accent/20 border border-border flex items-center justify-center text-accent font-bold text-sm">{invite.team?.name?.charAt(0)}</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white">
                          <span className="font-semibold">{invite.inviter?.username}</span>
                          {' '}invited you to{' '}
                          <span className="font-semibold">{invite.team?.name}</span>
                        </p>
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={() => acceptTeamInvite(invite)}
                            disabled={actioning === invite.id}
                            className="flex items-center gap-1 px-2.5 py-1 bg-accent/20 hover:bg-accent/30 text-accent text-xs font-medium rounded transition-colors"
                          >
                            <Check size={11} /> Join
                          </button>
                          <button
                            onClick={() => declineTeamInvite(invite)}
                            disabled={actioning === invite.id}
                            className="flex items-center gap-1 px-2.5 py-1 bg-surface hover:bg-red-500/10 text-muted hover:text-red-400 text-xs rounded transition-colors border border-border"
                          >
                            <X size={11} /> Decline
                          </button>
                        </div>
                      </div>
                      <div className="shrink-0 p-1.5 bg-cyan-400/10 rounded-lg text-cyan-400">
                        <Users size={13} />
                      </div>
                    </div>
                  ))}

                  {/* Unread Messages */}
                  {total > 0 && (
                    <Link
                      to="/messages"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface/50 transition-colors"
                    >
                      <div className="shrink-0 p-1.5 bg-green-400/10 rounded-lg text-green-400">
                        <MessageSquare size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white">
                          You have <span className="font-semibold text-accent">{total}</span> unread message{total !== 1 ? 's' : ''}
                        </p>
                        <p className="text-[11px] text-muted mt-0.5">Tap to open messages</p>
                      </div>
                    </Link>
                  )}

                  {/* Team Join Requests (if leader) */}
                  {teamJoinRequests > 0 && (
                    <Link
                      to="/teams"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface/50 transition-colors"
                    >
                      <div className="shrink-0 p-1.5 bg-yellow-400/10 rounded-lg text-yellow-400">
                        <Trophy size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white">
                          <span className="font-semibold text-accent">{teamJoinRequests}</span> pending join request{teamJoinRequests !== 1 ? 's' : ''} for your team
                        </p>
                        <p className="text-[11px] text-muted mt-0.5">Tap to review</p>
                      </div>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
