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

// src/moves/scorer.ts
var STRONG_STAB_THRESHOLD = 70;
var SETUP_BONUS = {
  "swords-dance": 60,
  "dragon-dance": 60,
  "nasty-plot": 60,
  "calm-mind": 45,
  "bulk-up": 45,
  "quiver-dance": 65,
  "shell-smash": 70,
  "shift-gear": 55,
  "coil": 50,
  "iron-defense": 35,
  "amnesia": 35,
  "agility": 40,
  "rock-polish": 40,
  "autotomize": 40,
  "growth": 35,
  "work-up": 30,
  "hone-claws": 35
};
var UTILITY_MOVES = {
  "stealth-rock": { score: 70, roleTag: "hazard" },
  "spikes": { score: 50, roleTag: "hazard" },
  "toxic-spikes": { score: 45, roleTag: "hazard" },
  "sticky-web": { score: 55, roleTag: "hazard" },
  "defog": { score: 40, roleTag: "removal" },
  "rapid-spin": { score: 40, roleTag: "removal" },
  "court-change": { score: 35, roleTag: "removal" },
  "taunt": { score: 30, roleTag: "taunt" },
  "encore": { score: 35, roleTag: "taunt" },
  "will-o-wisp": { score: 30, roleTag: "status" },
  "toxic": { score: 30, roleTag: "status" },
  "thunder-wave": { score: 25, roleTag: "status" },
  "glare": { score: 28, roleTag: "status" },
  "spore": { score: 50, roleTag: "status" },
  "sleep-powder": { score: 35, roleTag: "status" },
  "light-screen": { score: 35, roleTag: "screen" },
  "reflect": { score: 35, roleTag: "screen" },
  "aurora-veil": { score: 50, roleTag: "screen" },
  "u-turn": { score: 25, roleTag: "utility" },
  "volt-switch": { score: 25, roleTag: "utility" },
  "flip-turn": { score: 25, roleTag: "utility" },
  "parting-shot": { score: 30, roleTag: "utility" },
  "teleport": { score: 20, roleTag: "utility" },
  "trick": { score: 25, roleTag: "utility" },
  "switcheroo": { score: 25, roleTag: "utility" },
  "knock-off": { score: 35, roleTag: "utility" }
};
var RELIABLE_RECOVERY_MOVES = /* @__PURE__ */ new Set([
  "recover",
  "roost",
  "soft-boiled",
  "slack-off",
  "milk-drink",
  "wish",
  "synthesis",
  "moonlight",
  "morning-sun",
  "shore-up",
  "strength-sap",
  "heal-order",
  "oblivion-wing",
  "purify",
  "pollen-puff",
  "rest",
  "giga-drain",
  "drain-punch",
  "leech-life",
  "horn-leech",
  "draining-kiss",
  "parabolic-charge"
]);
function extractEnglishEffect(move) {
  const effectEntry = move.effect_entries?.find((entry) => entry.language.name === "en");
  return effectEntry?.short_effect ?? "";
}
function scoreMove(move, context) {
  const typeName = move.type?.name ?? "normal";
  const isStab = context.pokemonTypes.includes(typeName);
  const isDamaging = move.damage_class?.name !== "status" && (move.power ?? 0) > 0;
  const power = move.power ?? 0;
  let totalScore = 0;
  const tags = [];
  if (isDamaging) {
    const accuracyFactor = move.accuracy ? move.accuracy / 100 : 0.85;
    totalScore += power * accuracyFactor;
    if (isStab) {
      totalScore += 25;
      tags.push("stab");
    }
    const moveClass = move.damage_class?.name;
    if (context.offensiveBias === "physical" && moveClass === "physical" || context.offensiveBias === "special" && moveClass === "special") {
      totalScore += 10;
    }
    if (move.priority > 0) {
      totalScore += 25;
      tags.push("priority");
    }
    if (move.meta?.drain) {
      if (move.meta.drain > 0) {
        totalScore += 15;
        tags.push("drain");
      } else {
        totalScore -= 10;
      }
    }
  }
  const setupBonus = SETUP_BONUS[move.name];
  if (setupBonus) {
    totalScore += setupBonus;
    tags.push("setup");
  }
  const utilityEntry = UTILITY_MOVES[move.name];
  if (utilityEntry) {
    totalScore += utilityEntry.score;
    tags.push(utilityEntry.roleTag);
    if (utilityEntry.roleTag !== "utility") {
      tags.push("utility");
    }
  }
  if (RELIABLE_RECOVERY_MOVES.has(move.name) || move.meta?.healing && move.meta.healing > 0) {
    totalScore += 50;
    if (!tags.includes("recovery")) {
      tags.push("recovery");
    }
  }
  if (move.name === "leech-seed") {
    totalScore += 35;
    if (!tags.includes("recovery")) tags.push("recovery");
    if (!tags.includes("status")) tags.push("status");
  }
  const coverageTargets = getCoverageTargets(typeName).filter(
    (target) => context.weaknessCoverage.includes(target)
  );
  if (coverageTargets.length && isDamaging && !isStab) {
    totalScore += 15 + coverageTargets.length * 5;
    tags.push("coverage");
  }
  if (totalScore <= 0) {
    return null;
  }
  return {
    move,
    score: totalScore,
    tags,
    isDamaging,
    isStab,
    power,
    coverageTargets,
    englishEffect: extractEnglishEffect(move)
  };
}
function filterViableMoves(scored, minScore = 30) {
  return scored.filter((entry) => entry !== null && entry.score >= minScore).sort((a, b) => b.score - a.score);
}
function getMoveRoleTag(move) {
  if (move.tags.includes("setup")) return "setup";
  if (move.tags.includes("recovery")) return "recovery";
  if (move.tags.includes("hazard")) return "hazard";
  if (move.tags.includes("removal")) return "removal";
  if (move.tags.includes("taunt")) return "taunt";
  if (move.tags.includes("status")) return "status";
  if (move.tags.includes("screen")) return "screen";
  if (move.tags.includes("coverage")) return "coverage";
  if (move.tags.includes("priority")) return "priority";
  if (move.tags.includes("stab")) return "stab";
  return "utility";
}
function isStrongStab(move) {
  return move.isDamaging && move.isStab && move.power >= STRONG_STAB_THRESHOLD;
}

