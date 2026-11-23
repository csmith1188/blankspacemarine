/**
 * Pure scoring and Marine Rank calculation logic.
 * Zero DOM dependencies — portable to a future Node.js authoritative server.
 */

export const BASE_PUZZLE_POINTS = 500;
export const MAX_SPEED_BONUS = 400;
export const ZERO_MISTAKE_BONUS = 150;
export const BONUS_POINTS_POWERUP_VALUE = 250;
export const HINT_PENALTY = 120;

export const MARINE_RANKS = [
  { minScore: 0, title: 'Cadet', badge: 'CDT' },
  { minScore: 2500, title: 'Space Trooper', badge: 'TRP' },
  { minScore: 6000, title: 'Indent Sergeant', badge: 'SGT' },
  { minScore: 10000, title: 'Plasma Lieutenant', badge: 'LTN' },
  { minScore: 14500, title: 'PEP 8 Commander', badge: 'CMD' },
  { minScore: 19000, title: 'Grand Blank Space Marine', badge: 'BSM' }
];

/**
 * Calculates score breakdown for a cleared puzzle.
 */
export function calculatePuzzleScore({
  elapsedMs,
  parTimeMs,
  streak,
  mistakes,
  usedHint,
  bonusPointsCollected = false
}) {
  const safeElapsed = Math.max(500, Number(elapsedMs) || parTimeMs);
  const safePar = Math.max(5000, Number(parTimeMs) || 20000);

  // Speed bonus scales smoothly up to MAX_SPEED_BONUS when finishing under par
  const speedRatio = Math.max(0, Math.min(1, (safePar * 1.5 - safeElapsed) / (safePar * 1.2)));
  const speedBonus = Math.round(speedRatio * MAX_SPEED_BONUS);

  const cleanBonus = mistakes === 0 ? ZERO_MISTAKE_BONUS : 0;
  const bonusPickupPoints = bonusPointsCollected ? BONUS_POINTS_POWERUP_VALUE : 0;
  const multiplier = Number((1 + Math.min(streak, 8) * 0.15).toFixed(2));
  const hintPenalty = usedHint ? HINT_PENALTY : 0;

  const rawTotal =
    Math.round((BASE_PUZZLE_POINTS + speedBonus + cleanBonus) * multiplier) +
    bonusPickupPoints -
    hintPenalty;
  const total = Math.max(100, rawTotal);

  return {
    basePoints: BASE_PUZZLE_POINTS,
    speedBonus,
    cleanBonus,
    bonusPickupPoints,
    multiplier,
    hintPenalty,
    total,
    underPar: safeElapsed <= safePar
  };
}

export function getMarineRank(totalScore) {
  let rank = MARINE_RANKS[0];
  for (const candidate of MARINE_RANKS) {
    if (totalScore >= candidate.minScore) {
      rank = candidate;
    }
  }
  return rank;
}
