// Move filtering and selection utilities for competitive set building.
// Provides reusable filters without coupling to specific set builders.

import type { MoveScore, MoveRoleTag } from './types'
import type { OffensiveBias } from '../pokemon/roles'

export interface MoveSelectionOptions {
  excluded?: Set<string>
  count?: number
  minPower?: number
}

function createExclusionSet(excluded?: Set<string>): Set<string> {
  return excluded ?? new Set()
}

export function pickByTag(
  moves: MoveScore[],
  tag: MoveRoleTag,
  options: MoveSelectionOptions = {}
): MoveScore[] {
  const { excluded, count = 1 } = options
  const exclusionSet = createExclusionSet(excluded)

  return moves
    .filter((move) => move.tags.includes(tag) && !exclusionSet.has(move.move.name))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
}

export function pickStrongStab(
  moves: MoveScore[],
  offensiveBias: OffensiveBias,
  options: MoveSelectionOptions = {}
): MoveScore[] {
  const { excluded, count = 2, minPower = 70 } = options
  const exclusionSet = createExclusionSet(excluded)

  const preferredClass = offensiveBias === 'mixed' ? null : offensiveBias

  return moves
    .filter((move) => {
      if (!move.isDamaging || !move.isStab || move.power < minPower) return false
      if (exclusionSet.has(move.move.name)) return false
      if (preferredClass && move.move.damage_class?.name !== preferredClass) return false
      return true
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
}

export function pickCoverageMoves(
  moves: MoveScore[],
  options: MoveSelectionOptions = {}
): MoveScore[] {
  const { excluded, count = 2, minPower = 70 } = options
  const exclusionSet = createExclusionSet(excluded)

  return moves
    .filter((move) => {
      if (!move.isDamaging || move.isStab) return false
      if (exclusionSet.has(move.move.name)) return false
      return move.tags.includes('coverage') || move.power >= minPower
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
}

export function pickRecoveryMove(
  moves: MoveScore[],
  options: MoveSelectionOptions = {}
): MoveScore | null {
  const { excluded } = options
  const exclusionSet = createExclusionSet(excluded)

  const candidates = moves
    .filter((move) => move.tags.includes('recovery') && !exclusionSet.has(move.move.name))
    .sort((a, b) => b.score - a.score)

  return candidates[0] ?? null
}

export function pickStatusMove(
  moves: MoveScore[],
  options: MoveSelectionOptions = {}
): MoveScore | null {
  const { excluded } = options
  const exclusionSet = createExclusionSet(excluded)

  const candidates = moves
    .filter((move) => move.tags.includes('status') && !exclusionSet.has(move.move.name))
    .sort((a, b) => b.score - a.score)

  return candidates[0] ?? null
}

export function pickUtilityMove(
  moves: MoveScore[],
  options: MoveSelectionOptions = {}
): MoveScore | null {
  const { excluded } = options
  const exclusionSet = createExclusionSet(excluded)

  const candidates = moves
    .filter((move) => move.tags.includes('utility') && !exclusionSet.has(move.move.name))
    .sort((a, b) => b.score - a.score)

  return candidates[0] ?? null
}

export function pickSetupMove(
  moves: MoveScore[],
  options: MoveSelectionOptions = {}
): MoveScore | null {
  const { excluded } = options
  const exclusionSet = createExclusionSet(excluded)

  const candidates = moves
    .filter((move) => move.tags.includes('setup') && !exclusionSet.has(move.move.name))
    .sort((a, b) => b.score - a.score)

  return candidates[0] ?? null
}

export function pickPriorityMove(
  moves: MoveScore[],
  options: MoveSelectionOptions = {}
): MoveScore | null {
  const { excluded } = options
  const exclusionSet = createExclusionSet(excluded)

  const candidates = moves
    .filter((move) => move.tags.includes('priority') && !exclusionSet.has(move.move.name))
    .sort((a, b) => b.score - a.score)

  return candidates[0] ?? null
}

export function pickBestDamagingMove(
  moves: MoveScore[],
  options: MoveSelectionOptions = {}
): MoveScore | null {
  const { excluded } = options
  const exclusionSet = createExclusionSet(excluded)

  const candidates = moves
    .filter((move) => move.isDamaging && !exclusionSet.has(move.move.name))
    .sort((a, b) => b.score - a.score)

  return candidates[0] ?? null
}

export function excludeMove(excluded: Set<string>, move: MoveScore | null): void {
  if (move) {
    excluded.add(move.move.name)
  }
}

export function excludeMoves(excluded: Set<string>, moves: MoveScore[]): void {
  for (const move of moves) {
    excluded.add(move.move.name)
  }
}
