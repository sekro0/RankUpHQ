export const GAMES = [
  { id: 'valorant', name: 'Valorant', slug: 'valorant', genre: 'FPS', color: '#ff4655', cover_url: 'https://static-cdn.jtvnw.net/ttv-boxart/516575-285x380.jpg', has_ranks: true, has_roles: true,
    ranks: [{label:'Iron',value:'iron'},{label:'Bronze',value:'bronze'},{label:'Silver',value:'silver'},{label:'Gold',value:'gold'},{label:'Platinum',value:'platinum'},{label:'Diamond',value:'diamond'},{label:'Ascendant',value:'ascendant'},{label:'Immortal',value:'immortal'},{label:'Radiant',value:'radiant'}],
    roles: [{label:'Duelist',value:'duelist'},{label:'Sentinel',value:'sentinel'},{label:'Controller',value:'controller'},{label:'Initiator',value:'initiator'},{label:'Flex',value:'flex'}]
  },
  { id: 'cs2', name: 'Counter-Strike 2', slug: 'cs2', genre: 'FPS', color: '#de9b35', cover_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg', has_ranks: true, has_roles: true,
    ranks: [{label:'Silver I',value:'s1'},{label:'Silver Elite Master',value:'sem'},{label:'Gold Nova I',value:'gn1'},{label:'Gold Nova Master',value:'gnm'},{label:'Master Guardian I',value:'mg1'},{label:'Master Guardian Elite',value:'mge'},{label:'Distinguished Master Guardian',value:'dmg'},{label:'Legendary Eagle',value:'le'},{label:'Legendary Eagle Master',value:'lem'},{label:'Supreme Master First Class',value:'smfc'},{label:'Global Elite',value:'ge'}],
    roles: [{label:'Entry Fragger',value:'entry'},{label:'AWPer',value:'awper'},{label:'IGL',value:'igl'},{label:'Support',value:'support'},{label:'Lurker',value:'lurker'}]
  },
  { id: 'lol', name: 'League of Legends', slug: 'lol', genre: 'MOBA', color: '#c89b3c', cover_url: 'https://static-cdn.jtvnw.net/ttv-boxart/21779-285x380.jpg', has_ranks: true, has_roles: true,
    ranks: [{label:'Iron',value:'iron'},{label:'Bronze',value:'bronze'},{label:'Silver',value:'silver'},{label:'Gold',value:'gold'},{label:'Platinum',value:'platinum'},{label:'Emerald',value:'emerald'},{label:'Diamond',value:'diamond'},{label:'Master',value:'master'},{label:'Grandmaster',value:'grandmaster'},{label:'Challenger',value:'challenger'}],
    roles: [{label:'Top',value:'top'},{label:'Jungle',value:'jungle'},{label:'Mid',value:'mid'},{label:'Bot/ADC',value:'bot'},{label:'Support',value:'support'},{label:'Fill',value:'fill'}]
  },
  { id: 'fortnite', name: 'Fortnite', slug: 'fortnite', genre: 'Battle Royale', color: '#00d4ff', cover_url: 'https://static-cdn.jtvnw.net/ttv-boxart/33214-285x380.jpg', has_ranks: false, has_roles: false, ranks: [], roles: [] },
  { id: 'apex', name: 'Apex Legends', slug: 'apex', genre: 'Battle Royale', color: '#da3f24', cover_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg', has_ranks: true, has_roles: false,
    ranks: [{label:'Bronze',value:'bronze'},{label:'Silver',value:'silver'},{label:'Gold',value:'gold'},{label:'Platinum',value:'platinum'},{label:'Diamond',value:'diamond'},{label:'Master',value:'master'},{label:'Apex Predator',value:'predator'}],
    roles: []
  },
  { id: 'rocketleague', name: 'Rocket League', slug: 'rocketleague', genre: 'Sports', color: '#0085ff', cover_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg', has_ranks: true, has_roles: false,
    ranks: [{label:'Bronze',value:'bronze'},{label:'Silver',value:'silver'},{label:'Gold',value:'gold'},{label:'Platinum',value:'platinum'},{label:'Diamond',value:'diamond'},{label:'Champion',value:'champion'},{label:'Grand Champion',value:'gc'},{label:'Supersonic Legend',value:'ssl'}],
    roles: []
  },
  { id: 'minecraft', name: 'Minecraft', slug: 'minecraft', genre: 'Sandbox', color: '#5d8732', cover_url: 'https://static-cdn.jtvnw.net/ttv-boxart/27471-285x380.jpg', has_ranks: false, has_roles: false, ranks: [], roles: [] },
  { id: 'dota2', name: 'Dota 2', slug: 'dota2', genre: 'MOBA', color: '#cc3433', cover_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg', has_ranks: true, has_roles: true,
    ranks: [{label:'Herald',value:'herald'},{label:'Guardian',value:'guardian'},{label:'Crusader',value:'crusader'},{label:'Archon',value:'archon'},{label:'Legend',value:'legend'},{label:'Ancient',value:'ancient'},{label:'Divine',value:'divine'},{label:'Immortal',value:'immortal'}],
    roles: [{label:'Carry',value:'carry'},{label:'Mid',value:'mid'},{label:'Offlane',value:'offlane'},{label:'Soft Support',value:'pos4'},{label:'Hard Support',value:'pos5'}]
  },
]

export const GAME_BY_SLUG = Object.fromEntries(GAMES.map(g => [g.slug, g]))
export const GAME_BY_ID = Object.fromEntries(GAMES.map(g => [g.id, g]))

export const LOOKING_FOR_OPTIONS = [
  { label: 'Solo queue partner', value: 'solo' },
  { label: 'Duo', value: 'duo' },
  { label: 'Trio', value: 'trio' },
  { label: 'Full Team (5)', value: 'full_team' },
  { label: 'Scrimmage', value: 'scrim' },
  { label: 'Any', value: 'any' },
]

export const RANK_COLORS = {
  iron: '#9d7c4a', bronze: '#ad7c3c', silver: '#9aa6b2', gold: '#f5c842',
  platinum: '#00e5cc', emerald: '#00b070', diamond: '#4fc3f7', ascendant: '#3bdc76',
  immortal: '#e84057', radiant: '#fffbd1', master: '#9b3be8', grandmaster: '#e84057',
  challenger: '#e8c84a', predator: '#e84057', gc: '#f5a623', ssl: '#00d4ff',
}
