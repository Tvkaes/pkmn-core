// Extracted from Tvkaes/Pokedex src/types/pokemon.types.ts
// Provides the shared domain models used by the Pokédex UI and future battle simulators.

export type Locale = 'en' | 'es' | 'ja'

export interface PokemonStat {
  base_stat: number
  effort: number
  stat: {
    name: string
    url: string
  }
}

export interface PokemonType {
  slot: number
  type: {
    name: string
    url: string
  }
}

export interface PokemonAbility {
  is_hidden: boolean
  slot: number
  ability: {
    name: string
    url: string
  }
}

export interface PokemonAbilityDetails {
  id: number
  name: string
  effect_entries: Array<{
    effect: string
    short_effect: string
    language: { name: string }
  }>
}

export interface PokemonFeaturedAbility {
  name: string
  slug: string
  isHidden: boolean
  description?: string | null
}

export interface PokemonSprites {
  other?: {
    ['official-artwork']?: {
      front_default?: string | null
      front_shiny?: string | null
    }
    home?: {
      front_default?: string | null
      front_shiny?: string | null
    }
  }
  front_default?: string | null
  front_shiny?: string | null
}

export interface PokemonCries {
  latest?: string | null
  legacy?: string | null
}

export interface PokemonMoveVersionDetail {
  level_learned_at: number
  move_learn_method: {
    name: string
    url: string
  }
  version_group: {
    name: string
    url: string
  }
}

export interface PokemonMoveEntry {
  move: {
    name: string
    url: string
  }
  version_group_details: PokemonMoveVersionDetail[]
}

export interface PokemonMoveDamageClass {
  name: string
  url: string
}

export interface PokemonMoveEffectEntry {
  effect: string
  short_effect: string
  language: {
    name: string
  }
}

export interface PokemonMoveMeta {
  ailment?: {
    name: string
  }
  category?: {
    name: string
  }
  min_hits?: number | null
  max_hits?: number | null
  min_turns?: number | null
  max_turns?: number | null
  drain?: number | null
  healing?: number | null
  crit_rate?: number | null
  ailment_chance?: number | null
  flinch_chance?: number | null
  stat_chance?: number | null
}

export interface PokemonMoveData {
  id: number
  name: string
  accuracy: number | null
  power: number | null
  pp: number | null
  priority: number
  damage_class: PokemonMoveDamageClass
  type: {
    name: string
    url: string
  }
  effect_entries: PokemonMoveEffectEntry[]
  meta?: PokemonMoveMeta | null
  target?: {
    name: string
    url: string
  }
}

export interface PokemonData {
  id: number
  name: string
  height: number
  weight: number
  sprites: PokemonSprites
  cries?: PokemonCries
  abilities: PokemonAbility[]
  types: PokemonType[]
  stats: PokemonStat[]
  moves: PokemonMoveEntry[]
}

export interface PokemonSpeciesData {
  id: number
  name?: string
  color: {
    name: string
  }
  flavor_text_entries: Array<{
    flavor_text: string
    language: { name: string }
    version: { name: string }
  }>
  genera: Array<{
    genus: string
    language: { name: string }
  }>
  names: Array<{
    name: string
    language: { name: string }
  }>
  varieties: Array<{
    is_default: boolean
    pokemon: {
      name: string
      url: string
    }
  }>
}

export interface PokemonSignatureMove {
  name: string
  level?: number
  method?: string
  versionGroup?: string
}

export interface PokemonAlternateForm {
  id: number
  name: string
  formattedId: string
  sprite: string
  spriteShiny?: string | null
  primaryType: string
  variantKind?: 'regional' | 'special' | 'mega' | 'primal' | 'dynamax'
  region?: string
  types?: PokemonType[]
  abilities?: PokemonAbility[]
  stats?: PokemonDisplayData['stats']
  height?: number
  weight?: number
  description?: string
  genus?: string
  stone?: {
    slug: string
    sprite?: string | null
  }
  cryUrl?: string
}

export interface PokemonGridEntry {
  id: number
  formattedId: string
  name: string
  nativeName?: string
  sprite: string
  primaryType: string
  hasMegaEvolution: boolean
  alternateForms?: PokemonAlternateForm[]
  cryUrl?: string
}

export interface PokemonDisplayData {
  id: number
  formattedId: string
  name: string
  nativeName?: string
  description: string
  genus: string
  stats: Array<{
    label: string
    value: number
    percentage: number
  }>
  types: PokemonType[]
  abilities: PokemonAbility[]
  featuredAbility?: PokemonFeaturedAbility | null
  signatureMoves?: PokemonSignatureMove[]
  height: number
  weight: number
  sprite: string
  spriteShiny?: string | null
  cryUrl?: string
  hasMegaEvolution?: boolean
  alternateForms?: PokemonAlternateForm[]
  competitiveSets?: CompetitiveMoveSets | null
}

export interface PokemonDetails {
  primaryType: string
  raw: PokemonData
  species: PokemonSpeciesData
  display: PokemonDisplayData
}

export interface PokemonItemData {
  id: number
  name: string
  sprites: {
    default?: string | null
  }
}

export interface CompetitiveMoveRecommendation {
  name: string
  type: string
  roleTag: string
  reason: string
}

export interface CompetitiveMoveSets {
  sweeper: CompetitiveMoveRecommendation[]
  wallbreaker: CompetitiveMoveRecommendation[]
  tank: CompetitiveMoveRecommendation[]
  support: CompetitiveMoveRecommendation[]
}

export type PokemonBundle = {
  data: PokemonData
  species: PokemonSpeciesData
  alternateForms: PokemonAlternateForm[]
}
