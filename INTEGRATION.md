# Integración de pkmn-core con la Pokédex

Esta guía detalla cómo migrar la Pokédex existente para usar `pkmn-core` sin romper la funcionalidad actual.

## Paso 1: Instalar pkmn-core

```bash
cd /path/to/Pokedex

# Opción A: Link local (desarrollo)
npm link ../pkmn-core

# Opción B: Instalar desde path local
npm install ../pkmn-core

# Opción C: Cuando se publique a npm
npm install pkmn-core
```

## Paso 2: Migrar Tipos

### Antes (`src/types/pokemon.types.ts`)
```typescript
export interface PokemonStat { ... }
export interface PokemonType { ... }
// ... todos los tipos
```

### Después
```typescript
// Re-exportar desde el core para mantener compatibilidad
export * from 'pkmn-core'

// O importar tipos específicos donde se necesiten
import type { PokemonData, PokemonDisplayData } from 'pkmn-core'
```

**Archivos a modificar:**
- `src/types/pokemon.types.ts` → Re-exportar desde pkmn-core
- `src/types/pokemon-details.types.ts` → Eliminar (ya está en el core)

## Paso 3: Migrar Helpers

### Antes (`src/utils/helpers.ts`)
```typescript
export function formatPokemonName(name: string): string { ... }
export function formatPokemonId(id: number): string { ... }
export function extractDescription(...) { ... }
export function mapStats(...) { ... }
export function selectFeaturedAbility(...) { ... }
```

### Después
```typescript
// src/utils/helpers.ts
export {
  formatPokemonName,
  formatPokemonId,
  extractDescription,
  extractGenus,
  extractNativeName,
  extractLocalizedDisplayName,
  mapStats,
  selectFeaturedAbility,
} from 'pkmn-core'
```

## Paso 4: Migrar Type Chart

### Antes (`src/data/type-chart.ts`)
```typescript
export const TYPE_CHART = { ... }
export function getTypeWeaknesses(...) { ... }
export function getTypeMatchups(...) { ... }
export function getOffensiveCoverage(...) { ... }
export function getCoverageTargets(...) { ... }
```

### Después
```typescript
// src/data/type-chart.ts
export {
  TYPE_CHART,
  getTypeWeaknesses,
  getTypeMatchups,
  getOffensiveCoverage,
  getCoverageTargets,
} from 'pkmn-core'
```

## Paso 5: Migrar pokemonService.ts

Este es el archivo más complejo. La estrategia es:
1. Mantener las funciones de fetch (dependen de `ofetch`)
2. Reemplazar la lógica de transformación con funciones del core

### Antes
```typescript
import { formatPokemonId, mapStats, ... } from '@/utils/helpers'

function classifyVariant(name: string) { ... }
function mapDisplayData(bundle, locale) { ... }
function mapGridEntry(bundle, locale) { ... }
```

### Después
```typescript
import {
  formatPokemonId,
  formatPokemonName,
  mapStats,
  selectFeaturedAbility,
  extractDescription,
  extractGenus,
  extractNativeName,
  extractLocalizedDisplayName,
  classifyVariant,
  mapDisplayData,
  mapGridEntry,
  createPokemonBundle,
  selectSignatureMoves,
} from 'pkmn-core'

// Mantener solo la lógica de fetch y orquestación
async function fetchPokemonBundle(identifier, locale) {
  const [data, species] = await Promise.all([
    fetchPokemon(identifier),
    fetchPokemonSpecies(identifier)
  ])
  const alternateForms = await extractAlternateForms(species, locale)
  return createPokemonBundle(data, species, alternateForms)
}

// mapDisplayData y mapGridEntry ahora vienen del core
export async function getPokemonDetails(identifier, locale = 'en') {
  const bundle = await fetchPokemonBundle(identifier, locale)
  const display = mapDisplayData(bundle, locale)
  // ...
}
```

## Paso 6: Migrar competitiveMovesService.ts

### Antes
```typescript
function determineBattleProfile(stats) { ... }
function scoreMove(move, pokemon, profile, weaknesses) { ... }
function buildSweeperSet(moves, profile) { ... }
// ... 500+ líneas
```

