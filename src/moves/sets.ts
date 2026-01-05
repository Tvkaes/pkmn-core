// Competitive set builders for different roles.
// Uses scorer and filters to construct 4-move sets.

import type { MoveScore, MoveRecommendation, MoveRoleTag } from './types'
import type { BattleProfile } from '../pokemon/roles'
import {
  pickStrongStab,
  pickCoverageMoves,
  pickSetupMove,
  pickRecoveryMove,
  pickStatusMove,
  pickUtilityMove,
  pickByTag,
  pickBestDamagingMove,
  excludeMove,
  excludeMoves,
} from './filters'
import { getMoveRoleTag } from './scorer'

function buildReason(moveScore: MoveScore, roleTag: MoveRoleTag | string): string {
  const parts: string[] = []

  if (moveScore.isDamaging) {
    const accuracyLabel = moveScore.move.accuracy ? `${moveScore.move.accuracy}%` : 'variable'
    parts.push(`BP ${moveScore.power} (${accuracyLabel} acc)`)
  }

  if (moveScore.tags.includes('setup')) {
    parts.push('Immediate setup')
  }

  if (moveScore.tags.includes('priority')) {
    parts.push('Priority move')
  }

  if (moveScore.tags.includes('stab')) {
    parts.push('STAB bonus')
  }

  if (moveScore.coverageTargets.length) {
    parts.push(`Covers: ${moveScore.coverageTargets.slice(0, 3).join(', ')}`)
  }

  if (moveScore.tags.includes('recovery')) {
    parts.push('Reliable recovery')
  } else if (moveScore.tags.includes('drain')) {
    parts.push('HP drain')
  }

  if (moveScore.tags.includes('hazard')) {
    parts.push('Entry hazard')
  }

  if (moveScore.tags.includes('removal')) {
    parts.push('Hazard removal')
  }

  if (moveScore.tags.includes('taunt')) {
    parts.push('Blocks setup')
  }

  if (moveScore.tags.includes('status')) {
    parts.push('Status condition')
  }

  if (!parts.length && moveScore.englishEffect) {
    parts.push(moveScore.englishEffect.slice(0, 60))
  }

  parts.push(`Role: ${roleTag}`)
  return parts.join('. ')
}

function toRecommendation(move: MoveScore, roleTag?: MoveRoleTag | string): MoveRecommendation {
  const tag = roleTag ?? getMoveRoleTag(move)
  return {
    name: move.move.name,
    type: move.move.type?.name ?? 'normal',
    roleTag: tag,
    reason: buildReason(move, tag),
  }
}

export function buildSweeperSet(
  moves: MoveScore[],
  profile: BattleProfile
): MoveRecommendation[] {
  const selection: MoveRecommendation[] = []
  const excluded = new Set<string>()

  // 1. Setup move (optional but preferred)
  const setupMove = pickSetupMove(moves, { excluded })
  if (setupMove) {
    excludeMove(excluded, setupMove)
    selection.push(toRecommendation(setupMove, 'setup'))
  }

  // 2. Two STAB moves
  const stabMoves = pickStrongStab(moves, profile.offensiveBias, { excluded, count: 2 })
  if (stabMoves.length < 2) return []
  excludeMoves(excluded, stabMoves)
  stabMoves.forEach((m) => selection.push(toRecommendation(m, 'stab')))

  // 3. Coverage or priority finisher
  const slotsRemaining = 4 - selection.length
  if (slotsRemaining > 0) {
    const coverage = pickCoverageMoves(moves, { excluded, count: slotsRemaining })
    if (coverage.length) {
      excludeMoves(excluded, coverage)
      coverage.forEach((m) => selection.push(toRecommendation(m, 'coverage')))
    }
  }

  // Fill remaining with best available
  while (selection.length < 4) {
    const filler = pickBestDamagingMove(moves, { excluded })
    if (!filler) break
    excludeMove(excluded, filler)
    selection.push(toRecommendation(filler))
  }

  return selection.length === 4 ? selection : []
}