// src/moves/filters.ts
function createExclusionSet(excluded) {
  return excluded ?? /* @__PURE__ */ new Set();
}
function pickByTag(moves, tag, options = {}) {
  const { excluded, count = 1 } = options;
  const exclusionSet = createExclusionSet(excluded);
  return moves.filter((move) => move.tags.includes(tag) && !exclusionSet.has(move.move.name)).sort((a, b) => b.score - a.score).slice(0, count);
}
function pickStrongStab(moves, offensiveBias, options = {}) {
  const { excluded, count = 2, minPower = 70 } = options;
  const exclusionSet = createExclusionSet(excluded);
  const preferredClass = offensiveBias === "mixed" ? null : offensiveBias;
  return moves.filter((move) => {
    if (!move.isDamaging || !move.isStab || move.power < minPower) return false;
    if (exclusionSet.has(move.move.name)) return false;
    if (preferredClass && move.move.damage_class?.name !== preferredClass) return false;
    return true;
  }).sort((a, b) => b.score - a.score).slice(0, count);
}
function pickCoverageMoves(moves, options = {}) {
  const { excluded, count = 2, minPower = 70 } = options;
  const exclusionSet = createExclusionSet(excluded);
  return moves.filter((move) => {
    if (!move.isDamaging || move.isStab) return false;
    if (exclusionSet.has(move.move.name)) return false;
    return move.tags.includes("coverage") || move.power >= minPower;
  }).sort((a, b) => b.score - a.score).slice(0, count);
}
function pickRecoveryMove(moves, options = {}) {
  const { excluded } = options;
  const exclusionSet = createExclusionSet(excluded);
  const candidates = moves.filter((move) => move.tags.includes("recovery") && !exclusionSet.has(move.move.name)).sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}
function pickStatusMove(moves, options = {}) {
  const { excluded } = options;
  const exclusionSet = createExclusionSet(excluded);
  const candidates = moves.filter((move) => move.tags.includes("status") && !exclusionSet.has(move.move.name)).sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}
