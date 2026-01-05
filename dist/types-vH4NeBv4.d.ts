type Locale = 'en' | 'es' | 'ja';
interface PokemonStat {
    base_stat: number;
    effort: number;
    stat: {
        name: string;
        url: string;
    };
}
interface PokemonType {
    slot: number;
    type: {
        name: string;
        url: string;
    };
}
interface PokemonAbility {
    is_hidden: boolean;
    slot: number;
    ability: {
        name: string;
        url: string;
    };
}
interface PokemonAbilityDetails {
    id: number;
    name: string;
    effect_entries: Array<{
        effect: string;
        short_effect: string;
        language: {
            name: string;
        };
    }>;
}
interface PokemonFeaturedAbility {
    name: string;
    slug: string;
    isHidden: boolean;
    description?: string | null;
}
interface PokemonSprites {
    other?: {
        ['official-artwork']?: {
            front_default?: string | null;
            front_shiny?: string | null;
        };
        home?: {
            front_default?: string | null;
            front_shiny?: string | null;
        };
    };
    front_default?: string | null;
    front_shiny?: string | null;
}
interface PokemonCries {
    latest?: string | null;
    legacy?: string | null;
}
interface PokemonMoveVersionDetail {
    level_learned_at: number;
    move_learn_method: {
        name: string;
        url: string;
    };
    version_group: {
        name: string;
        url: string;
    };
}
interface PokemonMoveEntry {
    move: {
        name: string;
        url: string;
    };
    version_group_details: PokemonMoveVersionDetail[];
}
interface PokemonMoveDamageClass {
    name: string;
    url: string;
}
interface PokemonMoveEffectEntry {
    effect: string;
    short_effect: string;
    language: {
        name: string;
    };
}
interface PokemonMoveMeta {
    ailment?: {
        name: string;
    };
    category?: {
        name: string;
    };
    min_hits?: number | null;
    max_hits?: number | null;
    min_turns?: number | null;
    max_turns?: number | null;
    drain?: number | null;
    healing?: number | null;
    crit_rate?: number | null;
    ailment_chance?: number | null;
    flinch_chance?: number | null;
    stat_chance?: number | null;
}
interface PokemonMoveData {
    id: number;
    name: string;
    accuracy: number | null;
    power: number | null;
    pp: number | null;
    priority: number;
    damage_class: PokemonMoveDamageClass;
    type: {
        name: string;
        url: string;
    };
    effect_entries: PokemonMoveEffectEntry[];
    meta?: PokemonMoveMeta | null;
    target?: {
        name: string;
        url: string;
    };
}
interface PokemonData {
    id: number;
    name: string;
    height: number;
    weight: number;
    sprites: PokemonSprites;
    cries?: PokemonCries;
    abilities: PokemonAbility[];
    types: PokemonType[];
    stats: PokemonStat[];
    moves: PokemonMoveEntry[];
}
interface PokemonSpeciesData {
    id: number;
    name?: string;
    color: {
        name: string;
    };
    flavor_text_entries: Array<{
        flavor_text: string;
        language: {
            name: string;
        };
        version: {
            name: string;
        };
    }>;
    genera: Array<{
        genus: string;
        language: {
            name: string;
        };
    }>;
    names: Array<{
        name: string;
        language: {
            name: string;
        };
    }>;
    varieties: Array<{
        is_default: boolean;
        pokemon: {
            name: string;
            url: string;
        };
    }>;
}
interface PokemonSignatureMove {
    name: string;
    level?: number;
    method?: string;
    versionGroup?: string;
}
interface PokemonAlternateForm {
    id: number;
    name: string;
    formattedId: string;
    sprite: string;
    spriteShiny?: string | null;
    primaryType: string;
    variantKind?: 'regional' | 'special' | 'mega' | 'primal' | 'dynamax';
    region?: string;
    types?: PokemonType[];
    abilities?: PokemonAbility[];
    stats?: PokemonDisplayData['stats'];
    height?: number;
    weight?: number;
    description?: string;
    genus?: string;
    stone?: {
        slug: string;
        sprite?: string | null;
    };
    cryUrl?: string;
}
interface PokemonGridEntry {
    id: number;
    formattedId: string;
    name: string;
    nativeName?: string;
    sprite: string;
    primaryType: string;
    hasMegaEvolution: boolean;
    alternateForms?: PokemonAlternateForm[];
    cryUrl?: string;
}
interface PokemonDisplayData {
    id: number;
    formattedId: string;
    name: string;
    nativeName?: string;
    description: string;
    genus: string;
    stats: Array<{
        label: string;
        value: number;
        percentage: number;
    }>;
    types: PokemonType[];
    abilities: PokemonAbility[];
    featuredAbility?: PokemonFeaturedAbility | null;
    signatureMoves?: PokemonSignatureMove[];
    height: number;
    weight: number;
    sprite: string;
    spriteShiny?: string | null;
    cryUrl?: string;
    hasMegaEvolution?: boolean;
    alternateForms?: PokemonAlternateForm[];
    competitiveSets?: CompetitiveMoveSets | null;
}
interface PokemonDetails {
    primaryType: string;
    raw: PokemonData;
    species: PokemonSpeciesData;
    display: PokemonDisplayData;
}
interface PokemonItemData {
    id: number;
    name: string;
    sprites: {
        default?: string | null;
    };
}
interface CompetitiveMoveRecommendation {
    name: string;
    type: string;
    roleTag: string;
    reason: string;
}
interface CompetitiveMoveSets {
    sweeper: CompetitiveMoveRecommendation[];
    wallbreaker: CompetitiveMoveRecommendation[];
    tank: CompetitiveMoveRecommendation[];
    support: CompetitiveMoveRecommendation[];
}
type PokemonBundle = {
    data: PokemonData;
    species: PokemonSpeciesData;
    alternateForms: PokemonAlternateForm[];
};

export type { CompetitiveMoveRecommendation as C, Locale as L, PokemonStat as P, PokemonType as a, PokemonAbility as b, PokemonAbilityDetails as c, PokemonFeaturedAbility as d, PokemonSprites as e, PokemonCries as f, PokemonMoveVersionDetail as g, PokemonMoveEntry as h, PokemonMoveDamageClass as i, PokemonMoveEffectEntry as j, PokemonMoveMeta as k, PokemonMoveData as l, PokemonData as m, PokemonSpeciesData as n, PokemonSignatureMove as o, PokemonAlternateForm as p, PokemonGridEntry as q, PokemonDisplayData as r, PokemonDetails as s, PokemonItemData as t, CompetitiveMoveSets as u, PokemonBundle as v };
