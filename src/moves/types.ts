// Move-specific types for the scoring and filtering system.
// Separated from pokemon/types.ts to maintain clear module boundaries.

import type { PokemonMoveData } from '../pokemon/types'

export type MoveRoleTag =
  | 'stab'
  | 'coverage'
  | 'priority'
  | 'setup'
  | 'recovery'
  | 'drain'
  | 'hazard'
  | 'removal'
  | 'taunt'
  | 'status'
  | 'screen'
  | 'utility'

export interface MoveScore {
  move: PokemonMoveData
  score: number
  tags: MoveRoleTag[]
  isDamaging: boolean
  isStab: boolean
  power: number
  coverageTargets: string[]
  englishEffect: string
}

export interface ScoringContext {
  pokemonTypes: string[]
  offensiveBias: 'physical' | 'special' | 'mixed'
  weaknessCoverage: string[]
}

export interface MoveRecommendation {
  name: string
  type: string
  roleTag: MoveRoleTag | string
  reason: string
}

export interface CompetitiveSet {
  role: string
  moves: MoveRecommendation[]
}