function pickUtilityMove(moves, options = {}) {
  const { excluded } = options;
  const exclusionSet = createExclusionSet(excluded);
  const candidates = moves.filter((move) => move.tags.includes("utility") && !exclusionSet.has(move.move.name)).sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}
function pickSetupMove(moves, options = {}) {
  const { excluded } = options;
  const exclusionSet = createExclusionSet(excluded);
  const candidates = moves.filter((move) => move.tags.includes("setup") && !exclusionSet.has(move.move.name)).sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}
function pickPriorityMove(moves, options = {}) {
  const { excluded } = options;
  const exclusionSet = createExclusionSet(excluded);
  const candidates = moves.filter((move) => move.tags.includes("priority") && !exclusionSet.has(move.move.name)).sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}
function pickBestDamagingMove(moves, options = {}) {
  const { excluded } = options;
  const exclusionSet = createExclusionSet(excluded);
  const candidates = moves.filter((move) => move.isDamaging && !exclusionSet.has(move.move.name)).sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}
function excludeMove(excluded, move) {
  if (move) {
    excluded.add(move.move.name);
  }
}
function excludeMoves(excluded, moves) {
  for (const move of moves) {
    excluded.add(move.move.name);
  }
}

// src/moves/sets.ts
function buildReason(moveScore, roleTag) {
  const parts = [];
  if (moveScore.isDamaging) {
    const accuracyLabel = moveScore.move.accuracy ? `${moveScore.move.accuracy}%` : "variable";
    parts.push(`BP ${moveScore.power} (${accuracyLabel} acc)`);
  }
  if (moveScore.tags.includes("setup")) {
    parts.push("Immediate setup");
  }
  if (moveScore.tags.includes("priority")) {
    parts.push("Priority move");
  }
  if (moveScore.tags.includes("stab")) {
    parts.push("STAB bonus");
  }
  if (moveScore.coverageTargets.length) {
    parts.push(`Covers: ${moveScore.coverageTargets.slice(0, 3).join(", ")}`);
  }
  if (moveScore.tags.includes("recovery")) {
    parts.push("Reliable recovery");
  } else if (moveScore.tags.includes("drain")) {
    parts.push("HP drain");
  }
  if (moveScore.tags.includes("hazard")) {
    parts.push("Entry hazard");
  }
  if (moveScore.tags.includes("removal")) {
    parts.push("Hazard removal");
  }
  if (moveScore.tags.includes("taunt")) {
    parts.push("Blocks setup");
  }
  if (moveScore.tags.includes("status")) {
    parts.push("Status condition");
  }
  if (!parts.length && moveScore.englishEffect) {
    parts.push(moveScore.englishEffect.slice(0, 60));
  }
  parts.push(`Role: ${roleTag}`);
  return parts.join(". ");
}
function toRecommendation(move, roleTag) {
  const tag = roleTag ?? getMoveRoleTag(move);
  return {
    name: move.move.name,
    type: move.move.type?.name ?? "normal",
    roleTag: tag,
    reason: buildReason(move, tag)
  };
}
function buildSweeperSet(moves, profile) {
  const selection = [];
  const excluded = /* @__PURE__ */ new Set();
  const setupMove = pickSetupMove(moves, { excluded });
  if (setupMove) {
    excludeMove(excluded, setupMove);
    selection.push(toRecommendation(setupMove, "setup"));
  }
  const stabMoves = pickStrongStab(moves, profile.offensiveBias, { excluded, count: 2 });
  if (stabMoves.length < 2) return [];
  excludeMoves(excluded, stabMoves);
  stabMoves.forEach((m) => selection.push(toRecommendation(m, "stab")));
  const slotsRemaining = 4 - selection.length;
  if (slotsRemaining > 0) {
    const coverage = pickCoverageMoves(moves, { excluded, count: slotsRemaining });
    if (coverage.length) {
      excludeMoves(excluded, coverage);
      coverage.forEach((m) => selection.push(toRecommendation(m, "coverage")));
    }
  }
  while (selection.length < 4) {
    const filler = pickBestDamagingMove(moves, { excluded });
    if (!filler) break;
    excludeMove(excluded, filler);
    selection.push(toRecommendation(filler));
  }
  return selection.length === 4 ? selection : [];
}
function buildWallbreakerSet(moves, profile) {
  const selection = [];
  const excluded = /* @__PURE__ */ new Set();
  const stabMoves = pickStrongStab(moves, profile.offensiveBias, { excluded, count: 2 });
  if (stabMoves.length < 2) return [];
  excludeMoves(excluded, stabMoves);
  stabMoves.forEach((m) => selection.push(toRecommendation(m, "stab")));
  const coverage = pickCoverageMoves(moves, { excluded, count: 2 });
  if (coverage.length < 2) {
    const remaining = 2 - coverage.length;
    excludeMoves(excluded, coverage);
    coverage.forEach((m) => selection.push(toRecommendation(m, "coverage")));
    for (let i = 0; i < remaining; i++) {
      const filler = pickBestDamagingMove(moves, { excluded });
      if (!filler) return [];
      excludeMove(excluded, filler);
      selection.push(toRecommendation(filler));
    }
  } else {
    excludeMoves(excluded, coverage);
    coverage.forEach((m) => selection.push(toRecommendation(m, "coverage")));
  }
  return selection.length === 4 ? selection : [];
}
function buildTankSet(moves) {
  const selection = [];
  const excluded = /* @__PURE__ */ new Set();
  const stab = moves.filter((m) => m.isDamaging && m.isStab && !excluded.has(m.move.name)).sort((a, b) => b.score - a.score)[0];
  if (!stab) return [];
  excludeMove(excluded, stab);
  selection.push(toRecommendation(stab, "stab"));
  const recovery = pickRecoveryMove(moves, { excluded });
  if (!recovery) return [];
  excludeMove(excluded, recovery);
  selection.push(toRecommendation(recovery, "recovery"));
  const status = pickStatusMove(moves, { excluded });
  if (!status) return [];
  excludeMove(excluded, status);
  selection.push(toRecommendation(status, "status"));
  const utility = pickUtilityMove(moves, { excluded });
  if (!utility) {
    const fallback = pickBestDamagingMove(moves, { excluded });
    if (!fallback) return [];
    excludeMove(excluded, fallback);
    selection.push(toRecommendation(fallback));
  } else {
    excludeMove(excluded, utility);
    selection.push(toRecommendation(utility, getMoveRoleTag(utility)));
  }
  return selection.length === 4 ? selection : [];
}
function buildSupportSet(moves) {
  const selection = [];
  const excluded = /* @__PURE__ */ new Set();
  const prioritizedTags = ["hazard", "removal", "taunt", "screen"];
  for (const tag of prioritizedTags) {
    if (selection.length >= 4) break;
    const candidates = pickByTag(moves, tag, { excluded, count: 1 });
    if (candidates.length) {
      excludeMoves(excluded, candidates);
      candidates.forEach((m) => selection.push(toRecommendation(m, tag)));
    }
  }
  if (selection.length < 4) {
    const utilityMoves = moves.filter(
      (m) => !excluded.has(m.move.name) && (m.tags.includes("utility") || m.tags.includes("status"))
    ).sort((a, b) => b.score - a.score).slice(0, 4 - selection.length);
    excludeMoves(excluded, utilityMoves);
    utilityMoves.forEach((m) => selection.push(toRecommendation(m)));
  }
  if (selection.length < 4) {
    const stabMoves = moves.filter((m) => m.isStab && !excluded.has(m.move.name)).sort((a, b) => b.score - a.score).slice(0, 4 - selection.length);
    excludeMoves(excluded, stabMoves);
    stabMoves.forEach((m) => selection.push(toRecommendation(m, "stab")));
  }
  return selection.length === 4 ? selection : [];
}
function buildAllSets(moves, profile) {
  return {
    sweeper: buildSweeperSet(moves, profile),
    wallbreaker: buildWallbreakerSet(moves, profile),
    tank: profile.isTank ? buildTankSet(moves) : [],
    support: buildSupportSet(moves)
  };
}

