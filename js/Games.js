// ─── EXERCISE DEFINITIONS ─────────────────────────────────────────
const EXERCISES = [
  {
    id: 'peripheral_flash',
    name: 'Peripheral Flash',
    icon: '👁️',
    desc: 'Keep your eyes on the centre dot. Click flashing targets in your periphery without looking away.',
    locked: false
  },
  {
    id: 'reaction_tap',
    name: 'Reaction Tap',
    icon: '⚡',
    desc: 'Tap targets the instant they appear. Speed matters — slower taps score less.',
    locked: false
  },
  {
    id: 'number_scatter',
    name: 'Number Scatter',
    icon: '🔢',
    desc: 'Find and tap numbers in sequence as fast as possible. Builds visual search speed.',
    locked: false
  },
  {
    id: 'coming_soon_1',
    name: 'Split Tracking',
    icon: '🔀',
    desc: 'Track two moving objects simultaneously — mirrors tracking ball and player at once.',
    locked: true
  },
  {
    id: 'coming_soon_2',
    name: 'Pattern Flash',
    icon: '🧩',
    desc: 'Brief patterns appear — replicate the play diagram. Builds hockey IQ and memory.',
    locked: true
  },
  {
    id: 'coming_soon_3',
    name: 'Focus Shift',
    icon: '🎯',
    desc: 'Rapidly shift focus between near and far targets. Trains visual switching speed.',
    locked: true
  },
  {
    id: 'coming_soon_4',
    name: 'Puck Pursuit',
    icon: '🏑',
    desc: 'Track a fast-moving target across the field. Simulates tracking a moving ball.',
    locked: true
  },
  {
    id: 'coming_soon_5',
    name: 'Contrast Vision',
    icon: '🌫️',
    desc: 'Detect low-contrast targets quickly — trains vision in poor weather conditions.',
    locked: true
  }
];

// ─── GAME: PERIPHERAL FLASH ───────────────────────────────────────
const GamePeripheralFlash = {
  score: 0,
  missed: 0,
  round: 0,
  maxRounds: 20,
  activeDot: null,
  dotTimer: null,
  dotTimeout: null,
  DOT_LIFETIME: 1200,

  init(arena) {
    this.score = 0; this.missed = 0; this.round = 0;
    arena.innerHTML = `
      <div class="game-score-bar">
        <div class="game-score-item">
          <div class="game-score-label">Score</div>
          <div class="game-score-value" id="pf-score">0</div>
        </div>
        <div class="game-score-item">
          <div class="game-score-label">Round</div>
          <div class="game-score-value" id="pf-round">0 / ${this.maxRounds}</div>
        </div>
        <div class="game-score-item">
          <div class="game-score-label">Missed</div>
          <div class="game-score-value" id="pf-missed">0</div>
        </div>
      </div>
      <div id="pf-field">
        <div class="pf-center"></div>
      </div>
    `;
    this.field = document.getElementById('pf-field');
    this.nextDot();
  },

  nextDot() {
    if (this.round >= this.maxRounds) { this.finish(); return; }
    this.round++;
    document.getElementById('pf-round').textContent = `${this.round} / ${this.maxRounds}`;

    const fw = this.field.offsetWidth, fh = this.field.offsetHeight;
    const cx = fw / 2, cy = fh / 2;
    const minDist = 100;

    let x, y, attempts = 0;
    do {
      const angle = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * (Math.min(cx, cy) - minDist - 20);
      x = cx + Math.cos(angle) * dist;
      y = cy + Math.sin(angle) * dist;
      attempts++;
    } while (attempts < 20 && (x < 20 || x > fw - 20 || y < 20 || y > fh - 20));

    const dot = document.createElement('div');
    dot.className = 'pf-dot';
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    this.field.appendChild(dot);
    this.activeDot = dot;

    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dot.classList.contains('pf-missed')) return;
      clearTimeout(this.dotTimeout);
      this.score++;
      document.getElementById('pf-score').textContent = this.score;
      dot.style.background = 'var(--accent)';
      dot.style.boxShadow = '0 0 16px var(--accent)';
      setTimeout(() => { dot.remove(); this.nextDot(); }, 200);
    });

    this.dotTimeout = setTimeout(() => {
      dot.classList.add('pf-missed');
      this.missed++;
      document.getElementById('pf-missed').textContent = this.missed;
      setTimeout(() => { dot.remove(); this.nextDot(); }, 400);
    }, this.DOT_LIFETIME);
  },

  finish() {
    const pct = Math.round((this.score / this.maxRounds) * 100);
    showResult('peripheral_flash', this.score, `${this.score}/${this.maxRounds} caught — ${pct}% accuracy`);
  },

  cleanup() {
    clearTimeout(this.dotTimeout);
  }
};

// ─── GAME: REACTION TAP ────────────────────────────────────────────
const GameReactionTap = {
  score: 0,
  hits: 0,
  totalRounds: 15,
  round: 0,
  reactionTimes: [],
  waitTimer: null,
  shrinkInterval: null,
  targetEl: null,
  targetStart: null,
  SHRINK_TIME: 2000,

  init(arena) {
    this.score = 0; this.hits = 0; this.round = 0; this.reactionTimes = [];
    arena.innerHTML = `
      <div class="game-score-bar">
        <div class="game-score-item">
          <div class="game-score-label">Score</div>
          <div class="game-score-value" id="rt-score">0</div>
        </div>
        <div class="game-score-item">
          <div class="game-score-label">Round</div>
          <div class="game-score-value" id="rt-round">0 / ${this.totalRounds}</div>
        </div>
        <div class="game-score-item">
          <div class="game-score-label">Avg Reaction</div>
          <div class="game-score-value" id="rt-avg">—</div>
        </div>
      </div>
      <div id="rt-field"></div>
    `;
    this.field = document.getElementById('rt-field');
    this.scheduleNext();
  },

  scheduleNext() {
    if (this.round >= this.totalRounds) { this.finish(); return; }
    const delay = 600 + Math.random() * 1200;
    this.waitTimer = setTimeout(() => this.spawnTarget(), delay);
  },

  spawnTarget() {
    this.round++;
    document.getElementById('rt-round').textContent = `${this.round} / ${this.totalRounds}`;

    const fw = this.field.offsetWidth, fh = this.field.offsetHeight;
    const size = 52 + Math.random() * 24;
    const x = size/2 + Math.random() * (fw - size);
    const y = size/2 + Math.random() * (fh - size);

    const points = Math.round(10 + (76 - size) * 0.5);
    const hue = size > 65 ? '#00e676​​​​​​​​​​​​​​​​
