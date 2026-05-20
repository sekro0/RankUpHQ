import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const T = {
  en: {
    // Nav
    home: 'Home', games: 'Games', discover: 'Discover', friends: 'Friends',
    teams: 'Teams', tournaments: 'Tournaments', messages: 'Messages',
    view_profile: 'View Profile', edit_profile: 'Edit Profile', sign_out: 'Sign Out',
    log_in: 'Log In', sign_up: 'Sign Up',
    // Dashboard
    good_morning: 'Good morning', good_afternoon: 'Good afternoon', good_evening: 'Good evening',
    active_queues: 'Active Queues', recent_messages: 'Recent Messages', my_teams: 'My Teams',
    quick_join: 'Quick Join', team_invites: 'Team Invites', upcoming_tournaments: 'Tournaments',
    not_in_queues: 'Not in any queues', find_game: 'Find a game →',
    no_conversations: 'No conversations yet', no_teams: 'Not on any teams yet',
    create_one: 'Create one →', all_games: 'All games',
    queues: 'Queues', chats: 'Chats', events: 'Events',
    browse: 'Browse', all: 'All', view: 'View', leave: 'Leave',
    accept: 'Accept', decline: 'Decline',
    // Common
    save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', create: 'Create',
    loading: 'Loading...', open: 'Open', live: 'Live',
    // Tournament
    create_tournament: 'Create Tournament', tournament_name: 'Tournament Name',
    game: 'Game', any_game: 'Any game', participants: 'Participants',
    teams_label: 'Teams', solo_players: 'Solo players',
    min_members: 'Min. team members required', min_members_hint: '(to register)',
    format: 'Format', max_participants: 'Max Participants',
    single_elim: 'Single Elimination', double_elim: 'Double Elimination', round_robin: 'Round Robin',
    start_datetime: 'Start Date & Time', prize: 'Prize / Reward', prize_hint: '(optional)',
    description: 'Description', rules: 'Rules',
    describe_tournament: 'Describe your tournament...', enter_rules: 'Enter tournament rules...',
    tournament_image: 'Tournament Image', tournament_banner: 'Tournament Banner',
    // Edit Profile
    appearance: 'Appearance', click_to_change: 'Click banner or avatar to change · click',
    to_remove: 'to remove',
    basic_info: 'Basic Info', username: 'Username', display_name: 'Display Name',
    age: 'Age', country: 'Country', bio: 'Bio', social_links: 'Social Links',
    my_games: 'My Games', add_game: 'Add Game', main_game: 'Main game',
    save_profile: 'Save Profile', danger_zone: 'Danger Zone',
    delete_account: 'Delete Account',
    // Auth
    welcome_back: 'Welcome back', create_account: 'Create your account',
    email: 'Email', password: 'Password', username_label: 'Username',
    no_account: "Don't have an account?", have_account: 'Already have an account?',
  },
  es: {
    // Nav
    home: 'Inicio', games: 'Juegos', discover: 'Descubrir', friends: 'Amigos',
    teams: 'Equipos', tournaments: 'Torneos', messages: 'Mensajes',
    view_profile: 'Ver Perfil', edit_profile: 'Editar Perfil', sign_out: 'Cerrar Sesión',
    log_in: 'Iniciar Sesión', sign_up: 'Registrarse',
    // Dashboard
    good_morning: 'Buenos días', good_afternoon: 'Buenas tardes', good_evening: 'Buenas noches',
    active_queues: 'Colas Activas', recent_messages: 'Mensajes Recientes', my_teams: 'Mis Equipos',
    quick_join: 'Unirse Rápido', team_invites: 'Invitaciones de Equipo', upcoming_tournaments: 'Torneos',
    not_in_queues: 'No estás en ninguna cola', find_game: 'Buscar partida →',
    no_conversations: 'Sin conversaciones', no_teams: 'No estás en ningún equipo',
    create_one: 'Crear uno →', all_games: 'Todos los juegos',
    queues: 'Colas', chats: 'Chats', events: 'Eventos',
    browse: 'Ver', all: 'Todos', view: 'Ver', leave: 'Salir',
    accept: 'Aceptar', decline: 'Rechazar',
    // Common
    save: 'Guardar', cancel: 'Cancelar', edit: 'Editar', delete: 'Eliminar', create: 'Crear',
    loading: 'Cargando...', open: 'Abierto', live: 'En vivo',
    // Tournament
    create_tournament: 'Crear Torneo', tournament_name: 'Nombre del Torneo',
    game: 'Juego', any_game: 'Cualquier juego', participants: 'Participantes',
    teams_label: 'Equipos', solo_players: 'Jugadores solos',
    min_members: 'Mín. miembros requeridos', min_members_hint: '(para registrarse)',
    format: 'Formato', max_participants: 'Máx. Participantes',
    single_elim: 'Eliminación Simple', double_elim: 'Doble Eliminación', round_robin: 'Round Robin',
    start_datetime: 'Fecha y Hora de Inicio', prize: 'Premio / Recompensa', prize_hint: '(opcional)',
    description: 'Descripción', rules: 'Reglas',
    describe_tournament: 'Describe tu torneo...', enter_rules: 'Escribe las reglas del torneo...',
    tournament_image: 'Imagen del Torneo', tournament_banner: 'Banner del Torneo',
    // Edit Profile
    appearance: 'Apariencia', click_to_change: 'Clic en banner o avatar para cambiar · clic en',
    to_remove: 'para eliminar',
    basic_info: 'Info Básica', username: 'Usuario', display_name: 'Nombre',
    age: 'Edad', country: 'País', bio: 'Bio', social_links: 'Redes Sociales',
    my_games: 'Mis Juegos', add_game: 'Agregar Juego', main_game: 'Principal',
    save_profile: 'Guardar Perfil', danger_zone: 'Zona de Peligro',
    delete_account: 'Eliminar Cuenta',
    // Auth
    welcome_back: 'Bienvenido de vuelta', create_account: 'Crea tu cuenta',
    email: 'Correo', password: 'Contraseña', username_label: 'Usuario',
    no_account: '¿No tenés cuenta?', have_account: '¿Ya tenés cuenta?',
  },
  pt: {
    // Nav
    home: 'Início', games: 'Jogos', discover: 'Descobrir', friends: 'Amigos',
    teams: 'Times', tournaments: 'Torneios', messages: 'Mensagens',
    view_profile: 'Ver Perfil', edit_profile: 'Editar Perfil', sign_out: 'Sair',
    log_in: 'Entrar', sign_up: 'Cadastrar',
    // Dashboard
    good_morning: 'Bom dia', good_afternoon: 'Boa tarde', good_evening: 'Boa noite',
    active_queues: 'Filas Ativas', recent_messages: 'Mensagens Recentes', my_teams: 'Meus Times',
    quick_join: 'Entrar Rápido', team_invites: 'Convites de Time', upcoming_tournaments: 'Torneios',
    not_in_queues: 'Você não está em nenhuma fila', find_game: 'Buscar partida →',
    no_conversations: 'Sem conversas ainda', no_teams: 'Você não está em nenhum time',
    create_one: 'Criar um →', all_games: 'Todos os jogos',
    queues: 'Filas', chats: 'Chats', events: 'Eventos',
    browse: 'Ver', all: 'Todos', view: 'Ver', leave: 'Sair',
    accept: 'Aceitar', decline: 'Recusar',
    // Common
    save: 'Salvar', cancel: 'Cancelar', edit: 'Editar', delete: 'Excluir', create: 'Criar',
    loading: 'Carregando...', open: 'Aberto', live: 'Ao vivo',
    // Tournament
    create_tournament: 'Criar Torneio', tournament_name: 'Nome do Torneio',
    game: 'Jogo', any_game: 'Qualquer jogo', participants: 'Participantes',
    teams_label: 'Times', solo_players: 'Jogadores solo',
    min_members: 'Mín. membros necessários', min_members_hint: '(para se registrar)',
    format: 'Formato', max_participants: 'Máx. Participantes',
    single_elim: 'Eliminação Simples', double_elim: 'Dupla Eliminação', round_robin: 'Round Robin',
    start_datetime: 'Data e Hora de Início', prize: 'Prêmio / Recompensa', prize_hint: '(opcional)',
    description: 'Descrição', rules: 'Regras',
    describe_tournament: 'Descreva seu torneio...', enter_rules: 'Digite as regras do torneio...',
    tournament_image: 'Imagem do Torneio', tournament_banner: 'Banner do Torneio',
    // Edit Profile
    appearance: 'Aparência', click_to_change: 'Clique no banner ou avatar para alterar · clique em',
    to_remove: 'para remover',
    basic_info: 'Info Básica', username: 'Usuário', display_name: 'Nome',
    age: 'Idade', country: 'País', bio: 'Bio', social_links: 'Redes Sociais',
    my_games: 'Meus Jogos', add_game: 'Adicionar Jogo', main_game: 'Principal',
    save_profile: 'Salvar Perfil', danger_zone: 'Zona de Perigo',
    delete_account: 'Excluir Conta',
    // Auth
    welcome_back: 'Bem-vindo de volta', create_account: 'Crie sua conta',
    email: 'E-mail', password: 'Senha', username_label: 'Usuário',
    no_account: 'Não tem conta?', have_account: 'Já tem conta?',
  },
}

export const useLangStore = create(
  persist(
    (set, get) => ({
      lang: 'es',
      setLang: (lang) => set({ lang }),
      t: (key) => T[get().lang]?.[key] ?? T.en[key] ?? key,
    }),
    { name: 'ruhq-lang' }
  )
)

// Hook for convenient use in components
export const useT = () => {
  const { lang, setLang, t } = useLangStore()
  return { t, lang, setLang }
}
