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
  const minRounds  = 15;
  const maxRounds  = n >= 20 ? 25 : 20;
  const rounds     = minRounds + Math.floor(Math.random() * (maxRounds - minRounds + 1));
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
  const rounds      = Math.min(20, lerp(12, 20, n));
  const scattered   = n >= 10;
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
  const count    = lerp(10, 25, n);
  const ordered  = n <= 10;
  const maxDigit = n <= 10 ? 2 : 3;
  return {
    level:        n,
    count,
    ordered,
    maxDigit,
    passAccuracy: lerp(60, 90, n),
    timeLimit:    lerp(90, 40, n),
    label:        levelLabel(n)
  };
}

// ── SHAPE COUNTER levels ─────────────────────────────────────────
// Speed anchors (stepped stages):
//   L1=4, L10=8, L20=12, L30=17, L40=22
// Distractors:
//   L1-5: 0, L6-10: 1-2, L11-20: 3-6, L21-30: 6-10, L31-40: 10-20
// Shape size: L1=42px → L40=16px
// Change interval: random per change, min/max tighten with level
function scLevel(n) {

  // Move speed — stepped between stage anchors
  let moveSpeed;
  if      (n <= 10) moveSpeed = parseFloat((4  + (8  - 4)  * ((n - 1)  / 9)).toFixed(2));
  else if (n <= 20) moveSpeed = parseFloat((8  + (12 - 8)  * ((n - 11) / 9)).toFixed(2));
  else if (n <= 30) moveSpeed = parseFloat((12 + (17 - 12) * ((n - 21) / 9)).toFixed(2));
  else              moveSpeed = parseFloat((17 + (22 - 17) * ((n - 31) / 9)).toFixed(2));

  // Distractor count — random within range per level group
  let minDist, maxDist;
  if      (n <= 5)  { minDist=0;  maxDist=0;  }
  else if (n <= 10) { minDist=1;  maxDist=2;  }
  else if (n <= 20) { minDist=3;  maxDist=6;  }
  else if (n <= 30) { minDist=6;  maxDist=10; }
  else              { minDist=10; maxDist=20; }
  const distractorCount = minDist + Math.floor(Math.random() * (maxDist - minDist + 1));

  // Shape size: smaller at higher levels
  const targetSize     = Math.round(lerp(42, 16, n));
  const distractorSize = Math.max(14, targetSize - 2);

  // Change interval: random per change, tightens with level
  const minChangeInterval = Math.round(lerp(400, 200, n));
  const maxChangeInterval = Math.round(lerp(2000, 800, n));

  // Round time: random 10-25s regardless of level
  const minRoundTime = 10;
  const maxRoundTime = 25;

  // Rounds per session: 4 at L1 → 8 at L40
  const totalRounds = lerp(4, 8, n);

  // Pass: % of rounds that must be exactly correct
  // L1=50% (2 of 4), L40=100% (all correct)
  const passAccuracy = lerp(50, 100, n);

  return {
    level:               n,
    totalRounds,
    minRoundTime,
    maxRoundTime,
    distractorCount,
    minChangeInterval,
    maxChangeInterval,
    targetSize,
    distractorSize,
    moveSpeed,
    passAccuracy,
    label:               levelLabel(n)
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
  if (n <= 8)  return '#69f0ae';
  if (n <= 16) return '#00e676';
  if (n <= 24) return '#ffd54f';
  if (n <= 32) return '#ff6b35';
  return '#f44336';
}

// Build full level tables
const LEVELS = {
  peripheral_flash: Array.from({length: MAX_LEVEL}, (_, i) => pfLevel(i + 1)),
  arrow_reaction:   Array.from({length: MAX_LEVEL}, (_, i) => arLevel(i + 1)),
  number_scatter:   Array.from({length: MAX_LEVEL}, (_, i) => nsLevel(i + 1)),
  shape_counter:    Array.from({length: MAX_LEVEL}, (_, i) => scLevel(i + 1))
};

function getLevel(exId, n) {
  return LEVELS[exId] ? LEVELS[exId][Math.min(n, MAX_LEVEL) - 1] : null;
}

function levelStage(n) { return Math.ceil(n / STAGE_SIZE); }

function maxAccessibleLevel(userLevels) {
  const mins = Object.values(userLevels);
  if (!mins.length) return STAGE_SIZE;
  const lowestCompleted = Math.min(...mins.map(l => l - 1));
  const completedStages = Math.floor(lowestCompleted / STAGE_SIZE);
  return Math.min(MAX_LEVEL, (completedStages + 1) * STAGE_SIZE);
}
