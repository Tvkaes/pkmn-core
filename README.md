# pkmn-core

Pure TypeScript Pokemon logic library. No UI, no frameworks, no DOM dependencies.

Extracted from [Tvkaes/Pokedex](https://github.com/Tvkaes/Pokedex) to enable code reuse across the Pokédex UI and future battle simulators.

## Features

- **Pokemon Parsing** - Normalize PokeAPI data, extract localized names/descriptions, handle regional/mega/primal/dynamax forms
- **Type Matchups** - Complete type chart with weakness/resistance/immunity calculations and offensive coverage
- **Role Inference** - Determine competitive roles (sweeper, wallbreaker, tank, support) from base stats
- **Move Scoring** - Score moves for competitive viability with STAB, priority, coverage, and utility bonuses
- **Set Building** - Generate competitive movesets for different roles
- **Damage Calculation** - Standard Pokemon damage formula with modifiers
- **Battle Adapter** - Interface for battle engine implementations
- **Memory Cache** - Generic TTL-based caching utilities

## Installation

```bash
npm install pkmn-core
# or
pnpm add pkmn-core
```

## Usage

### Pokemon Parsing

```typescript
import { 
  createPokemonBundle, 
  parsePokemon, 
  formatPokemonName,
  formatPokemonId 
} from 'pkmn-core'

// Create a bundle from PokeAPI responses
const bundle = createPokemonBundle(pokemonData, speciesData, alternateForms)

// Parse into display-ready format
const { details, gridEntry } = parsePokemon(bundle, { locale: 'en' })

// Format helpers
formatPokemonName('charizard') // "Charizard"
formatPokemonId(6) // "#006"
```

### Type Matchups

```typescript
import { 
  getTypeMatchups, 
  getTypeWeaknesses, 
  getOffensiveCoverage,
  getCoverageTargets 
} from 'pkmn-core'

// Get full matchup breakdown
const matchups = getTypeMatchups(['fire', 'flying'])
// { weaknesses: [...], resistances: [...], immunities: [...] }

// Get weakness types only
const weaknesses = getTypeWeaknesses(['fire', 'flying'])
// ['rock', 'water', 'electric']

// Get offensive coverage
const coverage = getOffensiveCoverage(['fire', 'flying'])
// [{ type: 'grass', sources: ['fire', 'flying'], multiplier: 2 }, ...]

// Get what a single type hits super-effectively
getCoverageTargets('fire') // ['grass', 'ice', 'bug', 'steel']
```

### Role Inference

```typescript
import { 
  determineBattleProfile, 
  inferRoleWeights, 
  getPrimaryRole,
  getViableRoles 
} from 'pkmn-core'

// Get battle profile from stats
const profile = determineBattleProfile(pokemon.stats)
// { offensiveBias: 'physical', speed: 100, isSweeper: true, isTank: false, ... }

// Get role weights as percentages
const weights = inferRoleWeights(pokemon.stats)
// { sweeper: 45, wallbreaker: 30, tank: 15, support: 10 }

// Get primary role
const role = getPrimaryRole(pokemon.stats) // 'sweeper'

// Get all viable roles (above threshold)
const roles = getViableRoles(pokemon.stats, 20) // ['sweeper', 'wallbreaker']
```

### Move Scoring & Sets

```typescript
import { 
  scoreMove, 
  filterViableMoves, 
  buildAllSets,
  determineBattleProfile 
} from 'pkmn-core'

// Score individual moves
const context = {
  pokemonTypes: ['fire', 'flying'],
  offensiveBias: 'special',
  weaknessCoverage: ['rock', 'water', 'electric']
}

const scored = moves.map(move => scoreMove(move, context))
const viable = filterViableMoves(scored, 30)

// Build competitive sets
const profile = determineBattleProfile(pokemon.stats)
const sets = buildAllSets(viable, profile)
// { sweeper: [...], wallbreaker: [...], tank: [...], support: [...] }
```

### Damage Calculation

```typescript
import { calculateDamage, calculateKOChance } from 'pkmn-core'

const result = calculateDamage({
  level: 50,
  attackerStats: attacker.stats,
  defenderStats: defender.stats,
  attackerTypes: ['fire'],
  defenderTypes: ['grass'],
  move: flamethrower,
  weather: 'sun',
  effectiveness: 2
})
// { min: 180, max: 212, average: 196, isStab: true, effectiveness: 2 }

const ko = calculateKOChance(result, defenderHp)
// { ohko: 100, twohko: 100, threehko: 100 }
```

### Caching

```typescript
import { MemoryCache, createCache } from 'pkmn-core'

// Create a cache with 1 hour TTL
const cache = createCache<PokemonData>({ maxAge: 60 * 60 * 1000 })

cache.set('pikachu', data)
const cached = cache.get('pikachu')
```

## Module Imports

You can import from specific modules for smaller bundles:

```typescript
import { getTypeMatchups } from 'pkmn-core/pokemon'
import { scoreMove } from 'pkmn-core/moves'
import { calculateDamage } from 'pkmn-core/battle'
import { MemoryCache } from 'pkmn-core/cache'
```

## Integration with Pokédex

To migrate from local logic to pkmn-core in the Pokédex:

### 1. Install the package

```bash
cd path/to/Pokedex
npm install ../pkmn-core  # or publish to npm
```

### 2. Update imports in services

```typescript
// Before (in pokemonService.ts)
import { formatPokemonId, mapStats } from '@/utils/helpers'

// After
import { formatPokemonId, mapStats } from 'pkmn-core'
```

### 3. Replace type-chart.ts

```typescript
// Before
import { getTypeMatchups } from '@/data/type-chart'

// After
import { getTypeMatchups } from 'pkmn-core'
```

### 4. Replace competitive logic

```typescript
// Before
import { generateCompetitiveMoveSets } from '@/services/competitiveMovesService'

// After
import { 
  scoreMove, 
  filterViableMoves, 
  buildAllSets, 
  determineBattleProfile,
  getTypeWeaknesses 
} from 'pkmn-core'

// Then compose them with your fetch logic
```

## Architecture

```
pkmn-core/
├── src/
│   ├── pokemon/
│   │   ├── types.ts      # Shared domain models
│   │   ├── parser.ts     # PokeAPI normalization
│   │   ├── matchups.ts   # Type chart & calculations
│   │   ├── roles.ts      # Battle profile & role inference
│   │   └── index.ts
│   ├── moves/
│   │   ├── types.ts      # Move-specific types
│   │   ├── scorer.ts     # Move scoring logic
│   │   ├── filters.ts    # Move selection utilities
│   │   ├── sets.ts       # Competitive set builders
│   │   └── index.ts
│   ├── battle/
│   │   ├── damage.ts     # Damage formula
│   │   ├── engine-adapter.ts  # Battle engine interface
│   │   └── index.ts
│   ├── cache/
│   │   ├── memory.ts     # TTL-based memory cache
│   │   └── index.ts
│   └── index.ts          # Main barrel export
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Design Principles

1. **No framework dependencies** - Pure TypeScript, works anywhere
2. **Strict TypeScript** - Full type safety with `noUncheckedIndexedAccess`
3. **Pure functions** - No side effects, easy to test
4. **Tree-shakeable** - Import only what you need
5. **Extracted, not rewritten** - Logic comes from the working Pokédex

## License

MIT
