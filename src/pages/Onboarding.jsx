import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Plus, Trash2, ArrowRight, Check, Target } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useGamesStore } from '../store/gamesStore'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'

const STEPS = ['Personalize', 'Your Games', 'All set!']

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, profile, setProfile } = useAuthStore()
  const { games, gameById } = useGamesStore()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarRef = useRef()

  const [form, setForm] = useState({
    display_name: profile?.display_name || profile?.username || '',
    bio: '',
    avatar_url: profile?.avatar_url || '',
  })
  const [userGames, setUserGames] = useState([])
  const [newGame, setNewGame] = useState({ game_id: '', rank: '', role: '' })

  const inputClass = "w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setForm(p => ({ ...p, avatar_url: data.publicUrl }))
      toast.success('Avatar uploaded!')
    } catch { toast.error('Failed to upload avatar') }
    finally { setUploadingAvatar(false) }
  }

  const addGame = () => {
    if (!newGame.game_id) return
    const game = gameById[newGame.game_id]
    if (userGames.find(g => g.game_id === newGame.game_id)) return
    setUserGames(prev => [...prev, { ...newGame, game }])
    setNewGame({ game_id: '', rank: '', role: '' })
  }

  const removeGame = (game_id) => setUserGames(prev => prev.filter(g => g.game_id !== game_id))

  const selectedGame = gameById[newGame.game_id]

  const handleFinish = async () => {
    setSaving(true)
    try {
      const { data: updated, error } = await supabase.from('profiles')
        .update({
          display_name: form.display_name || null,
          bio: form.bio || null,
          avatar_url: form.avatar_url || null,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select().single()
      if (error) throw error

      // Insert user games
      if (userGames.length > 0) {
        await supabase.from('user_games').insert(
          userGames.map((g, i) => ({
            user_id: user.id,
            game_id: g.game_id,
            rank: g.rank || null,
            role: g.role || null,
            is_main: i === 0
          }))
        )
      }

      setProfile(updated)
      toast.success('Profile set up!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const skip = async () => {
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent/20 border border-accent/30 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Target size={24} className="text-accent" />
          </div>
          <h1 className="text-2xl font-black text-white">Welcome to RankUpHQ!</h1>
          <p className="text-muted text-sm mt-1">Let's set up your profile in a few steps</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? 'bg-accent text-white' : i === step ? 'bg-accent text-white ring-2 ring-accent/30' : 'bg-surface border border-border text-muted'
              }`}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-accent' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-card border border-border rounded-2xl p-6 space-y-5"
          >
            {step === 0 && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Personalize your profile</h2>
                  <p className="text-sm text-muted">Add a photo and tell others about yourself</p>
                </div>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative cursor-pointer group" onClick={() => avatarRef.current?.click()}>
                    <Avatar src={form.avatar_url} name={form.display_name || profile?.username} size="lg" />
                    <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {uploadingAvatar
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <Camera size={16} className="text-white" />}
                    </div>
                  </div>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <div>
                    <p className="text-sm font-medium text-white">{profile?.username}</p>
                    <p className="text-xs text-muted">Click avatar to upload photo</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1.5">Display Name</label>
                  <input className={inputClass} value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} placeholder="Your Name" maxLength={50} />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1.5">Bio <span className="text-muted">(optional)</span></label>
                  <textarea className={`${inputClass} resize-none`} rows={3} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell other players about yourself..." maxLength={300} />
                </div>

                <Button onClick={() => setStep(1)} className="w-full">
                  Next <ArrowRight size={16} />
                </Button>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Your games</h2>
                  <p className="text-sm text-muted">Add the games you play to find teammates</p>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select className={`flex-1 ${inputClass}`} value={newGame.game_id} onChange={e => setNewGame(p => ({ ...p, game_id: e.target.value, rank: '', role: '' }))}>
                      <option value="">Select game...</option>
                      {games.filter(g => !userGames.find(ug => ug.game_id === g.id)).map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <Button type="button" onClick={addGame} disabled={!newGame.game_id} size="sm">
                      <Plus size={16} />
                    </Button>
                  </div>

                  {selectedGame?.has_ranks && selectedGame.ranks.length > 0 && (
                    <select className={inputClass} value={newGame.rank} onChange={e => setNewGame(p => ({ ...p, rank: e.target.value }))}>
                      <option value="">Select rank...</option>
                      {selectedGame.ranks.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  )}
                  {selectedGame?.has_roles && selectedGame.roles.length > 0 && (
                    <select className={inputClass} value={newGame.role} onChange={e => setNewGame(p => ({ ...p, role: e.target.value }))}>
                      <option value="">Select role...</option>
                      {selectedGame.roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  )}
                </div>

                {userGames.length > 0 && (
                  <div className="space-y-2">
                    {userGames.map(ug => (
                      <div key={ug.game_id} className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                          style={{ background: `${ug.game?.color || '#7c3aed'}20`, color: ug.game?.color || '#7c3aed' }}>
                          {ug.game?.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{ug.game?.name}</p>
                          {(ug.rank || ug.role) && <p className="text-xs text-muted">{[ug.rank, ug.role].filter(Boolean).join(' · ')}</p>}
                        </div>
                        <button onClick={() => removeGame(ug.game_id)} className="text-muted hover:text-red-400 transition-colors p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">Back</Button>
                  <Button onClick={() => setStep(2)} className="flex-1">
                    Next <ArrowRight size={16} />
                  </Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-accent/20 border border-accent/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={28} className="text-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">You're all set!</h2>
                  <p className="text-sm text-muted">Your profile is ready. Find FPS teammates at your rank, build your squad, and compete.</p>
                </div>

                <div className="space-y-2 text-sm">
                  {[
                    ['🎮', 'Join game queues to find teammates'],
                    ['❤️', 'Use Discover to match with players'],
                    ['🏆', 'Create or join tournaments'],
                    ['💬', 'Chat with matched players'],
                  ].map(([icon, text]) => (
                    <div key={text} className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                      <span>{icon}</span>
                      <span className="text-slate-300">{text}</span>
                    </div>
                  ))}
                </div>

                <Button loading={saving} onClick={handleFinish} className="w-full" size="lg">
                  <Check size={16} /> Start Playing
                </Button>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <button onClick={skip} className="w-full text-center text-sm text-muted hover:text-white transition-colors mt-4 py-2">
          Skip setup for now
        </button>
      </div>
    </div>
  )
}