### Después
```typescript
import {
  determineBattleProfile,
  inferRoleWeights,
  getPrimaryRole,
  scoreMove,
  filterViableMoves,
  buildAllSets,
  getTypeWeaknesses,
} from 'pkmn-core'
import type { ScoringContext, MoveScore } from 'pkmn-core'

export async function generateCompetitiveMoveSets(identifier: string | number) {
  const pokemon = await fetchPokemon(identifier)
  const profile = determineBattleProfile(pokemon.stats)
  const pokemonTypes = pokemon.types.map((t) => t.type.name)
  const weaknesses = getTypeWeaknesses(pokemonTypes)
  
  // Fetch move details (mantener lógica de fetch)
  const candidateEntries = selectCandidateMoves(pokemon.moves)
  const moveDetails = await fetchMoveDetails(candidateEntries)
  
  // Scoring context para el core
  const context: ScoringContext = {
    pokemonTypes,
    offensiveBias: profile.offensiveBias,
    weaknessCoverage: weaknesses,
  }
  
  // Usar funciones del core
  const scored = moveDetails.map((move) => scoreMove(move, context))
  const viable = filterViableMoves(scored, 30)
  
  return buildAllSets(viable, profile)
}
```

## Paso 7: Migrar Constantes

### Antes (`src/utils/constants.ts`)
```typescript
export const API_BASE_URL = 'https://pokeapi.co/api/v2'
export const CACHE_MAX_AGE = 1000 * 60 * 60
export const STAT_LABELS = { ... }
```

### Después
```typescript
// Mantener constantes específicas de la UI
export const API_BASE_URL = 'https://pokeapi.co/api/v2'
export const DEFAULT_POKEMON = 'pikachu'
export const POPULAR_POKEMON = ['pikachu', 'charizard', ...]

// STAT_LABELS ya está integrado en mapStats del core
```

## Paso 8: Actualizar tsconfig.json

Agregar path alias para el core (opcional):

```json
{
  "compilerOptions": {
    "paths": {
      "pkmn-core": ["../pkmn-core/dist"],
      "pkmn-core/*": ["../pkmn-core/dist/*"]
    }
  }
}
```

## Archivos que se pueden ELIMINAR de la Pokédex

Una vez migrado, estos archivos son redundantes:

| Archivo | Razón |
|---------|-------|
| `src/data/type-chart.ts` | Reemplazado por `pkmn-core/pokemon/matchups` |
| `src/types/pokemon.types.ts` | Reemplazado por `pkmn-core/pokemon/types` |
| `src/types/pokemon-details.types.ts` | Incluido en types del core |

## Archivos que se SIMPLIFICAN

| Archivo | Cambio |
|---------|--------|
| `src/utils/helpers.ts` | Re-exportar desde core |
| `src/services/pokemonService.ts` | Solo mantener fetch, usar core para transformación |
| `src/services/competitiveMovesService.ts` | Solo mantener fetch, usar core para scoring/sets |

## Archivos que NO cambian

- Componentes Vue (`*.vue`)
- Stores Pinia (`src/stores/*`)
- Composables (`src/composables/*`)
- Estilos y assets
- Configuración (vite, tailwind, etc.)

## Ejemplo de Migración Incremental

Para migrar sin romper nada, hazlo en pasos pequeños:

### Semana 1: Tipos
1. Instalar pkmn-core
2. Actualizar `pokemon.types.ts` para re-exportar
3. Verificar que todo compila

### Semana 2: Helpers
1. Actualizar `helpers.ts` para re-exportar
2. Verificar que la UI funciona igual

### Semana 3: Type Chart
1. Actualizar `type-chart.ts` para re-exportar
2. Verificar matchups en la UI

### Semana 4: Services
1. Refactorizar `pokemonService.ts`
2. Refactorizar `competitiveMovesService.ts`
3. Testing completo

## Verificación

Después de cada paso, verificar:

```bash
# Compilación
npm run build

# Type checking
npm run typecheck

# Dev server
npm run dev
```

## Beneficios Post-Migración

1. **Menos código en la Pokédex** - ~2000 líneas menos
2. **Tipos compartidos** - Una sola fuente de verdad
3. **Lógica reutilizable** - El simulador puede usar el mismo core
4. **Testing más fácil** - Funciones puras sin dependencias
5. **Actualizaciones centralizadas** - Cambiar en un lugar, aplicar en todos
