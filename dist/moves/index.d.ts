import { l as PokemonMoveData } from '../types-vH4NeBv4.js';
import { O as OffensiveBias, B as BattleProfile } from '../roles-Ul2v_rhE.js';

type MoveRoleTag = 'stab' | 'coverage' | 'priority' | 'setup' | 'recovery' | 'drain' | 'hazard' | 'removal' | 'taunt' | 'status' | 'screen' | 'utility';
interface MoveScore {
    move: PokemonMoveData;
    score: number;
    tags: MoveRoleTag[];
    isDamaging: boolean;
    isStab: boolean;
    power: number;
    coverageTargets: string[];
    englishEffect: string;
}
interface ScoringContext {
    pokemonTypes: string[];
    offensiveBias: 'physical' | 'special' | 'mixed';
    weaknessCoverage: string[];
}
interface MoveRecommendation {
    name: string;
    type: string;
    roleTag: MoveRoleTag | string;
    reason: string;
}
interface CompetitiveSet {
    role: string;
    moves: MoveRecommendation[];
}

declare function extractEnglishEffect(move: PokemonMoveData): string;
declare function scoreMove(move: PokemonMoveData, context: ScoringContext): MoveScore | null;
declare function filterViableMoves(scored: Array<MoveScore | null>, minScore?: number): MoveScore[];
declare function getMoveRoleTag(move: MoveScore): MoveRoleTag;
declare function isStrongStab(move: MoveScore): boolean;

interface MoveSelectionOptions {
    excluded?: Set<string>;
    count?: number;
    minPower?: number;
}
declare function pickByTag(moves: MoveScore[], tag: MoveRoleTag, options?: MoveSelectionOptions): MoveScore[];
declare function pickStrongStab(moves: MoveScore[], offensiveBias: OffensiveBias, options?: MoveSelectionOptions): MoveScore[];
declare function pickCoverageMoves(moves: MoveScore[], options?: MoveSelectionOptions): MoveScore[];
declare function pickRecoveryMove(moves: MoveScore[], options?: MoveSelectionOptions): MoveScore | null;
declare function pickStatusMove(moves: MoveScore[], options?: MoveSelectionOptions): MoveScore | null;
declare function pickUtilityMove(moves: MoveScore[], options?: MoveSelectionOptions): MoveScore | null;
declare function pickSetupMove(moves: MoveScore[], options?: MoveSelectionOptions): MoveScore | null;
declare function pickPriorityMove(moves: MoveScore[], options?: MoveSelectionOptions): MoveScore | null;
declare function pickBestDamagingMove(moves: MoveScore[], options?: MoveSelectionOptions): MoveScore | null;
declare function excludeMove(excluded: Set<string>, move: MoveScore | null): void;
declare function excludeMoves(excluded: Set<string>, moves: MoveScore[]): void;

declare function buildSweeperSet(moves: MoveScore[], profile: BattleProfile): MoveRecommendation[];
declare function buildWallbreakerSet(moves: MoveScore[], profile: BattleProfile): MoveRecommendation[];
declare function buildTankSet(moves: MoveScore[]): MoveRecommendation[];
declare function buildSupportSet(moves: MoveScore[]): MoveRecommendation[];
interface CompetitiveSets {
    sweeper: MoveRecommendation[];
    wallbreaker: MoveRecommendation[];
    tank: MoveRecommendation[];
    support: MoveRecommendation[];
}
declare function buildAllSets(moves: MoveScore[], profile: BattleProfile): CompetitiveSets;

export { type CompetitiveSet, type CompetitiveSets, type MoveRecommendation, type MoveRoleTag, type MoveScore, type MoveSelectionOptions, type ScoringContext, buildAllSets, buildSupportSet, buildSweeperSet, buildTankSet, buildWallbreakerSet, excludeMove, excludeMoves, extractEnglishEffect, filterViableMoves, getMoveRoleTag, isStrongStab, pickBestDamagingMove, pickByTag, pickCoverageMoves, pickPriorityMove, pickRecoveryMove, pickSetupMove, pickStatusMove, pickStrongStab, pickUtilityMove, scoreMove };
