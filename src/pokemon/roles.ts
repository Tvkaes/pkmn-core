// Extracted from Tvkaes/Pokedex src/services/competitiveMovesService.ts
// Provides battle profile determination and role inference based on base stats.

import type { PokemonStat } from './types'

export type OffensiveBias = 'physical' | 'special' | 'mixed'

export interface BattleProfile {
  offensiveBias: OffensiveBias
  speed: number
  isSweeper: boolean
  isTank: boolean
  isWallbreaker: boolean
  isSupport: boolean
}

export interface RoleWeights {
  sweeper: number
  wallbreaker: number
  tank: number
  support: number
}

const BULK_THRESHOLD = 335
const SWEEPER_SPEED_THRESHOLD = 100
const WALLBREAKER_ATTACK_THRESHOLD = 120
const SUPPORT_BULK_THRESHOLD = 300

function getStatValue(stats: PokemonStat[], name: string): number {
  return stats.find((stat) => stat.stat.name === name)?.base_stat ?? 0
}

function calculateBulk(stats: PokemonStat[]): number {
  return (
    getStatValue(stats, 'hp') +
    getStatValue(stats, 'defense') +
    getStatValue(stats, 'special-defense')
  )
}

function determineOffensiveBias(attack: number, specialAttack: number): OffensiveBias {
  const difference = attack - specialAttack
  if (difference > 15) return 'physical'
  if (difference < -15) return 'special'
  return 'mixed'
}

export function determineBattleProfile(stats: PokemonStat[]): BattleProfile {
  const attack = getStatValue(stats, 'attack')
  const specialAttack = getStatValue(stats, 'special-attack')
  const speed = getStatValue(stats, 'speed')
  const bulk = calculateBulk(stats)

  const offensiveBias = determineOffensiveBias(attack, specialAttack)
  const maxOffense = Math.max(attack, specialAttack)

  return {
    offensiveBias,
    speed,
    isSweeper: speed >= SWEEPER_SPEED_THRESHOLD,
    isTank: bulk >= BULK_THRESHOLD,
    isWallbreaker: maxOffense >= WALLBREAKER_ATTACK_THRESHOLD,
    isSupport: bulk >= SUPPORT_BULK_THRESHOLD && speed < SWEEPER_SPEED_THRESHOLD,
  }
}

export function inferRoleWeights(stats: PokemonStat[]): RoleWeights {
  const profile = determineBattleProfile(stats)
  const attack = getStatValue(stats, 'attack')
  const specialAttack = getStatValue(stats, 'special-attack')
  const speed = getStatValue(stats, 'speed')
  const bulk = calculateBulk(stats)
  const maxOffense = Math.max(attack, specialAttack)

  let sweeper = 0
  let wallbreaker = 0
  let tank = 0
  let support = 0

  // Sweeper: high speed + decent offense
  if (speed >= 90) {
    sweeper += (speed - 90) * 1.5
    sweeper += Math.max(0, maxOffense - 80) * 0.8
  }

  // Wallbreaker: raw power regardless of speed
  if (maxOffense >= 100) {
    wallbreaker += (maxOffense - 100) * 2
    if (speed < 80) wallbreaker += 20 // slow wallbreakers get bonus
  }

  // Tank: bulk + some offense for longevity
  if (bulk >= 280) {
    tank += (bulk - 280) * 0.8
    if (maxOffense >= 70) tank += 15
  }

  // Support: bulk without high offense, utility-focused
  if (bulk >= 260 && maxOffense < 110) {
    support += (bulk - 260) * 0.6
    if (speed < 70) support += 10
  }

  // Normalize weights
  const total = sweeper + wallbreaker + tank + support || 1
  return {
    sweeper: Math.round((sweeper / total) * 100),
    wallbreaker: Math.round((wallbreaker / total) * 100),
    tank: Math.round((tank / total) * 100),
    support: Math.round((support / total) * 100),
  }
}

export function getPrimaryRole(stats: PokemonStat[]): keyof RoleWeights {
  const weights = inferRoleWeights(stats)
  const entries = Object.entries(weights) as Array<[keyof RoleWeights, number]>
  entries.sort((a, b) => b[1] - a[1])
  const topEntry = entries[0]
  return topEntry ? topEntry[0] : 'tank'
}

export function getViableRoles(stats: PokemonStat[], threshold = 20): Array<keyof RoleWeights> {
  const weights = inferRoleWeights(stats)
  return (Object.entries(weights) as Array<[keyof RoleWeights, number]>)
    .filter(([, weight]) => weight >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([role]) => role)
}
