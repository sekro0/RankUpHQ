import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Upload } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useGamesStore } from '../store/gamesStore'
import Button from '../components/ui/Button'

export default function CreateTeam() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { games } = useGamesStore()
  const logoRef = useRef()
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [form, setForm] = useState({
    name: '', tag: '', game_id: '', description: '',
    max_members: 5, is_recruiting: true, logo_url: ''
  })

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('team-logos').upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('team-logos').getPublicUrl(path)
      update('logo_url', data.publicUrl)
      toast.success('Logo uploaded!')
    } catch { toast.error('Failed to upload logo') }
    finally { setUploadingLogo(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Team name is required')
    if (!form.tag.trim()) return toast.error('Team tag is required')
    setSaving(true)
    try {
      const { data: team, error } = await supabase
        .from('teams')
        .insert({ ...form, owner_id: user.id, tag: form.tag.toUpperCase() })
        .select().single()
      if (error) {
        if (error.code === '23505') throw new Error('Team name or tag already taken')
        throw error
      }
      // Add owner as member
      await supabase.from('team_members').insert({ team_id: team.id, user_id: user.id, role: 'owner' })
      toast.success('Team created!')
      navigate(`/teams/${team.id}`)
    } catch (err) { toast.error(err.message || 'Failed to create team') }
    finally { setSaving(false) }
  }

  const inputClass = "w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
  const labelClass = "text-sm font-medium text-slate-300 block mb-1.5"

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/teams')} className="p-2 text-muted hover:text-white hover:bg-surface rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-white">Create Team</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => logoRef.current?.click()}
            className="w-20 h-20 rounded-xl bg-surface border-2 border-dashed border-border hover:border-accent/50 flex flex-col items-center justify-center cursor-pointer transition-colors group relative overflow-hidden"
          >
            {form.logo_url
              ? <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" />
              : uploadingLogo
                ? <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
                : <><Camera size={20} className="text-muted group-hover:text-accent transition-colors" /><span className="text-xs text-muted mt-1">Logo</span></>
            }
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          <div>
            <p className="text-sm font-medium text-white">Team Logo</p>
            <p className="text-xs text-muted">Click to upload. Square image recommended.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Team Name <span className="text-red-400">*</span></label>
            <input className={inputClass} value={form.name} onChange={e => update('name', e.target.value)} placeholder="Team NightOwls" required />
          </div>
          <div>
            <label className={labelClass}>Tag <span className="text-red-400">*</span></label>
            <input className={inputClass} value={form.tag} onChange={e => update('tag', e.target.value.slice(0, 5))} placeholder="NWL" maxLength={5} required />
          </div>
        </div>

        <div>
          <label className={labelClass}>Game</label>
          <select className={inputClass} value={form.game_id} onChange={e => update('game_id', e.target.value)}>
            <option value="">Select game...</option>
            {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea className={`${inputClass} resize-none`} rows={3} value={form.description} onChange={e => update('description', e.target.value)}
            placeholder="Tell players about your team..." maxLength={500} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Max Members</label>
            <input className={inputClass} type="number" min={2} max={20} value={form.max_members} onChange={e => update('max_members', parseInt(e.target.value))} />
          </div>
          <div className="flex flex-col">
            <label className={labelClass}>Open for recruiting</label>
            <div className="flex items-center gap-2 mt-2">
              <button type="button" onClick={() => update('is_recruiting', !form.is_recruiting)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_recruiting ? 'bg-accent' : 'bg-surface border border-border'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_recruiting ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-slate-300">{form.is_recruiting ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="submit" loading={saving} size="lg"><Upload size={16} /> Create Team</Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/teams')}>Cancel</Button>
        </div>
      </form>
    </motion.div>
  )
}