// src/battle/damage.ts
function getStatValue2(stats, name) {
  return stats.find((stat) => stat.stat.name === name)?.base_stat ?? 0;
}
function calculateStatAtLevel(base, level, iv = 31, ev = 0, nature = 1) {
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100 + 5) * nature;
}
function getTypeEffectiveness(moveType, defenderTypes, typeChart) {
  let multiplier = 1;
  const chart = typeChart[moveType.toLowerCase()];
  if (!chart) return multiplier;
  for (const defType of defenderTypes) {
    const normalizedDefType = defType.toLowerCase();
    if (chart.strongAgainst.includes(normalizedDefType)) {
      multiplier *= 2;
    } else if (chart.weakAgainst.includes(normalizedDefType)) {
      multiplier *= 0.5;
    } else if (chart.immuneTo.includes(normalizedDefType)) {
      multiplier = 0;
      break;
    }
  }
  return multiplier;
}
function calculateBaseDamage(context) {
  const { level, attackerStats, defenderStats, move } = context;
  const isPhysical = move.damage_class?.name === "physical";
  const attackStat = isPhysical ? "attack" : "special-attack";
  const defenseStat = isPhysical ? "defense" : "special-defense";
  const attackBase = getStatValue2(attackerStats, attackStat);
  const defenseBase = getStatValue2(defenderStats, defenseStat);
  const attack = calculateStatAtLevel(attackBase, level);
  const defense = calculateStatAtLevel(defenseBase, level);
  const power = move.power ?? 0;
  if (power === 0 || defense === 0) return 0;
  const baseDamage = Math.floor(
    Math.floor(2 * level / 5 + 2) * power * attack / defense / 50 + 2
  );
  return baseDamage;
}
function applyModifiers(baseDamage, context) {
  let damage = baseDamage;
  const isStab = context.isStab ?? context.attackerTypes.some(
    (t) => t.toLowerCase() === context.move.type?.name?.toLowerCase()
  );
  if (isStab) {
    damage = Math.floor(damage * 1.5);
  }
  const effectiveness = context.effectiveness ?? 1;
  damage = Math.floor(damage * effectiveness);
  if (context.weather) {
    const moveType = context.move.type?.name?.toLowerCase();
    if (context.weather === "sun" && moveType === "fire") {
      damage = Math.floor(damage * 1.5);
    } else if (context.weather === "sun" && moveType === "water") {
      damage = Math.floor(damage * 0.5);
    } else if (context.weather === "rain" && moveType === "water") {
      damage = Math.floor(damage * 1.5);
    } else if (context.weather === "rain" && moveType === "fire") {
      damage = Math.floor(damage * 0.5);
    }
  }
  const critMultiplier = context.isCritical ? 1.5 : 1;
  damage = Math.floor(damage * critMultiplier);
  if (context.otherModifiers) {
    damage = Math.floor(damage * context.otherModifiers);
  }
  const min = Math.floor(damage * 0.85);
  const max = damage;
  return { min, max };
}
function calculateDamage(context) {
  const baseDamage = calculateBaseDamage(context);
  const { min, max } = applyModifiers(baseDamage, context);
  const isStab = context.isStab ?? context.attackerTypes.some(
    (t) => t.toLowerCase() === context.move.type?.name?.toLowerCase()
  );
  return {
    min,
    max,
    average: Math.floor((min + max) / 2),
    isCritical: context.isCritical ?? false,
    effectiveness: context.effectiveness ?? 1,
    isStab
  };
}
function calculateKOChance(damage, defenderHp) {
  if (defenderHp <= 0) {
    return { ohko: 100, twohko: 100, threehko: 100 };
  }
  const ohko = damage.min >= defenderHp ? 100 : damage.max >= defenderHp ? 50 : 0;
  const twohko = damage.min * 2 >= defenderHp ? 100 : damage.max * 2 >= defenderHp ? 75 : 0;
  const threehko = damage.min * 3 >= defenderHp ? 100 : damage.max * 3 >= defenderHp ? 85 : 0;
  return { ohko, twohko, threehko };
}

