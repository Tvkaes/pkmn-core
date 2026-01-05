// Derived from Tvkaes/Pokedex src/services/pokemonService.ts and src/utils/helpers.ts
// Provides the unified parser and normalization logic for PokeAPI payloads without Vue/Pinia dependencies.

import type {
  ArtStyle,
  PokemonAlternateForm,
  PokemonBundle,
  PokemonData,
  PokemonDisplayData,
  PokemonDetails,
  PokemonFeaturedAbility,
  PokemonGridEntry,
  PokemonSignatureMove,
  PokemonSpeciesData,
  PokemonSprites,
  SpriteView,
  Locale,
} from './types'

const LANGUAGE_PREFERENCE: Record<Locale, string[]> = {
  en: ['en'],
  es: ['es', 'es-la'],
  ja: ['ja-Hrkt', 'ja'],
}

const REGIONAL_VARIANTS = [
  { keyword: 'alola', region: 'Alola' },
  { keyword: 'galar', region: 'Galar' },
  { keyword: 'hisui', region: 'Hisui' },
  { keyword: 'paldea', region: 'Paldea' },
]

const SPECIAL_VARIANT_KEYWORDS = [
  'attack',
  'defense',
  'speed',
  'school',
  'shield',
  'blade',
  'origin',
  'sky',
  'zen',
  'dawn',
  'dusk',
  'midnight',
  'sunny',
  'rainy',
  'snowy',
  'therian',
  'incarnate',
  'resolute',
  'pirouette',
  'trash',
  'sand',
  'average',
  'sensu',
  'pom-pom',
  'pau',
  'baile',
  'heat',
  'wash',
  'frost',
  'fan',
  'mow',
]

type VariantClassification = {
  kind: NonNullable<PokemonAlternateForm['variantKind']>
  region?: string
}

export interface PokemonParserOptions {
  locale: Locale
  featuredAbilityOverride?: PokemonFeaturedAbility | null
  artStyle?: ArtStyle
}

export interface PokemonParseResult {
  details: PokemonDetails
  gridEntry: PokemonGridEntry
}

export function normalizeIdentifier(identifier: string | number): string {
  return String(identifier).toLowerCase()
}

function buildLanguagePriority(locale: Locale): string[] {
  const primary = LANGUAGE_PREFERENCE[locale] ?? LANGUAGE_PREFERENCE.en
  const fallback = LANGUAGE_PREFERENCE.en
  const merged = [...primary, ...fallback]
  return Array.from(new Set(merged))
}

function findByLanguage<T extends { language?: { name?: string } }>(entries: T[] | undefined, locale: Locale): T | undefined {
  if (!entries?.length) return undefined
  const priorityOrder = buildLanguagePriority(locale)
  for (const code of priorityOrder) {
    const match = entries.find((item) => item.language?.name === code)
    if (match) {
      return match
    }
  }
  return undefined
}

export function formatPokemonName(name: string): string {
  if (!name) return ''
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function formatPokemonId(id: number): string {
  return `#${String(id).padStart(3, '0')}`
}

export function extractDescription(species: PokemonSpeciesData | undefined, locale: Locale = 'en'): string {
  const entry = findByLanguage(species?.flavor_text_entries, locale)
  if (!entry) return ''
  return entry.flavor_text.replace(/\f|\n|\r/g, ' ').trim()
}

export function extractGenus(species: PokemonSpeciesData | undefined, locale: Locale = 'en'): string {
  const genus = findByLanguage(species?.genera, locale)
  return genus?.genus ?? ''
}

export function extractNativeName(species: PokemonSpeciesData | undefined, locale: Locale = 'en'): string {
  const entry = findByLanguage(species?.names, locale)
  if (entry?.name) return entry.name
  if (locale === 'ja') {
    const japanese = species?.names?.find((item) => item.language?.name === 'ja-Hrkt')
    if (japanese?.name) return japanese.name
  }
  return ''
}

export function extractLocalizedDisplayName(
  data: PokemonData,
  species: PokemonSpeciesData | undefined,
  locale: Locale = 'en'
): string {
  const localized = findByLanguage(species?.names, locale)?.name
  if (localized) return localized
  return formatPokemonName(data.name)
}

export function mapStats(pokemon: PokemonData): PokemonDisplayData['stats'] {
  return pokemon.stats.map((stat) => {
    const labelMap: Record<string, string> = {
      hp: 'HP',
      attack: 'ATK',
      defense: 'DEF',
      'special-attack': 'SP. ATK',
      'special-defense': 'SP. DEF',
      speed: 'SPD',
    }
    const label = labelMap[stat.stat.name] ?? stat.stat.name.toUpperCase()
    const value = stat.base_stat
    const percentage = Math.min((value / 255) * 100, 100)
    return { label, value, percentage }
  })
}

export function selectFeaturedAbility(pokemon: PokemonData): PokemonFeaturedAbility | null {
  if (!pokemon.abilities?.length) return null
  const preferred = pokemon.abilities.find((ability) => !ability.is_hidden) ?? pokemon.abilities[0]
  const slug = preferred?.ability?.name
  if (!slug) return null
  return {
    name: formatPokemonName(slug.replace('-', ' ')),
    slug,
    isHidden: preferred.is_hidden,
  }
}

export function formatMoveLabel(name: string): string {
  return name
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function selectSignatureMoves(data: PokemonData): PokemonSignatureMove[] {
  if (!data.moves?.length) return []

  const normalized = data.moves
    .map((entry): PokemonSignatureMove => {
      const primaryDetail =
        entry.version_group_details?.find((detail) => detail.move_learn_method?.name === 'level-up') ??
        entry.version_group_details?.[0]

      if (!primaryDetail) {
        return {
          name: formatMoveLabel(entry.move.name),
        }
      }

      return {
        name: formatMoveLabel(entry.move.name),
        level: primaryDetail.level_learned_at || undefined,
        method: primaryDetail.move_learn_method?.name ?? undefined,
        versionGroup: primaryDetail.version_group?.name ?? undefined,
      }
    })

  return normalized
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))
    .slice(0, 4)
}

