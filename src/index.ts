// pkmn-core - Pure TypeScript Pokemon logic library
// No UI, no frameworks, no DOM dependencies

// Pokemon module - types, parsing, matchups, roles
export * from './pokemon'

// Moves module - scoring, filtering, competitive sets
export * from './moves'

// Battle module - damage calculation, engine adapter
export * from './battle'

// Cache module - generic memory caching
export * from './cache'

// Version
export const VERSION = '0.1.1'