// src/battle/engine-adapter.ts
function createBattlePokemon(data, level = 50) {
  const getStatValue3 = (name) => data.stats.find((s) => s.stat.name === name)?.base_stat ?? 0;
  const calculateStat = (base, isHp = false) => {
    const iv = 31;
    const ev = 0;
    if (isHp) {
      return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100 + level + 10);
    }
    return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100 + 5);
  };
  const hp = calculateStat(getStatValue3("hp"), true);
  return {
    id: `${data.name}-${Date.now()}`,
    species: data.name,
    level,
    types: data.types.map((t) => t.type.name),
    stats: {
      hp,
      attack: calculateStat(getStatValue3("attack")),
      defense: calculateStat(getStatValue3("defense")),
      specialAttack: calculateStat(getStatValue3("special-attack")),
      specialDefense: calculateStat(getStatValue3("special-defense")),
      speed: calculateStat(getStatValue3("speed"))
    },
    currentHp: hp,
    status: null,
    ability: data.abilities[0]?.ability?.name ?? "",
    item: null,
    moves: data.moves.slice(0, 4).map((m) => m.move.name),
    boosts: {
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
      accuracy: 0,
      evasion: 0
    }
  };
}
function createInitialBattleState(team1, team2) {
  return {
    turn: 0,
    weather: null,
    weatherTurns: 0,
    terrain: null,
    terrainTurns: 0,
    player1: {
      active: team1[0] ?? null,
      team: team1
    },
    player2: {
      active: team2[0] ?? null,
      team: team2
    }
  };
}
function applyBoost(current, stages) {
  const multipliers = [2 / 8, 2 / 7, 2 / 6, 2 / 5, 2 / 4, 2 / 3, 2 / 2, 3 / 2, 4 / 2, 5 / 2, 6 / 2, 7 / 2, 8 / 2];
  const index = Math.max(0, Math.min(12, stages + 6));
  const multiplier = multipliers[index] ?? 1;
  return Math.floor(current * multiplier);
}
function clampBoost(boost) {
  return Math.max(-6, Math.min(6, boost));
}

