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
function getCoverageTargets(attackType) {
  const entry = TYPE_CHART[attackType.toLowerCase()];
  if (!entry) return [];
  return entry.strongAgainst;
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

export { buildAllSets, buildSupportSet, buildSweeperSet, buildTankSet, buildWallbreakerSet, excludeMove, excludeMoves, extractEnglishEffect, filterViableMoves, getMoveRoleTag, isStrongStab, pickBestDamagingMove, pickByTag, pickCoverageMoves, pickPriorityMove, pickRecoveryMove, pickSetupMove, pickStatusMove, pickStrongStab, pickUtilityMove, scoreMove };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map