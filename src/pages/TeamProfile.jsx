import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Crown, Shield, Star, UserMinus, UserPlus, Search, MessageSquare, Check, X, ChevronDown, Edit2, Settings, Camera } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { GAME_BY_ID } from '../utils/constants'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'

const ROLE_ICONS = { owner: Crown, 'co-leader': Shield, captain: Shield, member: Star, substitute: Star }
const ROLE_COLORS = { owner: 'warning', 'co-leader': 'accent', captain: 'cyan', member: 'default', substitute: 'default' }
const ASSIGNABLE_ROLES = ['co-leader', 'captain', 'member', 'substitute']

export default function TeamProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [myMembership, setMyMembership] = useState(null)

  // Join request (non-member)
  const [joinModal, setJoinModal] = useState(false)
  const [joinNote, setJoinNote] = useState('')
  const [joining, setJoining] = useState(false)
  const [myRequest, setMyRequest] = useState(null) // pending request sent by current user

  // Pending requests (leader/co-leader)
  const [joinRequests, setJoinRequests] = useState([])
  const [actioning, setActioning] = useState(null)

  // Invite modal
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteResults, setInviteResults] = useState([])
  const [searchingInvite, setSearchingInvite] = useState(false)
  const [sendingInvite, setSendingInvite] = useState(null)

  // Edit team modal
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ description: '', is_recruiting: false, max_members: 5 })
  const [savingEdit, setSavingEdit] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const logoRef = useRef()
  const bannerRef = useRef()

  // Role & custom role editing
  const [roleDropdown, setRoleDropdown] = useState(null) // userId with open dropdown
  const [editingCustomRole, setEditingCustomRole] = useState(null) // userId being edited
  const [customRoleInput, setCustomRoleInput] = useState('')

  useEffect(() => { loadTeam() }, [id, user])

  const loadTeam = async () => {
    setLoading(true)
    const { data: t } = await supabase
      .from('teams')
      .select('*, game:games(id,name,slug), owner:profiles!owner_id(id,username,avatar_url)')
      .eq('id', id).single()
    if (!t) { navigate('/teams'); return }
    setTeam(t)

    const { data: m } = await supabase
      .from('team_members')
      .select('*, profile:profiles!user_id(id,username,avatar_url,display_name)')
      .eq('team_id', id)
    setMembers(m || [])

    const membership = m?.find(mb => mb.user_id === user?.id) || null
    setMyMembership(membership)

    if (user && !membership) {
      // Check if current user has a pending join request
      const { data: req } = await supabase
        .from('team_join_requests')
        .select('*')
        .eq('team_id', id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle()
      setMyRequest(req)
    }

    // Load pending requests if leader or co-leader
    const isLeader = membership?.role === 'owner' || membership?.role === 'co-leader'
    if (user && isLeader) {
      const { data: reqs } = await supabase
        .from('team_join_requests')
        .select('*, profile:profiles!user_id(id,username,display_name,avatar_url,bio)')
        .eq('team_id', id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      setJoinRequests(reqs || [])
    }

    setLoading(false)
  }

  const submitJoinRequest = async () => {
    if (!user) { navigate('/login'); return }
    setJoining(true)
    try {
      const { data, error } = await supabase
        .from('team_join_requests')
        .insert({ team_id: id, user_id: user.id, note: joinNote.trim() || null, status: 'pending' })
        .select().single()
      if (error?.code === '23505') { toast.error('You already sent a request'); return }
      if (error) throw error
      setMyRequest(data)
      setJoinModal(false)
      setJoinNote('')
      toast.success('Join request sent!')
    } catch { toast.error('Failed to send request') }
    finally { setJoining(false) }
  }

  const cancelJoinRequest = async () => {
    if (!myRequest) return
    try {
      await supabase.from('team_join_requests').delete().eq('id', myRequest.id)
      setMyRequest(null)
      toast.success('Request cancelled')
    } catch { toast.error('Failed to cancel') }
  }

  const acceptRequest = async (req) => {
    setActioning(req.id)
    try {
      // Add to team
      await supabase.from('team_members').insert({ team_id: id, user_id: req.user_id, role: 'member' })
      // Mark request accepted
      await supabase.from('team_join_requests').update({ status: 'accepted' }).eq('id', req.id)
      // Add to team chat if one exists
      const { data: teamConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('team_id', id)
        .maybeSingle()
      if (teamConvo) {
        await supabase.from('conversation_participants').insert({ conversation_id: teamConvo.id, user_id: req.user_id })
      }
      setJoinRequests(prev => prev.filter(r => r.id !== req.id))
      setMembers(prev => [...prev, { user_id: req.user_id, role: 'member', team_id: id, profile: req.profile }])
      toast.success(`${req.profile?.username} joined the team!`)
    } catch { toast.error('Failed to accept') }
    finally { setActioning(null) }
  }

  const declineRequest = async (req) => {
    setActioning(req.id)
    try {
      await supabase.from('team_join_requests').update({ status: 'declined' }).eq('id', req.id)
      setJoinRequests(prev => prev.filter(r => r.id !== req.id))
      toast.success('Request declined')
    } catch { toast.error('Failed to decline') }
    finally { setActioning(null) }
  }

  const setMemberRole = async (memberId, newRole) => {
    try {
      await supabase.from('team_members').update({ role: newRole }).eq('team_id', id).eq('user_id', memberId)
      setMembers(prev => prev.map(m => m.user_id === memberId ? { ...m, role: newRole } : m))
      setRoleDropdown(null)
      toast.success('Role updated')
    } catch { toast.error('Failed to update role') }
  }

  const saveCustomRole = async (memberId) => {
    try {
      await supabase.from('team_members').update({ custom_role: customRoleInput.trim() || null }).eq('team_id', id).eq('user_id', memberId)
      setMembers(prev => prev.map(m => m.user_id === memberId ? { ...m, custom_role: customRoleInput.trim() || null } : m))
      setEditingCustomRole(null)
      toast.success('Role updated')
    } catch { toast.error('Failed to update') }
  }

  const removeMember = async (memberId) => {
    if (!confirm('Remove this member?')) return
    await supabase.from('team_members').delete().eq('team_id', id).eq('user_id', memberId)
    // Also remove from team chat
    const { data: teamConvo } = await supabase.from('conversations').select('id').eq('team_id', id).maybeSingle()
    if (teamConvo) {
      await supabase.from('conversation_participants').delete().eq('conversation_id', teamConvo.id).eq('user_id', memberId)
    }
    setMembers(prev => prev.filter(m => m.user_id !== memberId))
    toast.success('Member removed')
  }

  const leaveTeam = async () => {
    if (!confirm('Leave this team?')) return
    await supabase.from('team_members').delete().eq('team_id', id).eq('user_id', user.id)
    // Remove from team chat
    const { data: teamConvo } = await supabase.from('conversations').select('id').eq('team_id', id).maybeSingle()
    if (teamConvo) {
      await supabase.from('conversation_participants').delete().eq('conversation_id', teamConvo.id).eq('user_id', user.id)
    }
    setMyMembership(null)
    setMembers(prev => prev.filter(m => m.user_id !== user.id))
    toast.success('Left the team')
  }

  const openTeamChat = async () => {
    // Find or create team conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('team_id', id)
      .maybeSingle()

    if (existing) {
      navigate(`/messages/${existing.id}`)
      return
    }

    // Create team group chat
    const convoId = crypto.randomUUID()
    await supabase.from('conversations').insert({
      id: convoId,
      name: team.name,
      is_group: true,
      team_id: id,
      created_by: user.id,
    })
    const participants = members.map(m => ({ conversation_id: convoId, user_id: m.user_id }))
    await supabase.from('conversation_participants').insert(participants)
    navigate(`/messages/${convoId}`)
  }

  const searchPlayers = async () => {
    if (!inviteSearch.trim()) return
    setSearchingInvite(true)
    const { data } = await supabase.from('profiles')
      .select('id,username,avatar_url,display_name')
      .ilike('username', `%${inviteSearch}%`).limit(8)
    setInviteResults(data?.filter(p => !members.find(m => m.user_id === p.id)) || [])
    setSearchingInvite(false)
  }

  const sendInvite = async (playerId) => {
    setSendingInvite(playerId)
    try {
      const { error } = await supabase.from('team_invites').insert({ team_id: id, invitee_id: playerId, inviter_id: user.id })
      if (error?.code === '23505') { toast.error('Already invited'); return }
      if (error) throw error
      toast.success('Invite sent!')
      setInviteResults(prev => prev.filter(p => p.id !== playerId))
    } catch { toast.error('Failed to send invite') }
    finally { setSendingInvite(null) }
  }

  const openEditModal = () => {
    setEditForm({
      description: team.description || '',
      is_recruiting: team.is_recruiting || false,
      max_members: team.max_members || 5,
    })
    setEditModal(true)
  }

  const uploadTeamImage = async (file, type) => {
    const ext = file.name.split('.').pop()
    const bucket = type === 'logo' ? 'avatars' : 'banners'
    const path = `teams/${team.id}/${type}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const url = await uploadTeamImage(file, 'logo')
      await supabase.from('teams').update({ logo_url: url }).eq('id', id)
      setTeam(prev => ({ ...prev, logo_url: url }))
      toast.success('Logo updated!')
    } catch { toast.error('Failed to upload logo') }
    finally { setUploadingLogo(false) }
  }

  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBanner(true)
    try {
      const url = await uploadTeamImage(file, 'banner')
      await supabase.from('teams').update({ banner_url: url }).eq('id', id)
      setTeam(prev => ({ ...prev, banner_url: url }))
      toast.success('Banner updated!')
    } catch { toast.error('Failed to upload banner') }
    finally { setUploadingBanner(false) }
  }

  const saveTeamEdit = async () => {
    setSavingEdit(true)
    try {
      const { error } = await supabase.from('teams').update({
        description: editForm.description.trim() || null,
        is_recruiting: editForm.is_recruiting,
        max_members: Math.min(10, Math.max(members.length, parseInt(editForm.max_members) || 5)),
      }).eq('id', id)
      if (error) throw error
      setTeam(prev => ({ ...prev, description: editForm.description.trim() || null, is_recruiting: editForm.is_recruiting, max_members: editForm.max_members }))
      setEditModal(false)
      toast.success('Team updated!')
    } catch { toast.error('Failed to save changes') }
    finally { setSavingEdit(false) }
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-surface rounded-xl animate-pulse border border-border" />)}
    </div>
  )
  if (!team) return null

  const isOwner = myMembership?.role === 'owner'
  const isCoLeader = myMembership?.role === 'co-leader'
  const isLeader = isOwner || isCoLeader
  const isMember = !!myMembership
  const game = team.game || GAME_BY_ID[team.game_id]
  const canJoin = !isMember && !myRequest && team.is_recruiting && members.length < team.max_members

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto px-4 py-8"
      onClick={() => { setRoleDropdown(null) }}
    >
      <button onClick={() => navigate('/teams')} className="flex items-center gap-2 text-muted hover:text-white mb-6 transition-colors">
        <ArrowLeft size={18} /> Back to Teams
      </button>

      {/* Team header */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        <div className="h-32 bg-gradient-to-br from-accent/20 via-surface to-accent2/10 relative">
          {team.banner_url && <img src={team.banner_url} className="w-full h-full object-cover" alt="banner" />}
          {isOwner && (
            <button
              onClick={() => bannerRef.current?.click()}
              disabled={uploadingBanner}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded transition-colors"
              title="Change banner"
            >
              {uploadingBanner ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={14} />}
            </button>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
            <div className="flex items-end gap-3">
              <div className="relative">
                {team.logo_url
                  ? <img src={team.logo_url} alt="logo" className="w-14 h-14 rounded-xl object-cover border-2 border-card" />
                  : <div className="w-14 h-14 rounded-xl bg-accent/20 border-2 border-card flex items-center justify-center text-accent font-black text-xl">{team.name.charAt(0)}</div>
                }
                {isOwner && (
                  <button
                    onClick={() => logoRef.current?.click()}
                    disabled={uploadingLogo}
                    className="absolute -bottom-1 -right-1 p-1 bg-black/70 hover:bg-black text-white rounded-full border border-border transition-colors"
                    title="Change logo"
                  >
                    {uploadingLogo ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={10} />}
                  </button>
                )}
              </div>
              <div>
                <h1 className="text-xl font-black text-white">{team.name} <span className="text-muted font-normal text-sm">[{team.tag}]</span></h1>
                <div className="flex items-center gap-2 mt-1">
                  {game && <Badge color="cyan">{game.name}</Badge>}
                  {team.is_recruiting && <Badge color="success">Recruiting</Badge>}
                  <span className="text-xs text-muted">{members.length}/{team.max_members} members</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {isMember && (
                <Button variant="secondary" size="sm" onClick={openTeamChat}>
                  <MessageSquare size={14} /> Team Chat
                </Button>
              )}
              {isLeader && (
                <Button variant="secondary" size="sm" onClick={openEditModal}>
                  <Settings size={14} /> Edit Team
                </Button>
              )}
              {isOwner && (
                <Button variant="secondary" size="sm" onClick={() => setInviteModal(true)}>
                  <UserPlus size={14} /> Invite
                </Button>
              )}
              {canJoin && (
                <Button size="sm" onClick={() => setJoinModal(true)}>
                  <UserPlus size={14} /> Request to Join
                </Button>
              )}
              {myRequest && (
                <Button variant="secondary" size="sm" onClick={cancelJoinRequest}>
                  Pending · Cancel
                </Button>
              )}
              {isMember && !isOwner && (
                <Button variant="danger" size="sm" onClick={leaveTeam}>Leave</Button>
              )}
            </div>
          </div>
        </div>
        {team.description && (
          <div className="px-4 py-3 border-t border-border">
            <p className="text-sm text-slate-300">{team.description}</p>
          </div>
        )}
      </div>

      {/* Pending Join Requests (leader/co-leader only) */}
      {isLeader && joinRequests.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-white">Join Requests</h2>
            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-semibold">{joinRequests.length}</span>
          </div>
          <div className="divide-y divide-border">
            {joinRequests.map(req => (
              <div key={req.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Link to={`/profile/${req.profile?.username}`}>
                    <Avatar src={req.profile?.avatar_url} name={req.profile?.username} size="sm" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${req.profile?.username}`} className="text-sm font-semibold text-white hover:text-accent transition-colors">
                      {req.profile?.display_name || req.profile?.username}
                    </Link>
                    <p className="text-xs text-muted">@{req.profile?.username}</p>
                    {req.note && (
                      <p className="text-sm text-slate-300 mt-2 p-2.5 bg-surface rounded-lg border border-border italic">
                        "{req.note}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => acceptRequest(req)}
                      disabled={actioning === req.id}
                      className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg transition-colors"
                      title="Accept"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={() => declineRequest(req)}
                      disabled={actioning === req.id}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-colors"
                      title="Decline"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="bg-card border border-border rounded-xl">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-white">Roster ({members.length})</h2>
        </div>
        <div className="divide-y divide-border">
          {members.map(member => {
            const RoleIcon = ROLE_ICONS[member.role] || Star
            return (
              <div key={member.user_id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface/50 transition-colors">
                <Link to={`/profile/${member.profile?.username}`}>
                  <Avatar src={member.profile?.avatar_url} name={member.profile?.username} size="sm" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${member.profile?.username}`} className="text-sm font-semibold text-white hover:text-accent transition-colors">
                    {member.profile?.display_name || member.profile?.username}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-muted">@{member.profile?.username}</p>
                    {member.custom_role && (
                      <span className="text-xs text-accent">· {member.custom_role}</span>
                    )}
                  </div>
                </div>

                {/* Role badge — clickable for owner to change (not for themselves) */}
                {isOwner && member.user_id !== user.id ? (
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setRoleDropdown(roleDropdown === member.user_id ? null : member.user_id) }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface border border-border text-xs font-medium text-slate-300 hover:border-accent transition-colors"
                    >
                      <RoleIcon size={10} />
                      {member.role}
                      <ChevronDown size={10} />
                    </button>
                    <AnimatePresence>
                      {roleDropdown === member.user_id && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-20 min-w-[120px]"
                          onClick={e => e.stopPropagation()}
                        >
                          {ASSIGNABLE_ROLES.map(r => (
                            <button
                              key={r}
                              onClick={() => setMemberRole(member.user_id, r)}
                              className={`w-full px-3 py-2 text-xs text-left hover:bg-surface transition-colors ${member.role === r ? 'text-accent font-semibold' : 'text-slate-300'}`}
                            >
                              {r}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Badge color={ROLE_COLORS[member.role] || 'default'}>
                    <RoleIcon size={10} className="mr-1" />
                    {member.role}
                  </Badge>
                )}

                {/* Custom role (owner only, except for owner themselves) */}
                {isOwner && member.user_id !== user.id && (
                  editingCustomRole === member.user_id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={customRoleInput}
                        onChange={e => setCustomRoleInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveCustomRole(member.user_id); if (e.key === 'Escape') setEditingCustomRole(null) }}
                        placeholder="e.g. IGL"
                        maxLength={20}
                        className="w-20 px-2 py-1 bg-surface border border-accent rounded text-xs text-white focus:outline-none"
                      />
                      <button onClick={() => saveCustomRole(member.user_id)} className="p-1 text-green-400 hover:bg-green-400/10 rounded">
                        <Check size={12} />
                      </button>
                      <button onClick={() => setEditingCustomRole(null)} className="p-1 text-muted hover:bg-surface rounded">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingCustomRole(member.user_id); setCustomRoleInput(member.custom_role || '') }}
                      className="p-1.5 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      title="Set custom role"
                    >
                      <Edit2 size={12} />
                    </button>
                  )
                )}

                {isOwner && member.user_id !== user.id && (
                  <button onClick={() => removeMember(member.user_id)} className="p-1.5 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Request to Join Modal */}
      <Modal open={joinModal} onClose={() => { setJoinModal(false); setJoinNote('') }} title="Request to Join">
        <div className="space-y-4">
          <p className="text-sm text-muted">Send a join request to <span className="text-white font-semibold">{team.name}</span>. The team leader will review it.</p>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Note (optional)</label>
            <textarea
              value={joinNote}
              onChange={e => setJoinNote(e.target.value)}
              placeholder="Tell them why you want to join, your rank, playstyle..."
              rows={3}
              maxLength={300}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-slate-200 placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
            />
            <p className="text-xs text-muted text-right mt-1">{joinNote.length}/300</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={submitJoinRequest} loading={joining} className="flex-1">Send Request</Button>
            <Button variant="secondary" onClick={() => { setJoinModal(false); setJoinNote('') }}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Team Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Team">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">Description</label>
            <textarea
              value={editForm.description}
              onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe your team's playstyle, goals, requirements..."
              rows={3}
              maxLength={300}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded text-sm text-slate-200 placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
            />
            <p className="text-xs text-muted text-right mt-1">{editForm.description.length}/300</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">Max Members</label>
            <input
              type="number"
              min={members.length}
              max={10}
              value={editForm.max_members}
              onChange={e => setEditForm(p => ({ ...p, max_members: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) }))}
              className="w-24 px-3 py-2 bg-surface border border-border rounded text-sm text-slate-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <p className="text-xs text-muted mt-1">Maximum 10 · Currently {members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex items-center justify-between py-3 border-y border-border">
            <div>
              <p className="text-sm font-medium text-white">Recruiting</p>
              <p className="text-xs text-muted">Allow new players to request to join</p>
            </div>
            <button
              onClick={() => setEditForm(p => ({ ...p, is_recruiting: !p.is_recruiting }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${editForm.is_recruiting ? 'bg-accent' : 'bg-surface border border-border'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editForm.is_recruiting ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={saveTeamEdit}
              disabled={savingEdit}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold text-sm rounded transition-colors disabled:opacity-40"
            >
              {savingEdit ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
            </button>
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal open={inviteModal} onClose={() => { setInviteModal(false); setInviteSearch(''); setInviteResults([]) }} title="Invite Player">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={inviteSearch} onChange={e => setInviteSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchPlayers()}
              placeholder="Search by username..."
              className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent"
            />
            <Button size="sm" onClick={searchPlayers} loading={searchingInvite}>
              <Search size={14} />
            </Button>
          </div>
          {inviteResults.length > 0 && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {inviteResults.map(player => (
                <div key={player.id} className="flex items-center gap-3 p-2.5 bg-surface rounded-lg border border-border">
                  <Avatar src={player.avatar_url} name={player.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{player.display_name || player.username}</p>
                    <p className="text-xs text-muted">@{player.username}</p>
                  </div>
                  <Button size="sm" loading={sendingInvite === player.id} onClick={() => sendInvite(player.id)}>Invite</Button>
                </div>
              ))}
            </div>
          )}
          {inviteResults.length === 0 && inviteSearch && !searchingInvite && (
            <p className="text-sm text-muted text-center py-4">No players found.</p>
          )}
        </div>
      </Modal>
    </motion.div>
  )
}
