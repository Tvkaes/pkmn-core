import { L as Locale, d as PokemonFeaturedAbility, s as PokemonDetails, q as PokemonGridEntry, n as PokemonSpeciesData, m as PokemonData, r as PokemonDisplayData, o as PokemonSignatureMove, p as PokemonAlternateForm, v as PokemonBundle } from '../types-vH4NeBv4.js';
export { C as CompetitiveMoveRecommendation, u as CompetitiveMoveSets, b as PokemonAbility, c as PokemonAbilityDetails, f as PokemonCries, t as PokemonItemData, i as PokemonMoveDamageClass, l as PokemonMoveData, j as PokemonMoveEffectEntry, h as PokemonMoveEntry, k as PokemonMoveMeta, g as PokemonMoveVersionDetail, e as PokemonSprites, P as PokemonStat, a as PokemonType } from '../types-vH4NeBv4.js';
export { B as BattleProfile, O as OffensiveBias, R as RoleWeights, d as determineBattleProfile, g as getPrimaryRole, a as getViableRoles, i as inferRoleWeights } from '../roles-Ul2v_rhE.js';

type VariantClassification = {
    kind: NonNullable<PokemonAlternateForm['variantKind']>;
    region?: string;
};
interface PokemonParserOptions {
    locale: Locale;
    featuredAbilityOverride?: PokemonFeaturedAbility | null;
}
interface PokemonParseResult {
    details: PokemonDetails;
    gridEntry: PokemonGridEntry;
}
declare function normalizeIdentifier(identifier: string | number): string;
declare function formatPokemonName(name: string): string;
declare function formatPokemonId(id: number): string;
declare function extractDescription(species: PokemonSpeciesData | undefined, locale?: Locale): string;
declare function extractGenus(species: PokemonSpeciesData | undefined, locale?: Locale): string;
declare function extractNativeName(species: PokemonSpeciesData | undefined, locale?: Locale): string;
declare function extractLocalizedDisplayName(data: PokemonData, species: PokemonSpeciesData | undefined, locale?: Locale): string;
declare function mapStats(pokemon: PokemonData): PokemonDisplayData['stats'];
declare function selectFeaturedAbility(pokemon: PokemonData): PokemonFeaturedAbility | null;
declare function formatMoveLabel(name: string): string;
declare function selectSignatureMoves(data: PokemonData): PokemonSignatureMove[];
declare function createPokemonBundle(data: PokemonData, species: PokemonSpeciesData, alternateForms?: PokemonAlternateForm[]): PokemonBundle;
declare function classifyVariant(name: string): VariantClassification | null;
declare function mapDisplayData(bundle: PokemonBundle, locale: Locale, featuredAbilityOverride?: PokemonFeaturedAbility | null): PokemonDisplayData;
declare function mapGridEntry(bundle: PokemonBundle, locale: Locale): PokemonGridEntry;
declare function parsePokemon(bundle: PokemonBundle, options: PokemonParserOptions): PokemonParseResult;

type TypeChartEntry = {
    strongAgainst: string[];
    weakAgainst: string[];
    immuneTo: string[];
};
type TypeMatchup = {
    type: string;
    multiplier: number;
};
type OffensiveCoverageEntry = {
    type: string;
    sources: string[];
    multiplier: number;
};
declare const TYPE_CHART: Record<string, TypeChartEntry>;
declare function getTypeWeaknesses(pokemonTypes: string[]): string[];
declare function getTypeMatchups(pokemonTypes: string[]): {
    weaknesses: TypeMatchup[];
    resistances: TypeMatchup[];
    immunities: TypeMatchup[];
};
declare function getOffensiveCoverage(pokemonTypes: string[]): OffensiveCoverageEntry[];
declare function getCoverageTargets(attackType: string): string[];

export { Locale, type OffensiveCoverageEntry, PokemonAlternateForm, PokemonBundle, PokemonData, PokemonDetails, PokemonDisplayData, PokemonFeaturedAbility, PokemonGridEntry, type PokemonParseResult, type PokemonParserOptions, PokemonSignatureMove, PokemonSpeciesData, TYPE_CHART, type TypeChartEntry, type TypeMatchup, classifyVariant, createPokemonBundle, extractDescription, extractGenus, extractLocalizedDisplayName, extractNativeName, formatMoveLabel, formatPokemonId, formatPokemonName, getCoverageTargets, getOffensiveCoverage, getTypeMatchups, getTypeWeaknesses, mapDisplayData, mapGridEntry, mapStats, normalizeIdentifier, parsePokemon, selectFeaturedAbility, selectSignatureMoves };