export function createPokemonBundle(
  data: PokemonData,
  species: PokemonSpeciesData,
  alternateForms: PokemonAlternateForm[] = []
): PokemonBundle {
  return { data, species, alternateForms }
}

export function selectSprite(
  sprites: PokemonSprites | undefined,
  artStyle: ArtStyle = 'official',
  shiny: boolean = false,
  view: SpriteView = 'front'
): string {
  const key = `${view}_${shiny ? 'shiny' : 'default'}` as const

  const sources = {
    official: sprites?.other?.['official-artwork']?.[key as 'front_default' | 'front_shiny'],
    home: sprites?.other?.home?.[key as keyof NonNullable<PokemonSprites['other']>['home']],
    nds: sprites?.[key as keyof PokemonSprites],
    animated: sprites?.versions?.['generation-v']?.['black-white']?.animated?.[key as keyof NonNullable<NonNullable<NonNullable<PokemonSprites['versions']>['generation-v']>['black-white']>['animated']],
  }

  // official-artwork no tiene back sprites, usar fallback
  if (artStyle === 'official') {
    if (view === 'back') {
      return (sources.home ?? sources.nds ?? '') as string
    }
    return (sources.official ?? sources.home ?? sources.nds ?? '') as string
  }

  if (artStyle === 'home') {
    return (sources.home ?? sources.official ?? sources.nds ?? '') as string
  }

  if (artStyle === 'animated') {
    return (sources.animated ?? sources.nds ?? sources.official ?? '') as string
  }

  // artStyle === 'nds'
  return (sources.nds ?? sources.official ?? sources.home ?? '') as string
}

export function classifyVariant(name: string): VariantClassification | null {
  const normalized = name.toLowerCase()

  if (normalized.includes('mega')) {
    return { kind: 'mega' }
  }

  if (normalized.includes('primal')) {
    return { kind: 'primal' }
  }

  if (normalized.includes('gigantamax') || normalized.includes('gmax') || normalized.includes('dynamax') || normalized.includes('dmax')) {
    return { kind: 'dynamax' }
  }

  const regionalMatch = REGIONAL_VARIANTS.find(({ keyword }) => normalized.includes(keyword))
  if (regionalMatch) {
    return {
      kind: 'regional',
      region: regionalMatch.region,
    }
  }

  if (SPECIAL_VARIANT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { kind: 'special' }
  }

  return null
}

export function mapDisplayData(
  bundle: PokemonBundle,
  locale: Locale,
  featuredAbilityOverride?: PokemonFeaturedAbility | null,
  artStyle: ArtStyle = 'official'
): PokemonDisplayData {
  const { data, species, alternateForms } = bundle
  return {
    id: data.id,
    formattedId: formatPokemonId(data.id),
    name: extractLocalizedDisplayName(data, species, locale),
    nativeName: extractNativeName(species, 'ja'),
    description: extractDescription(species, locale),
    genus: extractGenus(species, locale),
    stats: mapStats(data),
    types: data.types,
    abilities: data.abilities,
    featuredAbility: featuredAbilityOverride ?? selectFeaturedAbility(data),
    signatureMoves: selectSignatureMoves(data),
    height: data.height / 10,
    weight: data.weight / 10,
    sprite: selectSprite(data.sprites, artStyle, false),
    spriteShiny: selectSprite(data.sprites, artStyle, true) || null,
    cryUrl: data.cries?.latest ?? data.cries?.legacy ?? undefined,
    hasMegaEvolution: alternateForms.length > 0,
    alternateForms,
  }
}

export function mapGridEntry(
  bundle: PokemonBundle,
  locale: Locale,
  artStyle: ArtStyle = 'official'
): PokemonGridEntry {
  const { data, species, alternateForms } = bundle
  return {
    id: data.id,
    formattedId: formatPokemonId(data.id),
    name: extractLocalizedDisplayName(data, species, locale),
    nativeName: extractNativeName(species, 'ja'),
    sprite: selectSprite(data.sprites, artStyle, false),
    primaryType: data.types?.[0]?.type?.name ?? 'normal',
    hasMegaEvolution: alternateForms.length > 0,
    alternateForms: alternateForms.length ? alternateForms : undefined,
    cryUrl: data.cries?.latest ?? data.cries?.legacy ?? undefined,
  }
}

export function parsePokemon(bundle: PokemonBundle, options: PokemonParserOptions): PokemonParseResult {
  const artStyle = options.artStyle ?? 'official'
  const display = mapDisplayData(bundle, options.locale, options.featuredAbilityOverride, artStyle)
  const primaryType = bundle.data.types?.[0]?.type?.name ?? 'normal'
  const details: PokemonDetails = {
    primaryType,
    raw: bundle.data,
    species: bundle.species,
    display,
  }

  return {
    details,
    gridEntry: mapGridEntry(bundle, options.locale, artStyle),
  }
}
