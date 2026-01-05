import { P as PokemonStat, l as PokemonMoveData, m as PokemonData } from '../types-vH4NeBv4.js';

interface DamageContext {
    level: number;
    attackerStats: PokemonStat[];
    defenderStats: PokemonStat[];
    attackerTypes: string[];
    defenderTypes: string[];
    move: PokemonMoveData;
    weather?: 'sun' | 'rain' | 'sand' | 'hail' | 'snow' | null;
    terrain?: 'electric' | 'grassy' | 'psychic' | 'misty' | null;
    isCritical?: boolean;
    isStab?: boolean;
    effectiveness?: number;
    otherModifiers?: number;
}
interface DamageResult {
    min: number;
    max: number;
    average: number;
    isCritical: boolean;
    effectiveness: number;
    isStab: boolean;
}
declare function getTypeEffectiveness(moveType: string, defenderTypes: string[], typeChart: Record<string, {
    strongAgainst: string[];
    weakAgainst: string[];
    immuneTo: string[];
}>): number;
declare function calculateBaseDamage(context: DamageContext): number;
declare function applyModifiers(baseDamage: number, context: DamageContext): {
    min: number;
    max: number;
};
declare function calculateDamage(context: DamageContext): DamageResult;
declare function calculateKOChance(damage: DamageResult, defenderHp: number): {
    ohko: number;
    twohko: number;
    threehko: number;
};

type BattleWeather = 'sun' | 'rain' | 'sand' | 'hail' | 'snow' | null;
type BattleTerrain = 'electric' | 'grassy' | 'psychic' | 'misty' | null;
interface BattlePokemon {
    id: string;
    species: string;
    level: number;
    types: string[];
    stats: {
        hp: number;
        attack: number;
        defense: number;
        specialAttack: number;
        specialDefense: number;
        speed: number;
    };
    currentHp: number;
    status: string | null;
    ability: string;
    item: string | null;
    moves: string[];
    boosts: {
        attack: number;
        defense: number;
        specialAttack: number;
        specialDefense: number;
        speed: number;
        accuracy: number;
        evasion: number;
    };
}
interface BattleState {
    turn: number;
    weather: BattleWeather;
    weatherTurns: number;
    terrain: BattleTerrain;
    terrainTurns: number;
    player1: {
        active: BattlePokemon | null;
        team: BattlePokemon[];
    };
    player2: {
        active: BattlePokemon | null;
        team: BattlePokemon[];
    };
}
interface BattleAction {
    type: 'move' | 'switch' | 'item';
    player: 'player1' | 'player2';
    moveIndex?: number;
    switchIndex?: number;
    itemId?: string;
}
interface BattleEvent {
    type: 'damage' | 'heal' | 'status' | 'boost' | 'weather' | 'terrain' | 'switch' | 'faint';
    target: 'player1' | 'player2';
    data: Record<string, unknown>;
}
interface BattleEngineAdapter {
    initialize(team1: PokemonData[], team2: PokemonData[]): BattleState;
    executeAction(state: BattleState, action: BattleAction): {
        state: BattleState;
        events: BattleEvent[];
    };
    calculateDamage(attacker: BattlePokemon, defender: BattlePokemon, move: PokemonMoveData, state: BattleState): DamageResult;
    getValidActions(state: BattleState, player: 'player1' | 'player2'): BattleAction[];
    isGameOver(state: BattleState): {
        over: boolean;
        winner: 'player1' | 'player2' | 'draw' | null;
    };
}
declare function createBattlePokemon(data: PokemonData, level?: number): BattlePokemon;
declare function createInitialBattleState(team1: BattlePokemon[], team2: BattlePokemon[]): BattleState;
declare function applyBoost(current: number, stages: number): number;
declare function clampBoost(boost: number): number;

export { type BattleAction, type BattleEngineAdapter, type BattleEvent, type BattlePokemon, type BattleState, type BattleTerrain, type BattleWeather, type DamageContext, type DamageResult, applyBoost, applyModifiers, calculateBaseDamage, calculateDamage, calculateKOChance, clampBoost, createBattlePokemon, createInitialBattleState, getTypeEffectiveness };
