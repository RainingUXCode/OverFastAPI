import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Alert, Avatar, Box, Chip, CircularProgress, Dialog, DialogContent, IconButton, InputAdornment, MenuItem, Select, Skeleton, TextField, Tooltip, Typography } from '@mui/material'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import './App.css'

const API_URL = 'https://overfast-api.tekrop.fr'
type Role = 'tank' | 'damage' | 'support'
type RoleInfo = { label: string; Icon: typeof ShieldOutlinedIcon }
interface HeroCard { key: string; name: string; portrait?: string; role: Role; subrole?: string }
interface HeroDetails extends HeroCard { age?: number; backgrounds?: { url: string; sizes: string[] }[]; birthday?: string; description?: string; location?: string }

const roles: Record<Role, RoleInfo> = {
  tank: { label: 'Tanque', Icon: ShieldOutlinedIcon },
  damage: { label: 'Dano', Icon: BoltRoundedIcon },
  support: { label: 'Suporte', Icon: FavoriteBorderRoundedIcon },
}
const subroles: Record<string, string> = { bruiser: 'Brutamontes', flanker: 'Flanqueador', initiator: 'Iniciador', medic: 'Médico', recon: 'Reconhecimento', sharpshooter: 'Atirador de elite', specialist: 'Especialista', stalwart: 'Robusto', survivor: 'Sobrevivente', tactician: 'Tático' }
const getSubroleLabel = (subrole?: string) => subrole ? subroles[subrole] ?? subrole : 'Não informado'

function App() {
  const [heroes, setHeroes] = useState<HeroCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all')
  const [selectedHero, setSelectedHero] = useState<HeroDetails | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [failedPortraits, setFailedPortraits] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const controller = new AbortController()
    async function loadHeroes() {
      try {
        const response = await fetch(`${API_URL}/heroes`, { signal: controller.signal })
        if (!response.ok) throw new Error('Falha ao carregar os heróis')
        const data: HeroCard[] = await response.json()
        setHeroes(data.sort((first, second) => first.name.localeCompare(second.name)))
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') setError('Não foi possível carregar os heróis agora. Tente novamente mais tarde.')
      } finally { setIsLoading(false) }
    }
    loadHeroes()
    return () => controller.abort()
  }, [])

  const visibleHeroes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return heroes.filter((hero) => (roleFilter === 'all' || hero.role === roleFilter) && hero.name.toLocaleLowerCase().includes(normalizedQuery))
  }, [heroes, query, roleFilter])

  async function openHero(hero: HeroCard) {
    setSelectedHero(hero)
    setIsDetailLoading(true)
    try {
      const response = await fetch(`${API_URL}/heroes/${hero.key}`)
      if (!response.ok) throw new Error('Falha ao carregar os detalhes')
      setSelectedHero(await response.json())
    } catch {
      // Mantém os dados do card se a requisição de detalhes falhar.
    } finally { setIsDetailLoading(false) }
  }

  const role = selectedHero ? roles[selectedHero.role] : null
  const background = selectedHero?.backgrounds?.find(({ sizes }) => sizes.includes('md'))?.url ?? selectedHero?.backgrounds?.[0]?.url

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="Overwatch Heroes"><span className="brand-mark">OW</span><span>OVERWATCH <em>HEROES</em></span></a><span className="api-badge"><span /> OVERFAST API</span></header>
    <section className="hero-heading" id="top"><p className="eyebrow">BASE DE DADOS</p><h1>ESCOLHA SEU HERÓI</h1><p>Explore o elenco de Overwatch e descubra os detalhes de cada personagem.</p></section>
    <section className="controls" aria-label="Filtros de heróis">
      <TextField className="search-field" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar herói" size="small" value={query} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> } }} />
      <Select className="role-select" inputProps={{ 'aria-label': 'Filtrar por função' }} onChange={(event) => setRoleFilter(event.target.value as 'all' | Role)} size="small" value={roleFilter}><MenuItem value="all">Todas as funções</MenuItem>{Object.entries(roles).map(([key, value]) => <MenuItem key={key} value={key}>{value.label}</MenuItem>)}</Select>
      <span className="result-count">{visibleHeroes.length} heróis</span>
    </section>
    {error && <Alert className="api-error" severity="error">{error}</Alert>}
    <section className="hero-grid" aria-live="polite">
      {isLoading ? Array.from({ length: 12 }, (_, index) => <Skeleton key={index} className="hero-skeleton" variant="rectangular" />) : visibleHeroes.map((hero) => <HeroCardItem failed={Boolean(failedPortraits[hero.key])} hero={hero} key={hero.key} onClick={() => openHero(hero)} onImageError={() => setFailedPortraits((portraits) => ({ ...portraits, [hero.key]: true }))} />)}
    </section>
    {!isLoading && !error && visibleHeroes.length === 0 && <p className="empty-state">Nenhum herói encontrado.</p>}
    <HeroDialog background={background} hero={selectedHero} isLoading={isDetailLoading} onClose={() => setSelectedHero(null)} role={role} />
  </main>
}

function HeroCardItem({ failed, hero, onClick, onImageError }: { failed: boolean; hero: HeroCard; onClick: () => void; onImageError: () => void }) {
  const { Icon, label } = roles[hero.role]
  return <button className="hero-card" onClick={onClick} type="button"><div className="portrait-wrap">{hero.portrait && !failed ? <img alt="" src={hero.portrait} onError={onImageError} /> : <div className="portrait-fallback">{hero.name.slice(0, 1)}</div>}<span className={`role-corner ${hero.role}`}><Icon fontSize="small" /></span></div><div className="card-label"><span>{hero.name}</span><Tooltip title={label}><Icon className="role-icon" /></Tooltip></div></button>
}

function HeroDialog({ background, hero, isLoading, onClose, role }: { background?: string; hero: HeroDetails | null; isLoading: boolean; onClose: () => void; role: RoleInfo | null }) {
  return <Dialog className="hero-dialog" fullWidth maxWidth="md" onClose={onClose} open={Boolean(hero)}>{hero && <DialogContent className="dialog-content"><div className="dialog-art" style={background ? { backgroundImage: `url(${background})` } : undefined}><div className="dialog-shade" /></div><IconButton aria-label="Fechar" className="close-button" onClick={onClose}><CloseRoundedIcon /></IconButton><Box className="dialog-copy"><p className="eyebrow">HERÓI OVERWATCH</p><Typography component="h2">{hero.name}</Typography>{isLoading ? <CircularProgress className="detail-spinner" size={22} /> : <p className="description">{hero.description || 'Detalhes biográficos indisponíveis.'}</p>}<div className="chips">{role && <Chip className={`role-chip ${hero.role}`} icon={<role.Icon />} label={role.label} />}<Chip label={getSubroleLabel(hero.subrole)} variant="outlined" /></div><div className="fact-list"><Fact icon={<LocationOnOutlinedIcon />} label="BASE DE OPERAÇÕES" value={hero.location || 'Não informada'} /><Fact icon={<CakeOutlinedIcon />} label="ANIVERSÁRIO / IDADE" value={hero.birthday ? `${hero.birthday}${hero.age ? ` · ${hero.age} anos` : ''}` : 'Não informado'} /></div></Box></DialogContent>}</Dialog>
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div><Avatar>{icon}</Avatar><span><small>{label}</small>{value}</span></div>
}

export default App
