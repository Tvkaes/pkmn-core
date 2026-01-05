// Damage calculation utilities for battle simulation.
// Implements the standard Pokemon damage formula.

import type { PokemonStat, PokemonMoveData } from '../pokemon/types'

export interface DamageContext {
  level: number
  attackerStats: PokemonStat[]
  defenderStats: PokemonStat[]
  attackerTypes: string[]
  defenderTypes: string[]
  move: PokemonMoveData
  weather?: 'sun' | 'rain' | 'sand' | 'hail' | 'snow' | null
  terrain?: 'electric' | 'grassy' | 'psychic' | 'misty' | null
  isCritical?: boolean
  isStab?: boolean
  effectiveness?: number
  otherModifiers?: number
}

export interface DamageResult {
  min: number
  max: number
  average: number
  isCritical: boolean
  effectiveness: number
  isStab: boolean
}

function getStatValue(stats: PokemonStat[], name: string): number {
  return stats.find((stat) => stat.stat.name === name)?.base_stat ?? 0
}

function calculateStatAtLevel(base: number, level: number, iv = 31, ev = 0, nature = 1): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100 + 5) * nature
}

function calculateHpAtLevel(base: number, level: number, iv = 31, ev = 0): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100 + level + 10)
}

export function getTypeEffectiveness(
  moveType: string,
  defenderTypes: string[],
  typeChart: Record<string, { strongAgainst: string[]; weakAgainst: string[]; immuneTo: string[] }>
): number {
  let multiplier = 1
  const chart = typeChart[moveType.toLowerCase()]
  if (!chart) return multiplier

  for (const defType of defenderTypes) {
    const normalizedDefType = defType.toLowerCase()
    if (chart.strongAgainst.includes(normalizedDefType)) {
      multiplier *= 2
    } else if (chart.weakAgainst.includes(normalizedDefType)) {
      multiplier *= 0.5
    } else if (chart.immuneTo.includes(normalizedDefType)) {
      multiplier = 0
      break
    }
  }

  return multiplier
}

export function calculateBaseDamage(context: DamageContext): number {
  const { level, attackerStats, defenderStats, move } = context
  const isPhysical = move.damage_class?.name === 'physical'

  const attackStat = isPhysical ? 'attack' : 'special-attack'
  const defenseStat = isPhysical ? 'defense' : 'special-defense'

  const attackBase = getStatValue(attackerStats, attackStat)
  const defenseBase = getStatValue(defenderStats, defenseStat)

  const attack = calculateStatAtLevel(attackBase, level)
  const defense = calculateStatAtLevel(defenseBase, level)
  const power = move.power ?? 0

  if (power === 0 || defense === 0) return 0

  // Standard damage formula: ((2 * Level / 5 + 2) * Power * A/D) / 50 + 2
  const baseDamage = Math.floor(
    (Math.floor((2 * level) / 5 + 2) * power * attack) / defense / 50 + 2
  )

  return baseDamage
}

export function applyModifiers(
  baseDamage: number,
  context: DamageContext
): { min: number; max: number } {
  let damage = baseDamage

  // STAB
  const isStab =
    context.isStab ??
    context.attackerTypes.some(
      (t) => t.toLowerCase() === context.move.type?.name?.toLowerCase()
    )
  if (isStab) {
    damage = Math.floor(damage * 1.5)
  }

  // Type effectiveness
  const effectiveness = context.effectiveness ?? 1
  damage = Math.floor(damage * effectiveness)

  // Weather modifiers
  if (context.weather) {
    const moveType = context.move.type?.name?.toLowerCase()
    if (context.weather === 'sun' && moveType === 'fire') {
      damage = Math.floor(damage * 1.5)
    } else if (context.weather === 'sun' && moveType === 'water') {
      damage = Math.floor(damage * 0.5)
    } else if (context.weather === 'rain' && moveType === 'water') {
      damage = Math.floor(damage * 1.5)
    } else if (context.weather === 'rain' && moveType === 'fire') {
      damage = Math.floor(damage * 0.5)
    }
  }

  // Critical hit
  const critMultiplier = context.isCritical ? 1.5 : 1
  damage = Math.floor(damage * critMultiplier)

  // Other modifiers
  if (context.otherModifiers) {
    damage = Math.floor(damage * context.otherModifiers)
  }

  // Random factor (85-100%)
  const min = Math.floor(damage * 0.85)
  const max = damage

  return { min, max }
}

export function calculateDamage(context: DamageContext): DamageResult {
  const baseDamage = calculateBaseDamage(context)
  const { min, max } = applyModifiers(baseDamage, context)

  const isStab =
    context.isStab ??
    context.attackerTypes.some(
      (t) => t.toLowerCase() === context.move.type?.name?.toLowerCase()
    )

  return {
    min,
    max,
    average: Math.floor((min + max) / 2),
    isCritical: context.isCritical ?? false,
    effectiveness: context.effectiveness ?? 1,
    isStab,
  }
}

export function calculateKOChance(
  damage: DamageResult,
  defenderHp: number
): { ohko: number; twohko: number; threehko: number } {
  if (defenderHp <= 0) {
    return { ohko: 100, twohko: 100, threehko: 100 }
  }

  // Simplified KO chance calculation
  const ohko = damage.min >= defenderHp ? 100 : damage.max >= defenderHp ? 50 : 0
  const twohko = damage.min * 2 >= defenderHp ? 100 : damage.max * 2 >= defenderHp ? 75 : 0
  const threehko = damage.min * 3 >= defenderHp ? 100 : damage.max * 3 >= defenderHp ? 85 : 0

  return { ohko, twohko, threehko }
}
