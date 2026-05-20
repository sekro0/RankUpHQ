import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trophy, Camera, X } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useGamesStore } from '../store/gamesStore'
import { useT } from '../store/langStore'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

export default function EditTournament() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuthStore()
  const { games } = useGamesStore()
  const { t } = useT()
  const [loading, setLoading] = useState(true)
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

  useEffect(() => { loadTournament() }, [id])

  const loadTournament = async () => {
    const { data, error } = await supabase.from('tournaments').select('*').eq('id', id).single()
    if (error || !data) { navigate('/tournaments'); return }
    if (data.organizer_id !== user?.id) { navigate(`/tournaments/${id}`); return }
    setForm({
      name: data.name || '',
      game_id: data.game_id || '',
      format: data.format || 'single_elimination',
      participant_type: data.participant_type || 'team',
      max_participants: data.max_participants || 8,
      min_team_size: data.min_team_size || 1,
      prize_info: data.prize_info || '',
      rules: data.rules || '',
      starts_at: data.starts_at ? data.starts_at.slice(0, 16) : '',
      description: data.description || '',
      image_url: data.image_url || '',
      banner_url: data.banner_url || '',
    })
    setLoading(false)
  }

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
        game_id: form.game_id || null,
        starts_at: form.starts_at || null,
        max_participants: parseInt(form.max_participants),
        min_team_size: form.participant_type === 'team' ? parseInt(form.min_team_size) || 1 : null,
      }
      const { error } = await supabase.from('tournaments').update(payload).eq('id', id)
      if (error) throw error
      toast.success('Tournament updated!')
      navigate(`/tournaments/${id}`)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const inputClass = "w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
  const labelClass = "text-sm font-medium text-slate-300 block mb-1.5"

  if (loading) return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(`/tournaments/${id}`)} className="p-2 text-muted hover:text-white hover:bg-surface rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-white">{t('edit_tournament')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelClass}>{t('tournament_name')} <span className="text-red-400">*</span></label>
          <input className={inputClass} value={form.name} onChange={e => update('name', e.target.value)} required />
        </div>

        {/* Banner + Image */}
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('tournament_banner')}</label>
            <div className="relative h-28 rounded-xl overflow-hidden bg-gradient-to-br from-accent/20 via-surface to-accent/10 cursor-pointer group border border-border" onClick={() => bannerRef.current?.click()}>
              {form.banner_url
                ? <img src={form.banner_url} alt="banner" className="w-full h-full object-cover" />
                : <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <Camera size={20} className="text-muted" />
                    <span className="text-xs text-muted">{t('click_to_upload_banner')}</span>
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

          <div>
            <label className={labelClass}>{t('tournament_image')} <span className="text-muted text-xs">({t('thumbnail')})</span></label>
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
                <p>{t('square_image_hint')}</p>
                {form.image_url && (
                  <button type="button" onClick={() => update('image_url', '')} className="mt-1 text-red-400/70 hover:text-red-400 flex items-center gap-1">
                    <X size={11} /> {t('remove_image')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t('game')}</label>
            <select className={inputClass} value={form.game_id} onChange={e => update('game_id', e.target.value)}>
              <option value="">{t('any_game')}</option>
              {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('participants')}</label>
            <select className={inputClass} value={form.participant_type} onChange={e => update('participant_type', e.target.value)}>
              <option value="team">{t('teams_label')}</option>
              <option value="solo">{t('solo_players')}</option>
            </select>
          </div>
        </div>

        {form.participant_type === 'team' && (
          <div>
            <label className={labelClass}>{t('min_members')} <span className="text-muted">{t('min_members_hint')}</span></label>
            <input type="number" min={1} max={20} className={inputClass} value={form.min_team_size} onChange={e => update('min_team_size', e.target.value)} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t('format')}</label>
            <select className={inputClass} value={form.format} onChange={e => update('format', e.target.value)}>
              <option value="single_elimination">{t('single_elim')}</option>
              <option value="double_elimination">{t('double_elim')}</option>
              <option value="round_robin">{t('round_robin')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('max_participants')}</label>
            <select className={inputClass} value={form.max_participants} onChange={e => update('max_participants', e.target.value)}>
              {[4,8,16,32,64].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>{t('start_datetime')}</label>
          <input className={inputClass} type="datetime-local" value={form.starts_at} onChange={e => update('starts_at', e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>{t('prize')} <span className="text-muted">{t('prize_hint')}</span></label>
          <input className={inputClass} value={form.prize_info} onChange={e => update('prize_info', e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>{t('description')}</label>
          <textarea className={`${inputClass} resize-none`} rows={3} value={form.description} onChange={e => update('description', e.target.value)} placeholder={t('describe_tournament')} />
        </div>

        <div>
          <label className={labelClass}>{t('rules')}</label>
          <textarea className={`${inputClass} resize-none`} rows={4} value={form.rules} onChange={e => update('rules', e.target.value)} placeholder={t('enter_rules')} />
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="submit" loading={saving} size="lg"><Trophy size={16} /> {t('update_tournament')}</Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => navigate(`/tournaments/${id}`)}>{t('cancel')}</Button>
        </div>
      </form>
    </motion.div>
  )
}
