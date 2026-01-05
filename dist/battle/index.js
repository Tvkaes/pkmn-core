// src/battle/damage.ts
function getStatValue(stats, name) {
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
  const attackBase = getStatValue(attackerStats, attackStat);
  const defenseBase = getStatValue(defenderStats, defenseStat);
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
  const getStatValue2 = (name) => data.stats.find((s) => s.stat.name === name)?.base_stat ?? 0;
  const calculateStat = (base, isHp = false) => {
    const iv = 31;
    const ev = 0;
    if (isHp) {
      return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100 + level + 10);
    }
    return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100 + 5);
  };
  const hp = calculateStat(getStatValue2("hp"), true);
  return {
    id: `${data.name}-${Date.now()}`,
    species: data.name,
    level,
    types: data.types.map((t) => t.type.name),
    stats: {
      hp,
      attack: calculateStat(getStatValue2("attack")),
      defense: calculateStat(getStatValue2("defense")),
      specialAttack: calculateStat(getStatValue2("special-attack")),
      specialDefense: calculateStat(getStatValue2("special-defense")),
      speed: calculateStat(getStatValue2("speed"))
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

export { applyBoost, applyModifiers, calculateBaseDamage, calculateDamage, calculateKOChance, clampBoost, createBattlePokemon, createInitialBattleState, getTypeEffectiveness };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map