export function buildWallbreakerSet(
  moves: MoveScore[],
  profile: BattleProfile
): MoveRecommendation[] {
  const selection: MoveRecommendation[] = []
  const excluded = new Set<string>()

  // 1. Two strong STAB moves
  const stabMoves = pickStrongStab(moves, profile.offensiveBias, { excluded, count: 2 })
  if (stabMoves.length < 2) return []
  excludeMoves(excluded, stabMoves)
  stabMoves.forEach((m) => selection.push(toRecommendation(m, 'stab')))

  // 2. Two coverage moves
  const coverage = pickCoverageMoves(moves, { excluded, count: 2 })
  if (coverage.length < 2) {
    // Try to fill with any damaging moves
    const remaining = 2 - coverage.length
    excludeMoves(excluded, coverage)
    coverage.forEach((m) => selection.push(toRecommendation(m, 'coverage')))

    for (let i = 0; i < remaining; i++) {
      const filler = pickBestDamagingMove(moves, { excluded })
      if (!filler) return []
      excludeMove(excluded, filler)
      selection.push(toRecommendation(filler))
    }
  } else {
    excludeMoves(excluded, coverage)
    coverage.forEach((m) => selection.push(toRecommendation(m, 'coverage')))
  }

  return selection.length === 4 ? selection : []
}

export function buildTankSet(moves: MoveScore[]): MoveRecommendation[] {
  const selection: MoveRecommendation[] = []
  const excluded = new Set<string>()

  // 1. One STAB move
  const stab = moves
    .filter((m) => m.isDamaging && m.isStab && !excluded.has(m.move.name))
    .sort((a, b) => b.score - a.score)[0]
  if (!stab) return []
  excludeMove(excluded, stab)
  selection.push(toRecommendation(stab, 'stab'))

  // 2. Recovery move
  const recovery = pickRecoveryMove(moves, { excluded })
  if (!recovery) return []
  excludeMove(excluded, recovery)
  selection.push(toRecommendation(recovery, 'recovery'))

  // 3. Status move
  const status = pickStatusMove(moves, { excluded })
  if (!status) return []
  excludeMove(excluded, status)
  selection.push(toRecommendation(status, 'status'))

  // 4. Utility move
  const utility = pickUtilityMove(moves, { excluded })
  if (!utility) {
    // Fallback to any remaining move
    const fallback = pickBestDamagingMove(moves, { excluded })
    if (!fallback) return []
    excludeMove(excluded, fallback)
    selection.push(toRecommendation(fallback))
  } else {
    excludeMove(excluded, utility)
    selection.push(toRecommendation(utility, getMoveRoleTag(utility)))
  }

  return selection.length === 4 ? selection : []
}

export function buildSupportSet(moves: MoveScore[]): MoveRecommendation[] {
  const selection: MoveRecommendation[] = []
  const excluded = new Set<string>()

  const prioritizedTags: MoveRoleTag[] = ['hazard', 'removal', 'taunt', 'screen']

  for (const tag of prioritizedTags) {
    if (selection.length >= 4) break
    const candidates = pickByTag(moves, tag, { excluded, count: 1 })
    if (candidates.length) {
      excludeMoves(excluded, candidates)
      candidates.forEach((m) => selection.push(toRecommendation(m, tag)))
    }
  }

  // Fill with utility/status
  if (selection.length < 4) {
    const utilityMoves = moves
      .filter(
        (m) =>
          !excluded.has(m.move.name) &&
          (m.tags.includes('utility') || m.tags.includes('status'))
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 4 - selection.length)

    excludeMoves(excluded, utilityMoves)
    utilityMoves.forEach((m) => selection.push(toRecommendation(m)))
  }

  // Fill remaining with STAB
  if (selection.length < 4) {
    const stabMoves = moves
      .filter((m) => m.isStab && !excluded.has(m.move.name))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4 - selection.length)

    excludeMoves(excluded, stabMoves)
    stabMoves.forEach((m) => selection.push(toRecommendation(m, 'stab')))
  }

  return selection.length === 4 ? selection : []
}

export interface CompetitiveSets {
  sweeper: MoveRecommendation[]
  wallbreaker: MoveRecommendation[]
  tank: MoveRecommendation[]
  support: MoveRecommendation[]
}

export function buildAllSets(
  moves: MoveScore[],
  profile: BattleProfile
): CompetitiveSets {
  return {
    sweeper: buildSweeperSet(moves, profile),
    wallbreaker: buildWallbreakerSet(moves, profile),
    tank: profile.isTank ? buildTankSet(moves) : [],
    support: buildSupportSet(moves),
  }
}
