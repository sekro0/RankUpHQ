import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Target, Gamepad2, Users, MessageSquare, Trophy, Zap, Shield, ChevronRight, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/layout/Navbar'

const GAME_NAMES = ['Valorant', 'Counter-Strike 2', 'League of Legends', 'Apex Legends', 'Rocket League', 'Fortnite', 'Dota 2', 'Overwatch 2']

export default function Landing() {
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-20 px-4 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span className="text-xs font-semibold uppercase tracking-widest text-accent border-l-2 border-accent pl-3">
              The home for FPS players
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-5 text-5xl sm:text-7xl font-black text-white leading-none tracking-tight"
          >
            Stop Searching.<br />
            <span className="text-accent">Start Ranking Up.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-6 text-lg text-muted max-w-xl leading-relaxed"
          >
            Find teammates at your rank, build your squad, and compete — no Discord servers, no spam.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }}
            className="mt-8 flex flex-col sm:flex-row gap-3"
          >
            <Link to={user ? '/dashboard' : '/register'}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold text-sm rounded transition-colors">
              {user ? 'Go to Dashboard' : 'Get Started Free'}
              <ArrowRight size={16} />
            </Link>
            <Link to="/games"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface hover:bg-card text-white font-semibold text-sm rounded border border-border hover:border-accent/40 transition-colors">
              <Gamepad2 size={16} />
              Browse Games
            </Link>
          </motion.div>

        </div>
      </section>

      {/* Games strip */}
      <section className="py-8 border-b border-border overflow-hidden bg-card">
        <div className="flex gap-3 animate-[scroll_25s_linear_infinite] w-max px-4">
          {[...GAME_NAMES, ...GAME_NAMES].map((name, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded text-xs text-muted whitespace-nowrap shrink-0 hover:border-border/80 hover:text-slate-300 transition-colors">
              <span className="w-4 h-4 bg-surface rounded text-[9px] font-bold text-accent flex items-center justify-center">{name.charAt(0)}</span>
              {name}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">Platform</span>
            <h2 className="mt-3 text-3xl font-black text-white">
              Everything in one place
            </h2>
            <p className="mt-2 text-muted text-sm max-w-md">Not a Discord server. Not a forum. A dedicated platform built for competitive FPS players.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {[
              {
                icon: Zap, title: 'Ranked Queue',
                desc: 'Real-time queues for every FPS game. Filter by rank and role — find players at your level in seconds.'
              },
              {
                icon: MessageSquare, title: 'Direct Messaging',
                desc: 'Private 1:1 chat and group conversations. Connect directly from any profile or queue.'
              },
              {
                icon: Shield, title: 'Team Builder',
                desc: 'Build your competitive roster. Manage members, roles, and recruiting — your team, your rules.'
              },
              {
                icon: Trophy, title: 'Tournaments',
                desc: 'Organize or enter tournaments. Single elim, double elim, round robin — with live brackets.'
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="bg-card p-6 hover:bg-surface transition-colors"
              >
                <Icon size={18} className="text-accent mb-4" />
                <h3 className="font-bold text-white text-sm mb-2">{title}</h3>
                <p className="text-xs text-muted leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted">How it works</span>
              <h2 className="mt-3 text-3xl font-black text-white leading-tight">
                From zero to<br />squad in minutes
              </h2>
              <p className="mt-4 text-muted text-sm leading-relaxed">
                No lengthy setup. No random invites. Connect with serious players who match your skill level and playstyle.
              </p>
            </div>
            <div className="space-y-0 divide-y divide-border border border-border rounded">
              {[
                { n: '01', title: 'Set up your player card', desc: 'Add your games, ranks, and roles. Customize with avatar, banner, and social links.' },
                { n: '02', title: 'Join the ranked queue', desc: 'Browse games and jump in. Filter by rank and role — find your next teammate fast.' },
                { n: '03', title: 'Grind together', desc: 'DM matched players, build a team, enter tournaments. Everything in one place.' },
              ].map(({ n, title, desc }, i) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="flex gap-5 p-5 bg-card hover:bg-surface transition-colors"
                >
                  <span className="text-2xl font-black text-border font-mono shrink-0 w-10 leading-none pt-0.5">{n}</span>
                  <div>
                    <h3 className="font-bold text-white text-sm mb-1">{title}</h3>
                    <p className="text-muted text-xs leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-8 border border-border bg-card rounded">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
                  <Target size={12} className="text-white" />
                </div>
                <span className="text-sm font-bold text-white">RankUpHQ</span>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Ready to stop solo queuing?</h2>
              <p className="text-muted text-sm">Join thousands of FPS players already using RankUpHQ.</p>
            </div>
            <Link to={user ? '/dashboard' : '/register'}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold text-sm rounded transition-colors shrink-0">
              {user ? 'Go to Dashboard' : 'Create Free Account'}
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-accent rounded flex items-center justify-center">
              <Target size={10} className="text-white" />
            </div>
            <span className="font-bold text-sm text-white">RankUp<span className="text-accent">HQ</span></span>
          </div>
          <p className="text-xs text-muted">© 2025 RankUpHQ. Built for FPS players, by FPS players.</p>
          <div className="flex gap-5 text-xs text-muted">
            <Link to="/games" className="hover:text-white transition-colors">Games</Link>
            <Link to="/teams" className="hover:text-white transition-colors">Teams</Link>
            <Link to="/tournaments" className="hover:text-white transition-colors">Tournaments</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
