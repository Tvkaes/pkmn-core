// src/pokemon/parser.ts
var LANGUAGE_PREFERENCE = {
  en: ["en"],
  es: ["es", "es-la"],
  ja: ["ja-Hrkt", "ja"]
};
var REGIONAL_VARIANTS = [
  { keyword: "alola", region: "Alola" },
  { keyword: "galar", region: "Galar" },
  { keyword: "hisui", region: "Hisui" },
  { keyword: "paldea", region: "Paldea" }
];
var SPECIAL_VARIANT_KEYWORDS = [
  "attack",
  "defense",
  "speed",
  "school",
  "shield",
  "blade",
  "origin",
  "sky",
  "zen",
  "dawn",
  "dusk",
  "midnight",
  "sunny",
  "rainy",
  "snowy",
  "therian",
  "incarnate",
  "resolute",
  "pirouette",
  "trash",
  "sand",
  "average",
  "sensu",
  "pom-pom",
  "pau",
  "baile",
  "heat",
  "wash",
  "frost",
  "fan",
  "mow"
];
function normalizeIdentifier(identifier) {
  return String(identifier).toLowerCase();
}
function buildLanguagePriority(locale) {
  const primary = LANGUAGE_PREFERENCE[locale] ?? LANGUAGE_PREFERENCE.en;
  const fallback = LANGUAGE_PREFERENCE.en;
  const merged = [...primary, ...fallback];
  return Array.from(new Set(merged));
}
function findByLanguage(entries, locale) {
  if (!entries?.length) return void 0;
  const priorityOrder = buildLanguagePriority(locale);
  for (const code of priorityOrder) {
    const match = entries.find((item) => item.language?.name === code);
    if (match) {
      return match;
    }
  }
  return void 0;
}
function formatPokemonName(name) {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}
function formatPokemonId(id) {
  return `#${String(id).padStart(3, "0")}`;
}
function extractDescription(species, locale = "en") {
  const entry = findByLanguage(species?.flavor_text_entries, locale);
  if (!entry) return "";
  return entry.flavor_text.replace(/\f|\n|\r/g, " ").trim();
}
function extractGenus(species, locale = "en") {
  const genus = findByLanguage(species?.genera, locale);
  return genus?.genus ?? "";
}
function extractNativeName(species, locale = "en") {
  const entry = findByLanguage(species?.names, locale);
  if (entry?.name) return entry.name;
  if (locale === "ja") {
    const japanese = species?.names?.find((item) => item.language?.name === "ja-Hrkt");
    if (japanese?.name) return japanese.name;
  }
  return "";
}
function extractLocalizedDisplayName(data, species, locale = "en") {
  const localized = findByLanguage(species?.names, locale)?.name;
  if (localized) return localized;
  return formatPokemonName(data.name);
}
function mapStats(pokemon) {
  return pokemon.stats.map((stat) => {
    const labelMap = {
      hp: "HP",
      attack: "ATK",
      defense: "DEF",
      "special-attack": "SP. ATK",
      "special-defense": "SP. DEF",
      speed: "SPD"
    };
    const label = labelMap[stat.stat.name] ?? stat.stat.name.toUpperCase();
    const value = stat.base_stat;
    const percentage = Math.min(value / 255 * 100, 100);
    return { label, value, percentage };
  });
}
function selectFeaturedAbility(pokemon) {
  if (!pokemon.abilities?.length) return null;
  const preferred = pokemon.abilities.find((ability) => !ability.is_hidden) ?? pokemon.abilities[0];
  const slug = preferred?.ability?.name;
  if (!slug) return null;
  return {
    name: formatPokemonName(slug.replace("-", " ")),
    slug,
    isHidden: preferred.is_hidden
  };
}
function formatMoveLabel(name) {
  return name.split("-").map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join(" ");
}
function selectSignatureMoves(data) {
  if (!data.moves?.length) return [];
  const normalized = data.moves.map((entry) => {
    const primaryDetail = entry.version_group_details?.find((detail) => detail.move_learn_method?.name === "level-up") ?? entry.version_group_details?.[0];
    if (!primaryDetail) {
      return {
        name: formatMoveLabel(entry.move.name)
      };
    }
    return {
      name: formatMoveLabel(entry.move.name),
      level: primaryDetail.level_learned_at || void 0,
      method: primaryDetail.move_learn_method?.name ?? void 0,
      versionGroup: primaryDetail.version_group?.name ?? void 0
    };
  });
  return normalized.sort((a, b) => (b.level ?? 0) - (a.level ?? 0)).slice(0, 4);
}
function createPokemonBundle(data, species, alternateForms = []) {
  return { data, species, alternateForms };
}
function classifyVariant(name) {
  const normalized = name.toLowerCase();
  if (normalized.includes("mega")) {
    return { kind: "mega" };
  }
  if (normalized.includes("primal")) {
    return { kind: "primal" };
  }
  if (normalized.includes("gigantamax") || normalized.includes("gmax") || normalized.includes("dynamax") || normalized.includes("dmax")) {
    return { kind: "dynamax" };
  }
  const regionalMatch = REGIONAL_VARIANTS.find(({ keyword }) => normalized.includes(keyword));
  if (regionalMatch) {
    return {
      kind: "regional",
      region: regionalMatch.region
    };
  }
  if (SPECIAL_VARIANT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { kind: "special" };
  }
  return null;
}
function mapDisplayData(bundle, locale, featuredAbilityOverride) {
  const { data, species, alternateForms } = bundle;
  return {
    id: data.id,
    formattedId: formatPokemonId(data.id),
    name: extractLocalizedDisplayName(data, species, locale),
    nativeName: extractNativeName(species, "ja"),
    description: extractDescription(species, locale),
    genus: extractGenus(species, locale),
    stats: mapStats(data),
    types: data.types,
    abilities: data.abilities,
    featuredAbility: featuredAbilityOverride ?? selectFeaturedAbility(data),
    signatureMoves: selectSignatureMoves(data),
    height: data.height / 10,
    weight: data.weight / 10,
    sprite: data.sprites?.other?.["official-artwork"]?.front_default ?? data.sprites?.other?.home?.front_default ?? data.sprites?.front_default ?? "",
    spriteShiny: data.sprites?.other?.["official-artwork"]?.front_shiny ?? data.sprites?.other?.home?.front_shiny ?? data.sprites?.front_shiny ?? null,
    cryUrl: data.cries?.latest ?? data.cries?.legacy ?? void 0,
    hasMegaEvolution: alternateForms.length > 0,
    alternateForms
  };
}
function mapGridEntry(bundle, locale) {
  const { data, species, alternateForms } = bundle;
  return {
    id: data.id,
    formattedId: formatPokemonId(data.id),
    name: extractLocalizedDisplayName(data, species, locale),
    nativeName: extractNativeName(species, "ja"),
    sprite: data.sprites?.other?.["official-artwork"]?.front_default ?? data.sprites?.other?.home?.front_default ?? data.sprites?.front_default ?? "",
    primaryType: data.types?.[0]?.type?.name ?? "normal",
    hasMegaEvolution: alternateForms.length > 0,
    alternateForms: alternateForms.length ? alternateForms : void 0,
    cryUrl: data.cries?.latest ?? data.cries?.legacy ?? void 0
  };
}
function parsePokemon(bundle, options) {
  const display = mapDisplayData(bundle, options.locale, options.featuredAbilityOverride);
  const primaryType = bundle.data.types?.[0]?.type?.name ?? "normal";
  const details = {
    primaryType,
    raw: bundle.data,
    species: bundle.species,
    display
  };
  return {
    details,
    gridEntry: mapGridEntry(bundle, options.locale)
  };
}

