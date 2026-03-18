// ─── LEVEL SYSTEM ─────────────────────────────────────────────────
// 40 levels per exercise, grouped in stages of 5.
// To unlock stage N+1, all exercises must reach level N*5.
// Passing a level = meet accuracy% across 3 consecutive rounds.

const STAGE_SIZE = 5;
const MAX_LEVEL  = 40;

// Interpolate a value from start to end over 40 levels
function lerp(start, end, level) {
  return Math.round(start + (end - start) * ((level - 1) / (MAX_LEVEL - 1)));
}

// ── PERIPHERAL FLASH levels ──────────────────────────────────────
function pfLevel(n) {
  // Rounds: random between 15-20 for levels 1-19
  // Levels 20-40: random between 15-25, capped at 25
  const minRounds = 15;
  const maxRounds = n >= 20 ? 25 : 20;
  const rounds = minRounds + Math.floor(Math.random() * (maxRounds - minRounds + 1));

  // Min distance from centre: lerp from 22% (level 1) to 65% (level 40)
  const minDistPct = parseFloat((0.22 + (0.65 - 0.22) * ((n - 1) / 39)).toFixed(3));

  return {
    level:        n,
    rounds,
    minDistPct,
    dotLifetime:  lerp(1400, 550, n),
    passAccuracy: lerp(60, 90, n),
    label:        levelLabel(n)
  };
}

// ── ARROW REACTION levels ────────────────────────────────────────
function arLevel(n) {
  const totalArrows = lerp(2, 16, n);
  // Rounds vary between 12-20, capped at 20
  const rounds = Math.min(20, lerp(12, 20, n));
  // From level 10+, arrows appear anywhere in the box (scattered)
  // Below level 10 they appear in a neat centred cluster
  const scattered = n >= 10;
  return {
    level:        n,
    rounds,
    totalArrows,
    scattered,
    expireTime:   lerp(2800, 900, n),
    minDelay:     lerp(900, 250, n),
    maxDelay:     lerp(1800, 700, n),
    passAccuracy: lerp(60, 90, n),
    label:        levelLabel(n)
  };
}


// ── NUMBER SCATTER levels ────────────────────────────────────────
function nsLevel(n) {
  // number pool gets bigger & includes multi-digit, order becomes random mid-way
  const count    = lerp(10, 25, n);
  const ordered  = n <= 10;                   // ordered only for first 10 levels
  const maxDigit = n <= 10 ? 2 : n <= 25 ? 3 : 3; // 1-2 digit → includes 3 digit
  return {
    level:        n,
    count,
    ordered,
    maxDigit,
    passAccuracy: lerp(60, 90, n),            // accuracy = % found without mistakes
    timeLimit:    lerp(90, 40, n),            // seconds to complete (stricter)
    label:        levelLabel(n)
  };
}

function levelLabel(n) {
  if (n <= 8)  return 'Beginner';
  if (n <= 16) return 'Easy';
  if (n <= 24) return 'Intermediate';
  if (n <= 32) return 'Advanced';
  return 'Elite';
}

function levelColour(n) {
  if (n <= 8)  return '#69f0ae';   // green
  if (n <= 16) return '#00e676';   // bright green
  if (n <= 24) return '#ffd54f';   // gold
  if (n <= 32) return '#ff6b35';   // orange
  return '#f44336';                // red
}

// Build full level tables
const LEVELS = {
  peripheral_flash: Array.from({length: MAX_LEVEL}, (_, i) => pfLevel(i + 1)),
  arrow_reaction:   Array.from({length: MAX_LEVEL}, (_, i) => arLevel(i + 1)),
  number_scatter:   Array.from({length: MAX_LEVEL}, (_, i) => nsLevel(i + 1))
};

function getLevel(exId, n) {
  return LEVELS[exId] ? LEVELS[exId][Math.min(n, MAX_LEVEL) - 1] : null;
}

// Stage a level belongs to (1-8)
function levelStage(n) { return Math.ceil(n / STAGE_SIZE); }

// Max level accessible given the user's current level across all exercises
function maxAccessibleLevel(userLevels) {
  // User can play up to the next stage gate
  const mins = Object.values(userLevels);
  if (!mins.length) return STAGE_SIZE;
  const lowestCompleted = Math.min(...mins.map(l => l - 1)); // completed = reached - 1
  // Round down to nearest stage boundary, then open next stage
  const completedStages = Math.floor(lowestCompleted / STAGE_SIZE);
  return Math.min(MAX_LEVEL, (completedStages + 1) * STAGE_SIZE);
}
