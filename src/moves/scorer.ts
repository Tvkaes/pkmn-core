// Extracted from Tvkaes/Pokedex src/services/competitiveMovesService.ts
// Provides move scoring logic without external dependencies.

import type { PokemonMoveData } from '../pokemon/types'
import type { MoveScore, MoveRoleTag, ScoringContext } from './types'
import { getCoverageTargets } from '../pokemon/matchups'

const STRONG_STAB_THRESHOLD = 70

const SETUP_BONUS: Record<string, number> = {
  'swords-dance': 60,
  'dragon-dance': 60,
  'nasty-plot': 60,
  'calm-mind': 45,
  'bulk-up': 45,
  'quiver-dance': 65,
  'shell-smash': 70,
  'shift-gear': 55,
  'coil': 50,
  'iron-defense': 35,
  'amnesia': 35,
  'agility': 40,
  'rock-polish': 40,
  'autotomize': 40,
  'growth': 35,
  'work-up': 30,
  'hone-claws': 35,
}

const UTILITY_MOVES: Record<string, { score: number; roleTag: MoveRoleTag }> = {
  'stealth-rock': { score: 70, roleTag: 'hazard' },
  'spikes': { score: 50, roleTag: 'hazard' },
  'toxic-spikes': { score: 45, roleTag: 'hazard' },
  'sticky-web': { score: 55, roleTag: 'hazard' },
  'defog': { score: 40, roleTag: 'removal' },
  'rapid-spin': { score: 40, roleTag: 'removal' },
  'court-change': { score: 35, roleTag: 'removal' },
  'taunt': { score: 30, roleTag: 'taunt' },
  'encore': { score: 35, roleTag: 'taunt' },
  'will-o-wisp': { score: 30, roleTag: 'status' },
  'toxic': { score: 30, roleTag: 'status' },
  'thunder-wave': { score: 25, roleTag: 'status' },
  'glare': { score: 28, roleTag: 'status' },
  'spore': { score: 50, roleTag: 'status' },
  'sleep-powder': { score: 35, roleTag: 'status' },
  'light-screen': { score: 35, roleTag: 'screen' },
  'reflect': { score: 35, roleTag: 'screen' },
  'aurora-veil': { score: 50, roleTag: 'screen' },
  'u-turn': { score: 25, roleTag: 'utility' },
  'volt-switch': { score: 25, roleTag: 'utility' },
  'flip-turn': { score: 25, roleTag: 'utility' },
  'parting-shot': { score: 30, roleTag: 'utility' },
  'teleport': { score: 20, roleTag: 'utility' },
  'trick': { score: 25, roleTag: 'utility' },
  'switcheroo': { score: 25, roleTag: 'utility' },
  'knock-off': { score: 35, roleTag: 'utility' },
}

const RELIABLE_RECOVERY_MOVES = new Set([
  'recover',
  'roost',
  'soft-boiled',
  'slack-off',
  'milk-drink',
  'wish',
  'synthesis',
  'moonlight',
  'morning-sun',
  'shore-up',
  'strength-sap',
  'heal-order',
  'oblivion-wing',
  'purify',
  'pollen-puff',
  'rest',
  'giga-drain',
  'drain-punch',
  'leech-life',
  'horn-leech',
  'draining-kiss',
  'parabolic-charge',
])

export function extractEnglishEffect(move: PokemonMoveData): string {
  const effectEntry = move.effect_entries?.find((entry) => entry.language.name === 'en')
  return effectEntry?.short_effect ?? ''
}

export function scoreMove(move: PokemonMoveData, context: ScoringContext): MoveScore | null {
  const typeName = move.type?.name ?? 'normal'
  const isStab = context.pokemonTypes.includes(typeName)
  const isDamaging = move.damage_class?.name !== 'status' && (move.power ?? 0) > 0
  const power = move.power ?? 0
  let totalScore = 0
  const tags: MoveRoleTag[] = []

  // Damaging move scoring
  if (isDamaging) {
    const accuracyFactor = move.accuracy ? move.accuracy / 100 : 0.85
    totalScore += power * accuracyFactor

    if (isStab) {
      totalScore += 25
      tags.push('stab')
    }

    // Bias alignment bonus
    const moveClass = move.damage_class?.name
    if (
      (context.offensiveBias === 'physical' && moveClass === 'physical') ||
      (context.offensiveBias === 'special' && moveClass === 'special')
    ) {
      totalScore += 10
    }

    // Priority bonus
    if (move.priority > 0) {
      totalScore += 25
      tags.push('priority')
    }

    // Drain/recoil handling
    if (move.meta?.drain) {
      if (move.meta.drain > 0) {
        totalScore += 15
        tags.push('drain')
      } else {
        totalScore -= 10
      }
    }
  }

  // Setup move bonus
  const setupBonus = SETUP_BONUS[move.name]
  if (setupBonus) {
    totalScore += setupBonus
    tags.push('setup')
  }

  // Utility move bonus
  const utilityEntry = UTILITY_MOVES[move.name]
  if (utilityEntry) {
    totalScore += utilityEntry.score
    tags.push(utilityEntry.roleTag)
    if (utilityEntry.roleTag !== 'utility') {
      tags.push('utility')
    }
  }

  // Recovery bonus
  if (RELIABLE_RECOVERY_MOVES.has(move.name) || (move.meta?.healing && move.meta.healing > 0)) {
    totalScore += 50
    if (!tags.includes('recovery')) {
      tags.push('recovery')
    }
  }

  // Leech Seed special case
  if (move.name === 'leech-seed') {
    totalScore += 35
    if (!tags.includes('recovery')) tags.push('recovery')
    if (!tags.includes('status')) tags.push('status')
  }

  // Coverage calculation
  const coverageTargets = getCoverageTargets(typeName).filter((target) =>
    context.weaknessCoverage.includes(target)
  )
  if (coverageTargets.length && isDamaging && !isStab) {
    totalScore += 15 + coverageTargets.length * 5
    tags.push('coverage')
  }

  if (totalScore <= 0) {
    return null
  }

  return {
    move,
    score: totalScore,
    tags,
    isDamaging,
    isStab,
    power,
    coverageTargets,
    englishEffect: extractEnglishEffect(move),
  }
}

export function filterViableMoves(scored: Array<MoveScore | null>, minScore = 30): MoveScore[] {
  return scored
    .filter((entry): entry is MoveScore => entry !== null && entry.score >= minScore)
    .sort((a, b) => b.score - a.score)
}

export function getMoveRoleTag(move: MoveScore): MoveRoleTag {
  if (move.tags.includes('setup')) return 'setup'
  if (move.tags.includes('recovery')) return 'recovery'
  if (move.tags.includes('hazard')) return 'hazard'
  if (move.tags.includes('removal')) return 'removal'
  if (move.tags.includes('taunt')) return 'taunt'
  if (move.tags.includes('status')) return 'status'
  if (move.tags.includes('screen')) return 'screen'
  if (move.tags.includes('coverage')) return 'coverage'
  if (move.tags.includes('priority')) return 'priority'
  if (move.tags.includes('stab')) return 'stab'
  return 'utility'
}

export function isStrongStab(move: MoveScore): boolean {
  return move.isDamaging && move.isStab && move.power >= STRONG_STAB_THRESHOLD
}
