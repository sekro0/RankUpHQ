import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gamepad2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import supabase from '../lib/supabase'
import { useT } from '../store/langStore'

export default function Auth({ mode = 'login' }) {
  const navigate = useNavigate()
  const { t } = useT()
  const [tab, setTab] = useState(mode)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '', username: '', confirmPassword: '' })

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (error) throw new Error('Invalid email or password')
      toast.success(t('welcome_back') + '!')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (form.username.length < 3) return setError('Username must be at least 3 characters')
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return setError('Username can only contain letters, numbers, and underscores')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match')
    setLoading(true)
    try {
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('username', form.username.toLowerCase()).maybeSingle()
      if (existing) throw new Error('Username already taken')

      const username = form.username.toLowerCase()
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { username }, emailRedirectTo: window.location.origin }
      })
      if (error) {
        if (error.message.includes('already registered')) throw new Error('Email already registered')
        throw error
      }

      if (data.session) {
        await supabase.from('profiles')
          .upsert({
            id: data.user.id,
            username,
            display_name: form.username,
            onboarding_completed: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })
        toast.success('Account created!')
        navigate('/onboarding')
      } else {
        toast.success('Account created! Check your email to confirm.')
        setTab('login')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-accent/20 via-bg to-accent2/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.1),transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-center">
          <div className="w-20 h-20 bg-accent/20 border border-accent/30 rounded-2xl flex items-center justify-center mb-8">
            <Gamepad2 size={40} className="text-accent" />
          </div>
          <h1 className="text-4xl font-black text-white mb-4">
            Find Your Team.<br />
            <span className="text-accent">Dominate Together.</span>
          </h1>
          <p className="text-muted text-lg max-w-xs">
            Join thousands of players finding teammates, building teams, and competing in tournaments.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Gamepad2 size={16} className="text-white" />
            </div>
            <span className="font-bold text-xl text-white">Game<span className="text-accent">Match</span></span>
          </div>

          {/* Tabs */}
          <div className="flex bg-surface rounded-xl p-1 mb-8 border border-border">
            {['login', 'register'].map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => { setTab(tabKey); setError('') }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === tabKey ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
              >
                {tabKey === 'login' ? t('log_in') : t('sign_up')}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {tab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{t('welcome_back')}</h2>
                    <p className="text-muted text-sm mt-1">{t('log_in_to_account')}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-1.5">{t('email')}</label>
                      <input
                        type="email" required
                        value={form.email} onChange={e => update('email', e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-1.5">{t('password')}</label>
                      <div className="relative">
                        <input
                          type={showPass ? 'text' : 'password'} required
                          value={form.password} onChange={e => update('password', e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2.5 pr-10 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                      <AlertCircle size={16} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('logging_in_text')}</> : t('log_in')}
                  </button>

                  <p className="text-center text-sm text-muted">
                    {t('no_account')}{' '}
                    <button type="button" onClick={() => setTab('register')} className="text-accent hover:text-accent/80 font-medium">{t('sign_up_free')}</button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{t('create_account')}</h2>
                    <p className="text-muted text-sm mt-1">{t('join_community')}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-1.5">{t('username_label')} <span className="text-red-400">*</span></label>
                      <input
                        type="text" required
                        value={form.username} onChange={e => update('username', e.target.value)}
                        placeholder="xX_ProGamer_Xx"
                        className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                      />
                      <p className="text-xs text-muted mt-1">{t('only_letters')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-1.5">{t('email')}</label>
                      <input
                        type="email" required
                        value={form.email} onChange={e => update('email', e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-1.5">{t('password')}</label>
                      <div className="relative">
                        <input
                          type={showPass ? 'text' : 'password'} required
                          value={form.password} onChange={e => update('password', e.target.value)}
                          placeholder={t('min_chars')}
                          className="w-full px-3 py-2.5 pr-10 bg-surface border border-border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-1.5">{t('confirm_password')}</label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? 'text' : 'password'} required
                          value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)}
                          placeholder={t('repeat_password')}
                          className={`w-full px-3 py-2.5 pr-10 bg-surface border rounded-lg text-slate-200 placeholder-muted text-sm focus:outline-none focus:ring-1 transition-colors ${
                            form.confirmPassword && form.confirmPassword !== form.password
                              ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
                              : form.confirmPassword && form.confirmPassword === form.password
                              ? 'border-green-500/60 focus:border-green-500 focus:ring-green-500/30'
                              : 'border-border focus:border-accent focus:ring-accent'
                          }`}
                        />
                        <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                          {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                      <AlertCircle size={16} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('creating_account_text')}</> : t('sign_up')}
                  </button>

                  <p className="text-center text-sm text-muted">
                    {t('have_account')}{' '}
                    <button type="button" onClick={() => setTab('login')} className="text-accent hover:text-accent/80 font-medium">{t('log_in')}</button>
                  </p>

                  <p className="text-xs text-muted text-center">{t('agree_terms')}</p>
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
