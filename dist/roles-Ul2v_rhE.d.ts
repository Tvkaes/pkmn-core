import { P as PokemonStat } from './types-vH4NeBv4.js';

type OffensiveBias = 'physical' | 'special' | 'mixed';
interface BattleProfile {
    offensiveBias: OffensiveBias;
    speed: number;
    isSweeper: boolean;
    isTank: boolean;
    isWallbreaker: boolean;
    isSupport: boolean;
}
interface RoleWeights {
    sweeper: number;
    wallbreaker: number;
    tank: number;
    support: number;
}
declare function determineBattleProfile(stats: PokemonStat[]): BattleProfile;
declare function inferRoleWeights(stats: PokemonStat[]): RoleWeights;
declare function getPrimaryRole(stats: PokemonStat[]): keyof RoleWeights;
declare function getViableRoles(stats: PokemonStat[], threshold?: number): Array<keyof RoleWeights>;

export { type BattleProfile as B, type OffensiveBias as O, type RoleWeights as R, getViableRoles as a, determineBattleProfile as d, getPrimaryRole as g, inferRoleWeights as i };