// src/pokemon/matchups.ts
var TYPE_CHART = {
  normal: { strongAgainst: [], weakAgainst: ["rock", "steel"], immuneTo: ["ghost"] },
  fire: { strongAgainst: ["grass", "ice", "bug", "steel"], weakAgainst: ["fire", "water", "rock", "dragon"], immuneTo: [] },
  water: { strongAgainst: ["fire", "ground", "rock"], weakAgainst: ["water", "grass", "dragon"], immuneTo: [] },
  electric: { strongAgainst: ["water", "flying"], weakAgainst: ["electric", "grass", "dragon"], immuneTo: ["ground"] },
  grass: {
    strongAgainst: ["water", "ground", "rock"],
    weakAgainst: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
    immuneTo: []
  },
  ice: { strongAgainst: ["grass", "ground", "flying", "dragon"], weakAgainst: ["fire", "water", "ice", "steel"], immuneTo: [] },
  fighting: {
    strongAgainst: ["normal", "ice", "rock", "dark", "steel"],
    weakAgainst: ["poison", "flying", "psychic", "bug", "fairy"],
    immuneTo: ["ghost"]
  },
  poison: { strongAgainst: ["grass", "fairy"], weakAgainst: ["poison", "ground", "rock", "ghost"], immuneTo: ["steel"] },
  ground: { strongAgainst: ["fire", "electric", "poison", "rock", "steel"], weakAgainst: ["grass", "bug"], immuneTo: ["flying"] },
  flying: { strongAgainst: ["grass", "fighting", "bug"], weakAgainst: ["electric", "rock", "steel"], immuneTo: [] },
  psychic: { strongAgainst: ["fighting", "poison"], weakAgainst: ["psychic", "steel"], immuneTo: ["dark"] },
  bug: {
    strongAgainst: ["grass", "psychic", "dark"],
    weakAgainst: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
    immuneTo: []
  },
  rock: { strongAgainst: ["fire", "ice", "flying", "bug"], weakAgainst: ["fighting", "ground", "steel"], immuneTo: [] },
  ghost: { strongAgainst: ["psychic", "ghost"], weakAgainst: ["dark"], immuneTo: ["normal"] },
  dragon: { strongAgainst: ["dragon"], weakAgainst: ["steel"], immuneTo: ["fairy"] },
  dark: { strongAgainst: ["psychic", "ghost"], weakAgainst: ["fighting", "dark", "fairy"], immuneTo: [] },
  steel: { strongAgainst: ["ice", "rock", "fairy"], weakAgainst: ["fire", "water", "electric", "steel"], immuneTo: [] },
  fairy: { strongAgainst: ["fighting", "dragon", "dark"], weakAgainst: ["fire", "poison", "steel"], immuneTo: [] }
};
function calculateTypeMultipliers(pokemonTypes) {
  const multipliers = {};
  for (const attackingType of Object.keys(TYPE_CHART)) {
    let modifier = 1;
    for (const rawDefType of pokemonTypes) {
      const defType = rawDefType.toLowerCase();
      const chart = TYPE_CHART[attackingType];
      if (!chart) continue;
      if (chart.strongAgainst.includes(defType)) {
        modifier *= 2;
      } else if (chart.weakAgainst.includes(defType)) {
        modifier *= 0.5;
      } else if (chart.immuneTo.includes(defType)) {
        modifier = 0;
        break;
      }
    }
    multipliers[attackingType] = modifier;
  }
  return multipliers;
}
function getTypeWeaknesses(pokemonTypes) {
  const multipliers = calculateTypeMultipliers(pokemonTypes);
  return Object.entries(multipliers).filter(([, value]) => value > 1).map(([type]) => type);
}
function getTypeMatchups(pokemonTypes) {
  const normalizedTypes = pokemonTypes.map((type) => type.toLowerCase());
  const multipliers = calculateTypeMultipliers(normalizedTypes);
  const entries = Object.entries(multipliers).map(([type, multiplier]) => ({
    type,
    multiplier
  }));
  const weaknesses = entries.filter(({ multiplier }) => multiplier > 1).sort((a, b) => b.multiplier - a.multiplier);
  const resistances = entries.filter(({ multiplier }) => multiplier > 0 && multiplier < 1).sort((a, b) => a.multiplier - b.multiplier);
  const immunities = entries.filter(({ multiplier }) => multiplier === 0);
  return { weaknesses, resistances, immunities };
}
function getOffensiveCoverage(pokemonTypes) {
  const normalizedTypes = pokemonTypes.map((type) => type.toLowerCase());
  const coverage = {};
  for (const type of normalizedTypes) {
    const entry = TYPE_CHART[type];
    if (!entry) continue;
    for (const target of entry.strongAgainst) {
      if (!coverage[target]) {
        coverage[target] = /* @__PURE__ */ new Set();
      }
      coverage[target].add(type);
    }
  }
  return Object.entries(coverage).map(([type, sources]) => ({
    type,
    sources: Array.from(sources),
    multiplier: 2
  })).sort((a, b) => {
    if (b.sources.length === a.sources.length) {
      return a.type.localeCompare(b.type);
    }
    return b.sources.length - a.sources.length;
  });
}
function getCoverageTargets(attackType) {
  const entry = TYPE_CHART[attackType.toLowerCase()];
  if (!entry) return [];
  return entry.strongAgainst;
}

