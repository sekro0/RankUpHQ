import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, Camera, X } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useGamesStore } from '../store/gamesStore'
import Button from '../components/ui/Button'

export default function CreateTournament() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { games } = useGamesStore()
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const imageRef = useRef()
  const bannerRef = useRef()
  const [form, setForm] = useState({
    name: '', game_id: '', format: 'single_elimination', participant_type: 'team',
    max_participants: 8, min_team_size: 1, prize_info: '', rules: '', starts_at: '',
    description: '', image_url: '', banner_url: ''
  })

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const uploadTournamentImage = async (file, path) => {
    const ext = file.name.split('.').pop()
    const fullPath = `${user.id}/${Date.now()}_${path}.${ext}`
    const { error } = await supabase.storage.from('tournament-images').upload(fullPath, file, { upsert: true, contentType: file.type })
    if (error) throw error
    const { data } = supabase.storage.from('tournament-images').getPublicUrl(fullPath)
    return data.publicUrl
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const url = await uploadTournamentImage(file, 'image')
      update('image_url', url)
    } catch { toast.error('Failed to upload image') }
    finally { setUploadingImage(false); e.target.value = '' }
  }

  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBanner(true)
    try {
      const url = await uploadTournamentImage(file, 'banner')
      update('banner_url', url)
    } catch { toast.error('Failed to upload banner') }
    finally { setUploadingBanner(false); e.target.value = '' }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Tournament name is required')
    setSaving(true)
    try {
      const payload = {
        ...form,
        organizer_id: user.id,
        game_id: form.game_id || null,
        starts_at: form.starts_at || null,
        max_participants: parseInt(form.max_participants),
        min_team_size: form.participant_type === 'team' ? parseInt(form.min_team_size) || 1 : null,
      }
      const { data, error } = await supabase.from('tournaments').insert(payload).select().single()
      if (error) throw error
      toast.success('Tournament created!')
      navigate(`/tournaments/${data.id}`)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const inputClass = "w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
  const labelClass = "text-sm font-medium text-slate-300 block mb-1.5"

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/tournaments')} className="p-2 text-muted hover:text-white hover:bg-surface rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-white">Create Tournament</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelClass}>Tournament Name <span className="text-red-400">*</span></label>
          <input className={inputClass} value={form.name} onChange={e => update('name', e.target.value)} placeholder="Spring Championship 2025" required />
        </div>

        {/* Banner + Image */}
        <div className="space-y-3">
          {/* Banner */}
          <div>
            <label className={labelClass}>Tournament Banner</label>
            <div className="relative h-28 rounded-xl overflow-hidden bg-gradient-to-br from-accent/20 via-surface to-accent/10 cursor-pointer group border border-border" onClick={() => bannerRef.current?.click()}>
              {form.banner_url
                ? <img src={form.banner_url} alt="banner" className="w-full h-full object-cover" />
                : <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <Camera size={20} className="text-muted" />
                    <span className="text-xs text-muted">Click to upload banner</span>
                  </div>
              }
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingBanner ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={20} className="text-white" />}
              </div>
              {form.banner_url && (
                <button type="button" onClick={e => { e.stopPropagation(); update('banner_url', '') }}
                  className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-red-500/80 rounded-full text-white transition-colors z-10">
                  <X size={13} />
                </button>
              )}
            </div>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
          </div>

          {/* Image (thumbnail/logo) */}
          <div>
            <label className={labelClass}>Tournament Image <span className="text-muted text-xs">(thumbnail)</span></label>
            <div className="flex items-center gap-3">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-surface border border-border cursor-pointer group shrink-0" onClick={() => imageRef.current?.click()}>
                {form.image_url
                  ? <img src={form.image_url} alt="thumbnail" className="w-full h-full object-cover" />
                  : <div className="absolute inset-0 flex items-center justify-center"><Camera size={18} className="text-muted" /></div>
                }
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingImage ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={16} className="text-white" />}
                </div>
              </div>
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              <div className="text-xs text-muted">
                <p>Square image used as the tournament icon in listings.</p>
                {form.image_url && (
                  <button type="button" onClick={() => update('image_url', '')} className="mt-1 text-red-400/70 hover:text-red-400 flex items-center gap-1">
                    <X size={11} /> Remove image
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Game</label>
            <select className={inputClass} value={form.game_id} onChange={e => update('game_id', e.target.value)}>
              <option value="">Any game</option>
              {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Participants</label>
            <select className={inputClass} value={form.participant_type} onChange={e => update('participant_type', e.target.value)}>
              <option value="team">Teams</option>
              <option value="solo">Solo players</option>
            </select>
          </div>
        </div>

        {form.participant_type === 'team' && (
          <div>
            <label className={labelClass}>Min. team members required <span className="text-muted">(to register)</span></label>
            <input
              type="number" min={1} max={20}
              className={inputClass}
              value={form.min_team_size}
              onChange={e => update('min_team_size', e.target.value)}
              placeholder="1"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Format</label>
            <select className={inputClass} value={form.format} onChange={e => update('format', e.target.value)}>
              <option value="single_elimination">Single Elimination</option>
              <option value="double_elimination">Double Elimination</option>
              <option value="round_robin">Round Robin</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Max Participants</label>
            <select className={inputClass} value={form.max_participants} onChange={e => update('max_participants', e.target.value)}>
              {[4,8,16,32,64].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Start Date & Time</label>
          <input className={inputClass} type="datetime-local" value={form.starts_at} onChange={e => update('starts_at', e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Prize / Reward <span className="text-muted">(optional)</span></label>
          <input className={inputClass} value={form.prize_info} onChange={e => update('prize_info', e.target.value)} placeholder="e.g. $100 prize pool, Discord Nitro..." />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea className={`${inputClass} resize-none`} rows={3} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe your tournament..." />
        </div>

        <div>
          <label className={labelClass}>Rules</label>
          <textarea className={`${inputClass} resize-none`} rows={4} value={form.rules} onChange={e => update('rules', e.target.value)} placeholder="Enter tournament rules and format details..." />
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="submit" loading={saving} size="lg"><Trophy size={16} /> Create Tournament</Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/tournaments')}>Cancel</Button>
        </div>
      </form>
    </motion.div>
  )
}
