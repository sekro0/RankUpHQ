import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Plus, Trash2, Save, ArrowLeft, X } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Avatar from '../components/ui/Avatar'
import { useGamesStore } from '../store/gamesStore'

export default function EditProfile() {
  const navigate = useNavigate()
  const { user, profile, setProfile } = useAuthStore()
  const { games, gameById } = useGamesStore()
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const avatarRef = useRef()
  const bannerRef = useRef()

  const [form, setForm] = useState({
    username: '', display_name: '', bio: '', age: '', country: '',
    discord_tag: '', instagram_handle: '', twitter_handle: '', twitch_handle: '', youtube_handle: '',
    avatar_url: '', banner_url: '',
  })
  const [userGames, setUserGames] = useState([])
  const [addingGame, setAddingGame] = useState(false)
  const [newGame, setNewGame] = useState({ game_id: '', rank: '', role: '', is_main: false })

  useEffect(() => {
    if (profile) {
      setForm({
        username: profile.username || '', display_name: profile.display_name || '',
        bio: profile.bio || '', age: profile.age || '', country: profile.country || '',
        discord_tag: profile.discord_tag || '', instagram_handle: profile.instagram_handle || '',
        twitter_handle: profile.twitter_handle || '', twitch_handle: profile.twitch_handle || '',
        youtube_handle: profile.youtube_handle || '', avatar_url: profile.avatar_url || '',
        banner_url: profile.banner_url || '',
      })
    }
    loadUserGames()
  }, [profile])

  const loadUserGames = async () => {
    if (!user) return
    const { data } = await supabase.from('user_games').select('*').eq('user_id', user.id)
    setUserGames(data || [])
  }

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const uploadImage = async (file, bucket, path) => {
    const ext = file.name.split('.').pop()
    const fullPath = `${user.id}/${path}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(fullPath, file, { upsert: true, contentType: file.type })
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath)
    return data.publicUrl
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const url = await uploadImage(file, 'avatars', 'avatar')
      update('avatar_url', url)
      toast.success('Avatar updated!')
    } catch { toast.error('Failed to upload avatar') }
    finally { setUploadingAvatar(false) }
  }

  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBanner(true)
    try {
      const url = await uploadImage(file, 'banners', 'banner')
      update('banner_url', url)
      toast.success('Banner updated!')
    } catch { toast.error('Failed to upload banner') }
    finally { setUploadingBanner(false) }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.username.trim()) return toast.error('Username is required')
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return toast.error('Username: only letters, numbers, underscores')
    setSaving(true)
    try {
      if (form.username !== profile?.username) {
        const { data: existing } = await supabase.from('profiles').select('id').eq('username', form.username.toLowerCase()).maybeSingle()
        if (existing) throw new Error('Username already taken')
      }
      const { data: updated, error } = await supabase.from('profiles')
        .update({ ...form, username: form.username.toLowerCase(), age: form.age ? parseInt(form.age) : null, updated_at: new Date().toISOString() })
        .eq('id', user.id).select().single()
      if (error) throw error
      setProfile(updated)
      toast.success('Profile saved!')
      navigate(`/profile/${updated.username}`)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const addGame = async () => {
    if (!newGame.game_id) return toast.error('Select a game')
    try {
      const { data } = await supabase.from('user_games')
        .insert({ user_id: user.id, game_id: newGame.game_id, rank: newGame.rank || null, role: newGame.role || null, is_main: newGame.is_main })
        .select().single()
      setUserGames(prev => [...prev, data])
      setNewGame({ game_id: '', rank: '', role: '', is_main: false })
      setAddingGame(false)
      toast.success('Game added!')
    } catch { toast.error('Failed to add game') }
  }

  const removeGame = async (id) => {
    await supabase.from('user_games').delete().eq('id', id)
    setUserGames(prev => prev.filter(g => g.id !== id))
    toast.success('Game removed')
  }

  const selectedGame = gameById[newGame.game_id]

  const deleteAccount = async () => {
    setDeletingAccount(true)
    try {
      await supabase.rpc('delete_own_account')
      await supabase.auth.signOut()
      navigate('/')
      toast.success('Account deleted')
    } catch (err) {
      toast.error('Failed to delete account. Contact support.')
    } finally {
      setDeletingAccount(false)
      setConfirmDeleteAccount(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
  const labelClass = "text-sm font-medium text-slate-300 block mb-1.5"

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 text-muted hover:text-white hover:bg-surface rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-white">Edit Profile</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Banner + Avatar */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Appearance</h2>
          <div className="relative">
            {/* Banner */}
            <div className="h-36 rounded-xl overflow-hidden bg-gradient-to-br from-accent/30 via-surface to-accent2/20 cursor-pointer group relative" onClick={() => bannerRef.current?.click()}>
              {form.banner_url && <img src={form.banner_url} alt="banner" className="w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingBanner ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={24} className="text-white" />}
              </div>
            </div>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            {/* Delete banner button */}
            {form.banner_url && (
              <button
                type="button"
                onClick={() => update('banner_url', '')}
                className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-red-500/80 rounded-full text-white transition-colors z-10"
                title="Remove banner"
              >
                <X size={14} />
              </button>
            )}

            {/* Avatar */}
            <div className="absolute -bottom-8 left-4 flex items-end gap-1">
              <div className="relative cursor-pointer group" onClick={() => avatarRef.current?.click()}>
                <div className="p-0.5 bg-bg rounded-full">
                  <Avatar src={form.avatar_url} name={form.display_name || form.username} size="lg" />
                </div>
                <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingAvatar ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={16} className="text-white" />}
                </div>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              {/* Delete avatar button */}
              {form.avatar_url && (
                <button
                  type="button"
                  onClick={() => update('avatar_url', '')}
                  className="mb-0.5 p-1 bg-surface border border-border hover:border-red-500/50 hover:bg-red-500/10 rounded-full text-muted hover:text-red-400 transition-colors"
                  title="Remove avatar"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="pt-10 text-xs text-muted">Click on banner or avatar to change · click <X size={10} className="inline" /> to remove</div>
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Basic Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Username <span className="text-red-400">*</span></label>
              <input className={inputClass} value={form.username} onChange={e => update('username', e.target.value)} placeholder="your_username" required />
            </div>
            <div>
              <label className={labelClass}>Display Name</label>
              <input className={inputClass} value={form.display_name} onChange={e => update('display_name', e.target.value)} placeholder="Your Name" />
            </div>
            <div>
              <label className={labelClass}>Age</label>
              <input className={inputClass} type="number" min="13" max="100" value={form.age} onChange={e => update('age', e.target.value)} placeholder="25" />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input className={inputClass} value={form.country} onChange={e => update('country', e.target.value)} placeholder="Argentina" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Bio</label>
              <textarea className={`${inputClass} resize-none`} rows={3} value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="Tell other players about yourself..." maxLength={300} />
              <p className="text-xs text-muted mt-1">{form.bio.length}/300</p>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Social Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'discord_tag', label: 'Discord', placeholder: 'username#0000' },
              { key: 'instagram_handle', label: 'Instagram', placeholder: '@handle' },
              { key: 'twitter_handle', label: 'Twitter / X', placeholder: '@handle' },
              { key: 'twitch_handle', label: 'Twitch', placeholder: 'channel name' },
              { key: 'youtube_handle', label: 'YouTube', placeholder: '@channel' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className={labelClass}>{label}</label>
                <input className={inputClass} value={form[key]} onChange={e => update(key, e.target.value)} placeholder={placeholder} />
              </div>
            ))}
          </div>
        </div>

        {/* Games */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">My Games</h2>
            <Button type="button" variant="secondary" size="sm" onClick={() => setAddingGame(!addingGame)}>
              <Plus size={14} /> Add Game
            </Button>
          </div>

          {addingGame && (
            <div className="p-4 bg-surface border border-border rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select className={inputClass} value={newGame.game_id} onChange={e => setNewGame(prev => ({ ...prev, game_id: e.target.value, rank: '', role: '' }))}>
                  <option value="">Select game...</option>
                  {games.filter(g => !userGames.find(ug => ug.game_id === g.id)).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                {selectedGame?.has_ranks && selectedGame.ranks.length > 0 && (
                  <select className={inputClass} value={newGame.rank} onChange={e => setNewGame(prev => ({ ...prev, rank: e.target.value }))}>
                    <option value="">Select rank...</option>
                    {selectedGame.ranks.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                )}
                {selectedGame?.has_roles && selectedGame.roles.length > 0 && (
                  <select className={inputClass} value={newGame.role} onChange={e => setNewGame(prev => ({ ...prev, role: e.target.value }))}>
                    <option value="">Select role...</option>
                    {selectedGame.roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                )}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={newGame.is_main} onChange={e => setNewGame(prev => ({ ...prev, is_main: e.target.checked }))}
                    className="accent-accent" />
                  Main game
                </label>
                <Button type="button" size="sm" onClick={addGame}>Add</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAddingGame(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {userGames.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">No games added yet. Add your favorite games!</p>
          ) : (
            <div className="space-y-2">
              {userGames.map(ug => {
                const game = gameById[ug.game_id]
                return (
                  <div key={ug.id} className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
                      style={{ background: `${game?.color || '#7c3aed'}20`, color: game?.color || '#7c3aed' }}>
                      {game?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{game?.name}</p>
                      <p className="text-xs text-muted">{[ug.rank, ug.role].filter(Boolean).join(' · ')}{ug.is_main ? ' · Main' : ''}</p>
                    </div>
                    <button type="button" onClick={() => removeGame(ug.id)} className="text-muted hover:text-red-400 transition-colors p-1">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="submit" loading={saving} size="lg">
            <Save size={16} /> Save Profile
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => navigate(-1)}>Cancel</Button>
        </div>

        <div className="border border-red-500/20 rounded-xl p-4 bg-red-500/5">
          <h3 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h3>
          <p className="text-xs text-muted mb-3">Permanently delete your account and all your data. This cannot be undone.</p>
          <button type="button" onClick={() => setConfirmDeleteAccount(true)}
            className="px-4 py-2 text-sm font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
            Delete Account
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDeleteAccount}
        onClose={() => setConfirmDeleteAccount(false)}
        onConfirm={deleteAccount}
        title="Delete your account"
        message="All your data, matches, messages, and team memberships will be permanently deleted. This cannot be undone."
        confirmText="Delete my account"
        loading={deletingAccount}
      />
    </motion.div>
  )
}