// src/cache/memory.ts
var CACHE_PRESETS = {
  // For truly static data (pokemon stats, types, etc)
  STATIC: { maxAge: 1e3 * 60 * 60 * 24 * 7, staleAge: 1e3 * 60 * 60 * 24 * 30 },
  // 7 days fresh, 30 days stale
  // For semi-static data (species info, forms)
  SEMI_STATIC: { maxAge: 1e3 * 60 * 60 * 24, staleAge: 1e3 * 60 * 60 * 24 * 7 },
  // 1 day fresh, 7 days stale
  // For session-only caching
  SESSION: { maxAge: 1e3 * 60 * 60, staleAge: 1e3 * 60 * 60 * 4 }
  // 1 hour fresh, 4 hours stale
};
var DEFAULT_MAX_AGE = CACHE_PRESETS.STATIC.maxAge;
var DEFAULT_STALE_AGE = CACHE_PRESETS.STATIC.staleAge;
var DEFAULT_MAX_SIZE = 1e3;
var MemoryCache = class {
  constructor(options = {}) {
    this.cache = /* @__PURE__ */ new Map();
    this.maxAge = options.maxAge ?? DEFAULT_MAX_AGE;
    this.staleAge = options.staleAge ?? DEFAULT_STALE_AGE;
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  }
  getEntryStatus(entry) {
    if (!entry) return "expired";
    const age = Date.now() - entry.timestamp;
    if (age < this.maxAge) return "fresh";
    if (age < this.staleAge) return "stale";
    return "expired";
  }
  evictOldest() {
    if (this.cache.size < this.maxSize) return;
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  get(key) {
    const result = this.getWithStatus(key);
    return result?.data;
  }
  getWithStatus(key) {
    const entry = this.cache.get(key);
    const status = this.getEntryStatus(entry);
    if (status === "expired") {
      if (entry) this.cache.delete(key);
      return void 0;
    }
    return {
      data: entry.data,
      isStale: status === "stale"
    };
  }
  // Get stale data even if expired (for stale-while-revalidate)
  getStale(key) {
    const entry = this.cache.get(key);
    return entry?.data;
  }
  set(key, data) {
    this.evictOldest();
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  has(key) {
    return this.get(key) !== void 0;
  }
  delete(key) {
    return this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }
  size() {
    return this.cache.size;
  }
  keys() {
    return Array.from(this.cache.keys());
  }
};
function createCache(options) {
  return new MemoryCache(options);
}
function withCache(cache, keyFn, fetchFn) {
  return async (...args) => {
    const key = keyFn(args);
    const cached = cache.get(key);
    if (cached !== void 0) {
      return cached;
    }
    const data = await fetchFn(...args);
    cache.set(key, data);
    return data;
  };
}

// src/cache/storage.ts
var localStorageAdapter = {
  async getItem(key) {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  },
  async keys() {
    if (typeof localStorage === "undefined") return [];
    return Object.keys(localStorage);
  },
  async clear() {
    if (typeof localStorage === "undefined") return;
    localStorage.clear();
  }
};
function createIndexedDBAdapter(dbName, storeName) {
  let dbPromise = null;
  function getDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB not available"));
        return;
      }
      const request = indexedDB.open(dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
    });
    return dbPromise;
  }
  return {
    async getItem(key) {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result ?? null);
      });
    },
    async setItem(key, value) {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.put(value, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    },
    async removeItem(key) {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    },
    async keys() {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.getAllKeys();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result.map(String));
      });
    },
    async clear() {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
  };
}
var PersistentCache = class {
  constructor(options = {}) {
    this.memoryCache = /* @__PURE__ */ new Map();
    this.prefix = options.prefix ?? "pkmn-cache:";
    this.storage = options.storage ?? localStorageAdapter;
    this.maxAge = options.maxAge ?? CACHE_PRESETS.STATIC.maxAge;
    this.staleAge = options.staleAge ?? CACHE_PRESETS.STATIC.staleAge;
    this.maxSize = options.maxSize ?? 500;
  }
  getStorageKey(key) {
    return `${this.prefix}${key}`;
  }
  getEntryStatus(entry) {
    if (!entry) return "expired";
    const age = Date.now() - entry.timestamp;
    if (age < this.maxAge) return "fresh";
    if (age < this.staleAge) return "stale";
    return "expired";
  }
  async get(key) {
    const result = await this.getWithStatus(key);
    return result?.data;
  }
  async getWithStatus(key) {
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      const status = this.getEntryStatus(memEntry);
      if (status !== "expired") {
        return { data: memEntry.data, isStale: status === "stale" };
      }
    }
    try {
      const stored = await this.storage.getItem(this.getStorageKey(key));
      if (!stored) return void 0;
      const entry = JSON.parse(stored);
      const status = this.getEntryStatus(entry);
      if (status === "expired") {
        await this.storage.removeItem(this.getStorageKey(key));
        return void 0;
      }
      this.memoryCache.set(key, entry);
      return { data: entry.data, isStale: status === "stale" };
    } catch {
      return void 0;
    }
  }
  async getStale(key) {
    const memEntry = this.memoryCache.get(key);
    if (memEntry) return memEntry.data;
    try {
      const stored = await this.storage.getItem(this.getStorageKey(key));
      if (!stored) return void 0;
      const entry = JSON.parse(stored);
      return entry.data;
    } catch {
      return void 0;
    }
  }
  async set(key, data) {
    const entry = { data, timestamp: Date.now() };
    this.memoryCache.set(key, entry);
    if (this.memoryCache.size > this.maxSize) {
      const keys = Array.from(this.memoryCache.keys());
      const oldest = keys[0];
      if (oldest) this.memoryCache.delete(oldest);
    }
    try {
      await this.storage.setItem(this.getStorageKey(key), JSON.stringify(entry));
    } catch {
    }
  }
  async delete(key) {
    this.memoryCache.delete(key);
    try {
      await this.storage.removeItem(this.getStorageKey(key));
      return true;
    } catch {
      return false;
    }
  }
  async clear() {
    this.memoryCache.clear();
    try {
      const keys = await this.storage.keys();
      const prefixedKeys = keys.filter((k) => k.startsWith(this.prefix));
      await Promise.all(prefixedKeys.map((k) => this.storage.removeItem(k)));
    } catch {
    }
  }
  has(key) {
    return this.memoryCache.has(key);
  }
  size() {
    return this.memoryCache.size;
  }
};
function createPersistentCache(options) {
  return new PersistentCache(options);
}
function createIndexedDBCache(dbName = "pkmn-core", storeName = "cache", options) {
  return new PersistentCache({
    ...options,
    storage: createIndexedDBAdapter(dbName, storeName)
  });
}

