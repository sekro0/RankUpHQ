import { create } from 'zustand'
import supabase from '../lib/supabase'
import { GAMES } from '../utils/constants'

export const useGamesStore = create((set, get) => ({
  games: [],
  gameBySlug: {},
  gameById: {},
  loaded: false,

  loadGames: async () => {
    if (get().loaded) return
    const { data } = await supabase.from('games').select('*')
    if (data && data.length > 0) {
      const merged = data.map(dbGame => {
        const c = GAMES.find(g => g.slug === dbGame.slug) || {}
        return {
          ...c,
          ...dbGame,
          color: c.color || '#7c3aed',
          cover_url: dbGame.cover_url || c.cover_url || null,
          ranks: dbGame.ranks || c.ranks || [],
          roles: dbGame.roles || c.roles || [],
        }
      })
      const bySlug = Object.fromEntries(merged.map(g => [g.slug, g]))
      const byId = Object.fromEntries(merged.map(g => [g.id, g]))
      set({ games: merged, gameBySlug: bySlug, gameById: byId, loaded: true })
    } else {
      const bySlug = Object.fromEntries(GAMES.map(g => [g.slug, g]))
      const byId = Object.fromEntries(GAMES.map(g => [g.id, g]))
      set({ games: GAMES, gameBySlug: bySlug, gameById: byId, loaded: true })
    }
  },
}))
