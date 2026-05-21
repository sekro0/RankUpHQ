import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Globe, Lock, Trash2, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useT } from '../store/langStore'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'

const LANG_OPTIONS = [
  { code: 'es', label: 'Español', flag: '🇦🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
]

export default function Settings() {
  const navigate = useNavigate()
  const { user, clear } = useAuthStore()
  const { t, lang, setLang } = useT()

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.next.length < 6) return toast.error(t('min_chars'))
    if (pwForm.next !== pwForm.confirm) return toast.error('Passwords do not match')
    setSavingPw(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.next })
      if (error) throw error
      toast.success('Password updated!')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) { toast.error(err.message) }
    finally { setSavingPw(false) }
  }

  const deleteAccount = async () => {
    if (deleteConfirm !== user?.email) return
    setDeleting(true)
    try {
      await supabase.from('profiles').delete().eq('id', user.id)
      await supabase.auth.admin.deleteUser(user.id).catch(() => {})
      await supabase.auth.signOut()
      clear()
      navigate('/')
      toast.success('Account deleted')
    } catch { toast.error('Failed to delete account. Contact support.') }
    finally { setDeleting(false) }
  }

  const inputClass = "w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
  const sectionClass = "bg-card border border-border rounded-xl overflow-hidden mb-4"
  const headerClass = "px-4 py-3 border-b border-border flex items-center gap-2"

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 text-muted hover:text-white hover:bg-surface rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-white">{t('settings')}</h1>
      </div>

      {/* Language */}
      <div className={sectionClass}>
        <div className={headerClass}>
          <Globe size={16} className="text-accent" />
          <h2 className="font-semibold text-white text-sm">{t('language')}</h2>
        </div>
        <div className="p-4 grid grid-cols-3 gap-2">
          {LANG_OPTIONS.map(opt => (
            <button
              key={opt.code}
              onClick={() => { setLang(opt.code); toast.success(`Language set to ${opt.label}`) }}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
                lang === opt.code
                  ? 'border-accent bg-accent/10 text-white'
                  : 'border-border text-muted hover:border-accent/50 hover:text-slate-300'
              }`}
            >
              <span className="text-xl">{opt.flag}</span>
              <span className="text-xs font-medium">{opt.label}</span>
              {lang === opt.code && <CheckCircle size={13} className="text-accent" />}
            </button>
          ))}
        </div>
      </div>

      {/* Change Password */}
      <div className={sectionClass}>
        <div className={headerClass}>
          <Lock size={16} className="text-accent" />
          <h2 className="font-semibold text-white text-sm">{t('change_password')}</h2>
        </div>
        <form onSubmit={changePassword} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">{t('new_password')}</label>
            <input
              type="password"
              className={inputClass}
              value={pwForm.next}
              onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
              placeholder={t('min_chars')}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">{t('confirm_password')}</label>
            <input
              type="password"
              className={`${inputClass} ${pwForm.confirm && (pwForm.confirm === pwForm.next ? 'border-green-500' : 'border-red-500')}`}
              value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
              placeholder={t('repeat_password')}
              required
            />
          </div>
          <Button type="submit" loading={savingPw} size="sm">
            <Lock size={13} /> {t('change_password')}
          </Button>
        </form>
      </div>

      {/* Account */}
      <div className="bg-card border border-red-500/20 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-red-500/20 flex items-center gap-2">
          <Trash2 size={16} className="text-red-400" />
          <h2 className="font-semibold text-red-400 text-sm">{t('danger_zone')}</h2>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted mb-3">{t('delete_account_desc')}</p>
          <Button variant="danger" size="sm" onClick={() => setDeleteModal(true)}>
            <Trash2 size={13} /> {t('delete_my_account_btn')}
          </Button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal open={deleteModal} onClose={() => { setDeleteModal(false); setDeleteConfirm('') }} title={t('delete_account')}>
        <div className="space-y-4">
          <p className="text-sm text-slate-300">{t('delete_account_desc')}</p>
          <div>
            <label className="text-xs text-muted block mb-1.5">Type your email <span className="text-white font-semibold">{user?.email}</span> to confirm</label>
            <input
              className="w-full px-3 py-2.5 bg-surface border border-red-500/30 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={user?.email}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="danger"
              loading={deleting}
              onClick={deleteAccount}
              disabled={deleteConfirm !== user?.email}
              className="flex-1"
            >
              {t('delete_my_account_btn')}
            </Button>
            <Button variant="secondary" onClick={() => { setDeleteModal(false); setDeleteConfirm('') }}>{t('cancel')}</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