// src/cache/swr.ts
var SWRCache = class {
  constructor(cache, options = {}) {
    this.inflight = /* @__PURE__ */ new Map();
    this.lastFetch = /* @__PURE__ */ new Map();
    this.cache = cache;
    this.dedupe = options.dedupe ?? true;
    this.dedupeInterval = options.dedupeInterval ?? 2e3;
    this.onError = options.onError;
    this.onSuccess = options.onSuccess;
  }
  shouldDedupe(key) {
    if (!this.dedupe) return false;
    const last = this.lastFetch.get(key);
    if (!last) return false;
    return Date.now() - last < this.dedupeInterval;
  }
  async get(key, fetcher) {
    const cached = await this.cache.getWithStatus(key);
    if (cached && !cached.isStale) {
      return cached.data;
    }
    const inflight = this.inflight.get(key);
    if (inflight) {
      if (cached) return cached.data;
      return inflight;
    }
    if (this.shouldDedupe(key)) {
      const stale = await this.cache.getStale(key);
      if (stale !== void 0) return stale;
    }
    const fetchPromise = this.fetch(key, fetcher, !!cached);
    if (cached) {
      fetchPromise.catch(() => {
      });
      return cached.data;
    }
    return fetchPromise;
  }
  async fetch(key, fetcher, isRevalidation) {
    this.lastFetch.set(key, Date.now());
    const promise = fetcher();
    this.inflight.set(key, promise);
    try {
      const data = await promise;
      await this.cache.set(key, data);
      this.onSuccess?.(data, key, isRevalidation);
      return data;
    } catch (error) {
      this.onError?.(error, key);
      throw error;
    } finally {
      this.inflight.delete(key);
    }
  }
  async revalidate(key, fetcher) {
    return this.fetch(key, fetcher, true);
  }
  async mutate(key, data) {
    await this.cache.set(key, data);
  }
  isValidating(key) {
    return this.inflight.has(key);
  }
};
function createSWR(cache, options) {
  const defaultCache = new MemoryCache(CACHE_PRESETS.STATIC);
  return new SWRCache(cache ?? defaultCache, options);
}
function createPersistentSWR(cache, options) {
  return new SWRCache(cache, options);
}
function createPokeAPIFetcher(baseUrl, cache, options) {
  const swr = createSWR(cache, options);
  return async (endpoint) => {
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
    const key = url;
    return swr.get(key, async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    });
  };
}