// src/pokemon/roles.ts
var BULK_THRESHOLD = 335;
var SWEEPER_SPEED_THRESHOLD = 100;
var WALLBREAKER_ATTACK_THRESHOLD = 120;
var SUPPORT_BULK_THRESHOLD = 300;
function getStatValue(stats, name) {
  return stats.find((stat) => stat.stat.name === name)?.base_stat ?? 0;
}
function calculateBulk(stats) {
  return getStatValue(stats, "hp") + getStatValue(stats, "defense") + getStatValue(stats, "special-defense");
}
function determineOffensiveBias(attack, specialAttack) {
  const difference = attack - specialAttack;
  if (difference > 15) return "physical";
  if (difference < -15) return "special";
  return "mixed";
}
function determineBattleProfile(stats) {
  const attack = getStatValue(stats, "attack");
  const specialAttack = getStatValue(stats, "special-attack");
  const speed = getStatValue(stats, "speed");
  const bulk = calculateBulk(stats);
  const offensiveBias = determineOffensiveBias(attack, specialAttack);
  const maxOffense = Math.max(attack, specialAttack);
  return {
    offensiveBias,
    speed,
    isSweeper: speed >= SWEEPER_SPEED_THRESHOLD,
    isTank: bulk >= BULK_THRESHOLD,
    isWallbreaker: maxOffense >= WALLBREAKER_ATTACK_THRESHOLD,
    isSupport: bulk >= SUPPORT_BULK_THRESHOLD && speed < SWEEPER_SPEED_THRESHOLD
  };
}
function inferRoleWeights(stats) {
  determineBattleProfile(stats);
  const attack = getStatValue(stats, "attack");
  const specialAttack = getStatValue(stats, "special-attack");
  const speed = getStatValue(stats, "speed");
  const bulk = calculateBulk(stats);
  const maxOffense = Math.max(attack, specialAttack);
  let sweeper = 0;
  let wallbreaker = 0;
  let tank = 0;
  let support = 0;
  if (speed >= 90) {
    sweeper += (speed - 90) * 1.5;
    sweeper += Math.max(0, maxOffense - 80) * 0.8;
  }
  if (maxOffense >= 100) {
    wallbreaker += (maxOffense - 100) * 2;
    if (speed < 80) wallbreaker += 20;
  }
  if (bulk >= 280) {
    tank += (bulk - 280) * 0.8;
    if (maxOffense >= 70) tank += 15;
  }
  if (bulk >= 260 && maxOffense < 110) {
    support += (bulk - 260) * 0.6;
    if (speed < 70) support += 10;
  }
  const total = sweeper + wallbreaker + tank + support || 1;
  return {
    sweeper: Math.round(sweeper / total * 100),
    wallbreaker: Math.round(wallbreaker / total * 100),
    tank: Math.round(tank / total * 100),
    support: Math.round(support / total * 100)
  };
}
function getPrimaryRole(stats) {
  const weights = inferRoleWeights(stats);
  const entries = Object.entries(weights);
  entries.sort((a, b) => b[1] - a[1]);
  const topEntry = entries[0];
  return topEntry ? topEntry[0] : "tank";
}
function getViableRoles(stats, threshold = 20) {
  const weights = inferRoleWeights(stats);
  return Object.entries(weights).filter(([, weight]) => weight >= threshold).sort((a, b) => b[1] - a[1]).map(([role]) => role);
}

export { TYPE_CHART, classifyVariant, createPokemonBundle, determineBattleProfile, extractDescription, extractGenus, extractLocalizedDisplayName, extractNativeName, formatMoveLabel, formatPokemonId, formatPokemonName, getCoverageTargets, getOffensiveCoverage, getPrimaryRole, getTypeMatchups, getTypeWeaknesses, getViableRoles, inferRoleWeights, mapDisplayData, mapGridEntry, mapStats, normalizeIdentifier, parsePokemon, selectFeaturedAbility, selectSignatureMoves };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map