import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'pokemon/index': 'src/pokemon/index.ts',
    'moves/index': 'src/moves/index.ts',
    'battle/index': 'src/battle/index.ts',
    'cache/index': 'src/cache/index.ts',
    'cache/memory': 'src/cache/memory.ts',
    'cache/storage': 'src/cache/storage.ts',
    'cache/swr': 'src/cache/swr.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  treeshake: true,
})
