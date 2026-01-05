// Engine adapter interface for battle simulation.
// Provides abstraction layer for different battle engine implementations.

import type { PokemonData, PokemonMoveData } from '../pokemon/types'
import type { DamageResult } from './damage'

export type BattleWeather = 'sun' | 'rain' | 'sand' | 'hail' | 'snow' | null
export type BattleTerrain = 'electric' | 'grassy' | 'psychic' | 'misty' | null

export interface BattlePokemon {
  id: string
  species: string
  level: number
  types: string[]
  stats: {
    hp: number
    attack: number
    defense: number
    specialAttack: number
    specialDefense: number
    speed: number
  }
  currentHp: number
  status: string | null
  ability: string
  item: string | null
  moves: string[]
  boosts: {
    attack: number
    defense: number
    specialAttack: number
    specialDefense: number
    speed: number
    accuracy: number
    evasion: number
  }
}

export interface BattleState {
  turn: number
  weather: BattleWeather
  weatherTurns: number
  terrain: BattleTerrain
  terrainTurns: number
  player1: {
    active: BattlePokemon | null
    team: BattlePokemon[]
  }
  player2: {
    active: BattlePokemon | null
    team: BattlePokemon[]
  }
}

export interface BattleAction {
  type: 'move' | 'switch' | 'item'
  player: 'player1' | 'player2'
  moveIndex?: number
  switchIndex?: number
  itemId?: string
}

export interface BattleEvent {
  type: 'damage' | 'heal' | 'status' | 'boost' | 'weather' | 'terrain' | 'switch' | 'faint'
  target: 'player1' | 'player2'
  data: Record<string, unknown>
}

export interface BattleEngineAdapter {
  initialize(team1: PokemonData[], team2: PokemonData[]): BattleState
  executeAction(state: BattleState, action: BattleAction): { state: BattleState; events: BattleEvent[] }
  calculateDamage(attacker: BattlePokemon, defender: BattlePokemon, move: PokemonMoveData, state: BattleState): DamageResult
  getValidActions(state: BattleState, player: 'player1' | 'player2'): BattleAction[]
  isGameOver(state: BattleState): { over: boolean; winner: 'player1' | 'player2' | 'draw' | null }
}

export function createBattlePokemon(data: PokemonData, level = 50): BattlePokemon {
  const getStatValue = (name: string): number =>
    data.stats.find((s) => s.stat.name === name)?.base_stat ?? 0

  const calculateStat = (base: number, isHp = false): number => {
    const iv = 31
    const ev = 0
    if (isHp) {
      return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100 + level + 10)
    }
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100 + 5)
  }

  const hp = calculateStat(getStatValue('hp'), true)

  return {
    id: `${data.name}-${Date.now()}`,
    species: data.name,
    level,
    types: data.types.map((t) => t.type.name),
    stats: {
      hp,
      attack: calculateStat(getStatValue('attack')),
      defense: calculateStat(getStatValue('defense')),
      specialAttack: calculateStat(getStatValue('special-attack')),
      specialDefense: calculateStat(getStatValue('special-defense')),
      speed: calculateStat(getStatValue('speed')),
    },
    currentHp: hp,
    status: null,
    ability: data.abilities[0]?.ability?.name ?? '',
    item: null,
    moves: data.moves.slice(0, 4).map((m) => m.move.name),
    boosts: {
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
      accuracy: 0,
      evasion: 0,
    },
  }
}

export function createInitialBattleState(team1: BattlePokemon[], team2: BattlePokemon[]): BattleState {
  return {
    turn: 0,
    weather: null,
    weatherTurns: 0,
    terrain: null,
    terrainTurns: 0,
    player1: {
      active: team1[0] ?? null,
      team: team1,
    },
    player2: {
      active: team2[0] ?? null,
      team: team2,
    },
  }
}

export function applyBoost(current: number, stages: number): number {
  const multipliers = [2 / 8, 2 / 7, 2 / 6, 2 / 5, 2 / 4, 2 / 3, 2 / 2, 3 / 2, 4 / 2, 5 / 2, 6 / 2, 7 / 2, 8 / 2]
  const index = Math.max(0, Math.min(12, stages + 6))
  const multiplier = multipliers[index] ?? 1
  return Math.floor(current * multiplier)
}

export function clampBoost(boost: number): number {
  return Math.max(-6, Math.min(6, boost))
}
