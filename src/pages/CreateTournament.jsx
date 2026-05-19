import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
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
  const [form, setForm] = useState({
    name: '', game_id: '', format: 'single_elimination', participant_type: 'team',
    max_participants: 8, min_team_size: 1, prize_info: '', rules: '', starts_at: '', description: ''
  })

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

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
