import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MessageSquare, Edit, MapPin, Calendar, ExternalLink, Sword, UserPlus, UserMinus, UserCheck, ShieldOff, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import { timeAgo } from '../utils/formatters'
import { RANK_COLORS } from '../utils/constants'
import { useGamesStore } from '../store/gamesStore'

const SocialIcon = ({ platform }) => {
  const icons = {
    discord: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.024.015.047.033.064 2.053 1.508 4.041 2.423 5.993 3.029a.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.029.077.077 0 0 0 .032-.063c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>,
    instagram: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
    twitter: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    twitch: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>,
    youtube: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  }
  return icons[platform] || null
}

function ProfileComments({ profileId }) {
  const { user } = useAuthStore()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadComments()
    if (!profileId) return
    const channel = supabase
      .channel(`comments-${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_comments', filter: `profile_id=eq.${profileId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            supabase.from('profile_comments').select('*, author:profiles!author_id(id,username,avatar_url)').eq('id', payload.new.id).single()
              .then(({ data }) => { if (data) setComments(prev => [...prev, data]) })
          }
          if (payload.eventType === 'DELETE') setComments(prev => prev.filter(c => c.id !== payload.old.id))
        }
      ).subscribe()
    return () => supabase.removeChannel(channel)
  }, [profileId])

  const loadComments = async () => {
    setLoading(true)
    const { data } = await supabase.from('profile_comments')
      .select('*, author:profiles!author_id(id,username,avatar_url)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setComments(data)
    setLoading(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !user) return
    setSubmitting(true)
    try {
      await supabase.from('profile_comments').insert({ profile_id: profileId, author_id: user.id, content: newComment.trim() })
      setNewComment('')
    } catch {
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteComment = async (id) => {
    await supabase.from('profile_comments').delete().eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
    toast.success('Comment deleted')
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Comments</h3>
      {user && (
        <form onSubmit={submit} className="space-y-2">
          <textarea
            value={newComment} onChange={e => setNewComment(e.target.value)}
            placeholder="Leave a comment..."
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{newComment.length}/500</span>
            <Button type="submit" size="sm" loading={submitting} disabled={!newComment.trim()}>Post Comment</Button>
          </div>
        </form>
      )}
      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted">
          <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No comments yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3 p-3 bg-surface rounded-lg border border-border">
              <Avatar src={comment.author?.avatar_url} name={comment.author?.username} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link to={`/profile/${comment.author?.username}`} className="text-sm font-semibold text-white hover:text-accent transition-colors">
                    {comment.author?.username}
                  </Link>
                  <span className="text-xs text-muted">{timeAgo(comment.created_at)}</span>
                </div>
                <p className="text-sm text-slate-300 break-words">{comment.content}</p>
              </div>
              {user?.id === comment.author_id && (
                <button onClick={() => deleteComment(comment.id)} className="text-muted hover:text-red-400 text-xs shrink-0">Delete</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Profile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { gameById } = useGamesStore()
  const [profile, setProfile] = useState(null)
  const [userGames, setUserGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [friendship, setFriendship] = useState(null) // { id, status, isRequester }
  const [friendActioning, setFriendActioning] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [username])

  const loadProfile = async () => {
    setLoading(true)
    const { data: p } = await supabase.from('profiles').select('*').eq('username', username).single()
    if (!p) { navigate('/'); return }
    setProfile(p)

    const { data: games } = await supabase
      .from('user_games')
      .select('*, game:games(*)')
      .eq('user_id', p.id)
    setUserGames(games || [])

    // Load friendship status
    if (user && user.id !== p.id) {
      const { data: f } = await supabase
        .from('friendships')
        .select('id, status, requester_id, addressee_id')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${p.id}),and(requester_id.eq.${p.id},addressee_id.eq.${user.id})`)
        .maybeSingle()
      if (f) setFriendship({ id: f.id, status: f.status, isRequester: f.requester_id === user.id })
      else setFriendship(null)
    }

    setLoading(false)
  }

  const startConversation = async () => {
    if (!user) { navigate('/login'); return }
    try {
      const { data: myConvos } = await supabase
        .from('conversation_participants')
        .select('conversation_id, conversation:conversations!conversation_id(is_group)')
        .eq('user_id', user.id)
      const myDmIds = (myConvos || []).filter(c => !c.conversation?.is_group).map(c => c.conversation_id)
      if (myDmIds.length > 0) {
        const { data: shared } = await supabase.from('conversation_participants')
          .select('conversation_id').eq('user_id', profile.id).in('conversation_id', myDmIds).maybeSingle()
        if (shared) { navigate(`/messages/${shared.conversation_id}`); return }
      }
      const convoId = crypto.randomUUID()
      const { error } = await supabase.from('conversations').insert({ id: convoId })
      if (error) throw error
      await supabase.from('conversation_participants').insert([
        { conversation_id: convoId, user_id: user.id },
        { conversation_id: convoId, user_id: profile.id }
      ])
      navigate(`/messages/${convoId}`)
    } catch (err) { toast.error(err?.message || 'Failed to start conversation') }
  }

  const sendFriendRequest = async () => {
    setFriendActioning(true)
    try {
      const { data, error } = await supabase.from('friendships')
        .insert({ requester_id: user.id, addressee_id: profile.id, status: 'pending' })
        .select().single()
      if (error) throw error
      setFriendship({ id: data.id, status: 'pending', isRequester: true })
      toast.success('Friend request sent!')
    } catch (err) { toast.error('Failed to send request') }
    finally { setFriendActioning(false) }
  }

  const removeFriend = async () => {
    if (!friendship) return
    setFriendActioning(true)
    try {
      await supabase.from('friendships').delete().eq('id', friendship.id)
      setFriendship(null)
      toast.success('Friend removed')
    } catch { toast.error('Failed') }
    finally { setFriendActioning(false) }
  }

  const acceptRequest = async () => {
    if (!friendship) return
    setFriendActioning(true)
    try {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendship.id)
      setFriendship(prev => ({ ...prev, status: 'accepted' }))
      toast.success(`You're now friends with ${profile.username}!`)
    } catch { toast.error('Failed') }
    finally { setFriendActioning(false) }
  }

  const isOwn = user?.id === profile?.id

  const socialLinks = profile ? [
    { platform: 'discord', handle: profile.discord_tag, label: 'Discord', href: null },
    { platform: 'instagram', handle: profile.instagram_handle, href: `https://instagram.com/${profile.instagram_handle}` },
    { platform: 'twitter', handle: profile.twitter_handle, href: `https://x.com/${profile.twitter_handle}` },
    { platform: 'twitch', handle: profile.twitch_handle, href: `https://twitch.tv/${profile.twitch_handle}` },
    { platform: 'youtube', handle: profile.youtube_handle, href: `https://youtube.com/@${profile.youtube_handle}` },
  ].filter(s => s.handle) : []

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-24 w-64" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Banner + Avatar */}
      <div className="relative">
        <div className="h-48 rounded-xl overflow-hidden bg-gradient-to-br from-accent/30 via-surface to-accent2/20">
          {profile.banner_url && <img src={profile.banner_url} alt="banner" className="w-full h-full object-cover" />}
        </div>
        <div className="absolute -bottom-12 left-6">
          <div className="p-1 bg-bg rounded-full">
            <Avatar src={profile.avatar_url} name={profile.username} size="xl" className="ring-4 ring-bg" />
          </div>
        </div>
        <div className="absolute bottom-3 right-4 flex gap-2">
          {isOwn ? (
            <Button variant="secondary" size="sm" onClick={() => navigate('/profile/edit')}>
              <Edit size={14} /> Edit Profile
            </Button>
          ) : (
            <>
              {/* Friend button */}
              {user && !friendship && (
                <Button variant="secondary" size="sm" onClick={sendFriendRequest} loading={friendActioning}>
                  <UserPlus size={14} /> Add Friend
                </Button>
              )}
              {user && friendship?.status === 'pending' && friendship.isRequester && (
                <Button variant="secondary" size="sm" disabled>
                  <UserCheck size={14} /> Pending
                </Button>
              )}
              {user && friendship?.status === 'pending' && !friendship.isRequester && (
                <Button variant="secondary" size="sm" onClick={acceptRequest} loading={friendActioning}>
                  <Check size={14} /> Accept Request
                </Button>
              )}
              {user && friendship?.status === 'accepted' && (
                <Button variant="secondary" size="sm" onClick={removeFriend} loading={friendActioning}>
                  <UserMinus size={14} /> Unfriend
                </Button>
              )}
              <Button size="sm" onClick={startConversation}>
                <MessageSquare size={14} /> Message
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Profile info */}
      <div className="pt-12 space-y-4">
        <div>
          <h1 className="text-2xl font-black text-white">{profile.display_name || profile.username}</h1>
          <p className="text-muted text-sm">@{profile.username}</p>
        </div>

        {profile.bio && <p className="text-slate-300 text-sm leading-relaxed">{profile.bio}</p>}

        <div className="flex flex-wrap gap-3 text-sm text-muted">
          {profile.age && (
            <span className="flex items-center gap-1.5">
              <Calendar size={14} /> {profile.age} years old
            </span>
          )}
          {profile.country && (
            <span className="flex items-center gap-1.5">
              <MapPin size={14} /> {profile.country}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar size={14} /> Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Social links */}
        {socialLinks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {socialLinks.map(({ platform, handle, href }) => (
              <a
                key={platform}
                href={href || '#'}
                target={href ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-muted hover:text-white hover:border-accent/50 transition-colors"
              >
                <SocialIcon platform={platform} />
                <span>{handle}</span>
                {href && <ExternalLink size={12} />}
              </a>
            ))}
          </div>
        )}

        {/* Games */}
        {userGames.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <Sword size={16} className="text-accent" /> Games
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {userGames.map(ug => {
                const game = ug.game || gameById[ug.game_id]
                return (
                  <div key={ug.id} className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black"
                      style={{ background: `${game?.color || '#7c3aed'}20`, color: game?.color || '#7c3aed' }}>
                      {game?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{game?.name || 'Unknown Game'}</p>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {ug.rank && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{ background: `${RANK_COLORS[ug.rank] || '#7c3aed'}20`, color: RANK_COLORS[ug.rank] || '#7c3aed' }}>
                            {ug.rank}
                          </span>
                        )}
                        {ug.role && <Badge>{ug.role}</Badge>}
                        {ug.is_main && <Badge color="accent">Main</Badge>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="border-t border-border pt-6">
          <ProfileComments profileId={profile.id} />
        </div>
      </div>
    </motion.div>
  )
}