// src/index.ts
var VERSION = "0.1.2";

export { CACHE_PRESETS, MemoryCache, PersistentCache, SWRCache, TYPE_CHART, VERSION, applyBoost, applyModifiers, buildAllSets, buildSupportSet, buildSweeperSet, buildTankSet, buildWallbreakerSet, calculateBaseDamage, calculateDamage, calculateKOChance, clampBoost, classifyVariant, createBattlePokemon, createCache, createIndexedDBAdapter, createIndexedDBCache, createInitialBattleState, createPersistentCache, createPersistentSWR, createPokeAPIFetcher, createPokemonBundle, createSWR, determineBattleProfile, excludeMove, excludeMoves, extractDescription, extractEnglishEffect, extractGenus, extractLocalizedDisplayName, extractNativeName, filterViableMoves, formatMoveLabel, formatPokemonId, formatPokemonName, getCoverageTargets, getMoveRoleTag, getOffensiveCoverage, getPrimaryRole, getTypeEffectiveness, getTypeMatchups, getTypeWeaknesses, getViableRoles, inferRoleWeights, isStrongStab, localStorageAdapter, mapDisplayData, mapGridEntry, mapStats, normalizeIdentifier, parsePokemon, pickBestDamagingMove, pickByTag, pickCoverageMoves, pickPriorityMove, pickRecoveryMove, pickSetupMove, pickStatusMove, pickStrongStab, pickUtilityMove, scoreMove, selectFeaturedAbility, selectSignatureMoves, withCache };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map