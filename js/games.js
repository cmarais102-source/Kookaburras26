// ─── DIFFICULTY CONFIG ────────────────────────────────────────────
// Each exercise has 3 levels. Unlock threshold: score >= unlock_score
const DIFFICULTIES = {
  peripheral_flash: [
    { level: 1, label: 'Easy',   dotLifetime: 1400, rounds: 20, unlock_score: 16 },
    { level: 2, label: 'Medium', dotLifetime: 1000, rounds: 25, unlock_score: 20 },
    { level: 3, label: 'Hard',   dotLifetime: 700,  rounds: 30, unlock_score: null }
  ],
  arrow_reaction: [
    { level: 1, label: 'Easy',   rounds: 15, minDelay: 800,  maxDelay: 1600, unlock_score: 80 },
    { level: 2, label: 'Medium', rounds: 20, minDelay: 500,  maxDelay: 1200, unlock_score: 130 },
    { level: 3, label: 'Hard',   rounds: 25, minDelay: 300,  maxDelay: 900,  unlock_score: null }
  ],
  number_scatter: [
    { level: 1, label: 'Easy',   count: 20, ordered: true,  unlock_score: 180 },
    { level: 2, label: 'Medium', count: 20, ordered: false, unlock_score: 150 },
    { level: 3, label: 'Hard',   count: 30, ordered: false, unlock_score: null }
  ]
};

// ─── EXERCISE DEFINITIONS ─────────────────────────────────────────
const EXERCISES = [
  {
    id: 'peripheral_flash',
    name: 'Peripheral Flash',
    icon: '👁️',
    desc: 'Keep eyes on the centre dot. Click flashing targets in your periphery without looking away.',
    locked: false
  },
  {
    id: 'arrow_reaction',
    name: 'Arrow Reaction',
    icon: '🎯',
    desc: 'An arrow points a direction — tap the matching button as fast as you can.',
    locked: false
  },
  {
    id: 'number_scatter',
    name: 'Number Scatter',
    icon: '🔢',
    desc: 'Find and tap numbers in sequence as fast as possible. Harder levels use random order.',
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
  score: 0, missed: 0, round: 0,
  config: null, dotTimeout: null,

  init(arena, difficulty) {
    this.score = 0; this.missed = 0; this.round = 0;
    this.config = difficulty || DIFFICULTIES.peripheral_flash[0];
    arena.innerHTML = `
      <div class="game-score-bar">
        <div class="game-score-item"><div class="game-score-label">Score</div><div class="game-score-value" id="pf-score">0</div></div>
        <div class="game-score-item"><div class="game-score-label">Round</div><div class="game-score-value" id="pf-round">0 / ${this.config.rounds}</div></div>
        <div class="game-score-item"><div class="game-score-label">Missed</div><div class="game-score-value" id="pf-missed">0</div></div>
      </div>
      <div id="pf-field"><div class="pf-center"></div></div>
    `;
    this.field = document.getElementById('pf-field');
    this.nextDot();
  },

  nextDot() {
    if (this.round >= this.config.rounds) { this.finish(); return; }
    this.round++;
    document.getElementById('pf-round').textContent = `${this.round} / ${this.config.rounds}`;

    const fw = this.field.offsetWidth, fh = this.field.offsetHeight;
    const cx = fw / 2, cy = fh / 2, minDist = 120;
    let x, y, attempts = 0;
    do {
      const angle = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * (Math.min(cx, cy) - minDist - 20);
      x = cx + Math.cos(angle) * dist;
      y = cy + Math.sin(angle) * dist;
      attempts++;
    } while (attempts < 30 && (x < 20 || x > fw - 20 || y < 20 || y > fh - 20));

    const dot = document.createElement('div');
    dot.className = 'pf-dot';
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    this.field.appendChild(dot);

    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dot.classList.contains('pf-missed')) return;
      clearTimeout(this.dotTimeout);
      this.score++;
      document.getElementById('pf-score').textContent = this.score;
      dot.style.background = 'var(--accent)';
      dot.style.boxShadow = '0 0 16px var(--accent)';
      setTimeout(() => { dot.remove(); this.nextDot(); }, 180);
    });

    this.dotTimeout = setTimeout(() => {
      dot.classList.add('pf-missed');
      this.missed++;
      document.getElementById('pf-missed').textContent = this.missed;
      setTimeout(() => { dot.remove(); this.nextDot(); }, 350);
    }, this.config.dotLifetime);
  },

  finish() {
    const pct = Math.round((this.score / this.config.rounds) * 100);
    showResult('peripheral_flash', this.score, `${this.score}/${this.config.rounds} caught — ${pct}% accuracy`, this.config.level);
  },
  cleanup() { clearTimeout(this.dotTimeout); }
};

// ─── GAME: ARROW REACTION ─────────────────────────────────────────
const ARROWS = [
  { dir: 'up',    emoji: '⬆️', row: 0, col: 1 },
  { dir: 'left',  emoji: '⬅️', row: 1, col: 0 },
  { dir: 'right', emoji: '➡️', row: 1, col: 2 },
  { dir: 'down',  emoji: '⬇️', row: 2, col: 1 }
];

const GameArrowReaction = {
  score: 0, hits: 0, wrong: 0, round: 0,
  reactionTimes: [], currentArrow: null,
  waitTimer: null, expireTimer: null,
  config: null, arrowStart: null,
  EXPIRE_TIME: 2500,

  init(arena, difficulty) {
    this.score = 0; this.hits = 0; this.wrong = 0; this.round = 0; this.reactionTimes = [];
    this.config = difficulty || DIFFICULTIES.arrow_reaction[0];
    arena.innerHTML = `
      <div class="game-score-bar">
        <div class="game-score-item"><div class="game-score-label">Score</div><div class="game-score-value" id="ar-score">0</div></div>
        <div class="game-score-item"><div class="game-score-label">Round</div><div class="game-score-value" id="ar-round">0 / ${this.config.rounds}</div></div>
        <div class="game-score-item"><div class="game-score-label">Avg Reaction</div><div class="game-score-value" id="ar-avg">—</div></div>
      </div>
      <div id="ar-field">
        <div class="ar-arrow-display" id="ar-display">❓</div>
        <div class="ar-buttons" id="ar-buttons"></div>
      </div>
    `;
    this.display = document.getElementById('ar-display');
    this.field   = document.getElementById('ar-field');
    this.buildButtons();
    this.scheduleNext();
  },

  buildButtons() {
    const grid = document.getElementById('ar-buttons');
    // 3x3 grid: corners empty, arrows at N/S/E/W, centre empty
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const btn = document.createElement('button');
        const arrow = ARROWS.find(a => a.row === row && a.col === col);
        if (arrow) {
          btn.className = 'ar-btn';
          btn.textContent = arrow.emoji;
          btn.dataset.dir = arrow.dir;
          btn.addEventListener('click', () => this.tap(arrow.dir, btn));
        } else {
          btn.className = 'ar-btn empty';
        }
        grid.appendChild(btn);
      }
    }
  },

  scheduleNext() {
    if (this.round >= this.config.rounds) { this.finish(); return; }
    this.display.textContent = '❓';
    this.display.className = 'ar-arrow-display';
    this.currentArrow = null;
    const delay = this.config.minDelay + Math.random() * (this.config.maxDelay - this.config.minDelay);
    this.waitTimer = setTimeout(() => this.showArrow(), delay);
  },

  showArrow() {
    this.round++;
    document.getElementById('ar-round').textContent = `${this.round} / ${this.config.rounds}`;
    this.currentArrow = ARROWS[Math.floor(Math.random() * ARROWS.length)];
    this.display.textContent = this.currentArrow.emoji;
    this.arrowStart = Date.now();

    this.expireTimer = setTimeout(() => {
      if (this.currentArrow) {
        this.display.classList.add('flash-wrong');
        this.currentArrow = null;
        setTimeout(() => this.scheduleNext(), 400);
      }
    }, this.EXPIRE_TIME);
  },

  tap(dir, btn) {
    if (!this.currentArrow) return;
    clearTimeout(this.expireTimer);
    const rt = Date.now() - this.arrowStart;

    if (dir === this.currentArrow.dir) {
      const pts = Math.max(5, Math.round(15 - rt / 100));
      this.score += pts;
      this.hits++;
      this.reactionTimes.push(rt);
      this.display.classList.add('flash-correct');
      btn.classList.add('correct');
      document.getElementById('ar-score').textContent = this.score;
      const avg = Math.round(this.reactionTimes.reduce((a,b)=>a+b,0)/this.reactionTimes.length);
      document.getElementById('ar-avg').textContent = avg + 'ms';

      const flash = document.createElement('div');
      flash.className = 'ar-reaction-flash';
      flash.style.color = 'var(--accent)';
      flash.textContent = `+${pts}`;
      this.field.appendChild(flash);
      setTimeout(() => flash.remove(), 800);
    } else {
      this.wrong++;
      this.score = Math.max(0, this.score - 3);
      this.display.classList.add('flash-wrong');
      btn.classList.add('wrong');
      document.getElementById('ar-score').textContent = this.score;
    }

    this.currentArrow = null;
    setTimeout(() => {
      btn.classList.remove('correct', 'wrong');
      this.scheduleNext();
    }, 350);
  },

  finish() {
    const avg = this.reactionTimes.length
      ? Math.round(this.reactionTimes.reduce((a,b)=>a+b,0)/this.reactionTimes.length) : 0;
    showResult('arrow_reaction', this.score, `${this.hits}/${this.config.rounds} correct · avg reaction ${avg}ms`, this.config.level);
  },
  cleanup() { clearTimeout(this.waitTimer); clearTimeout(this.expireTimer); }
};

// ─── GAME: NUMBER SCATTER ──────────────────────────────────────────
const GameNumberScatter = {
  score: 0, current: 0, sequence: [], times: [], mistakes: 0,
  config: null, startTime: null,

  init(arena, difficulty) {
    this.score = 0; this.current = 0; this.times = []; this.mistakes = 0;
    this.config = difficulty || DIFFICULTIES.number_scatter[0];

    // Build sequence
    const nums = Array.from({length: this.config.count}, (_, i) => i + 1);
    if (!this.config.ordered) {
      // Shuffle for random order mode
      for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
      }
    }
    this.sequence = nums;

    const targetLabel = this.config.ordered
      ? `Find 1 → ${this.config.count} in order`
      : `Find numbers in this order: ${nums.slice(0,5).join(' → ')}...`;

    arena.innerHTML = `
      <div class="game-score-bar">
        <div class="game-score-item"><div class="game-score-label">Score</div><div class="game-score-value" id="ns-score">0</div></div>
        <div class="game-score-item"><div class="game-score-label">Next</div><div class="game-score-value" id="ns-target" style="color:var(--accent)">${nums[0]}</div></div>
        <div class="game-score-item"><div class="game-score-label">Mistakes</div><div class="game-score-value" id="ns-mistakes">0</div></div>
      </div>
      <div id="ns-field">
        <div class="ns-prompt">Find: <strong id="ns-prompt-num">${nums[0]}</strong></div>
      </div>
    `;
    this.field = document.getElementById('ns-field');
    this.startTime = Date.now();
    this.scatter();
  },

  scatter() {
    // Place all numbers from sequence scattered randomly
    const displayNums = [...this.sequence];
    // Shuffle display positions
    for (let i = displayNums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [displayNums[i], displayNums[j]] = [displayNums[j], displayNums[i]];
    }

    const fw = this.field.offsetWidth, fh = this.field.offsetHeight;
    const placed = [];

    displayNums.forEach(n => {
      let x, y, attempts = 0, ok = false;
      while (!ok && attempts < 60) {
        x = 40 + Math.random() * (fw - 80);
        y = 50 + Math.random() * (fh - 80);
        ok = placed.every(p => Math.hypot(p.x - x, p.y - y) > 52);
        attempts++;
      }
      placed.push({x, y});

      const el = document.createElement('div');
      el.className = 'ns-number';
      el.textContent = n;
      el.dataset.num = n;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.addEventListener('click', () => this.tap(n, el));
      this.field.appendChild(el);
    });
  },

  tap(n, el) {
    const target = this.sequence[this.current];
    if (n === target) {
      el.classList.add('correct');
      el.style.pointerEvents = 'none';
      this.score += 10;
      this.times.push(Date.now() - this.startTime);
      this.startTime = Date.now();
      document.getElementById('ns-score').textContent = this.score;
      this.current++;
      if (this.current >= this.sequence.length) { this.finish(); return; }
      const next = this.sequence[this.current];
      document.getElementById('ns-target').textContent = next;
      document.getElementById('ns-prompt-num').textContent = next;
    } else {
      el.classList.add('wrong');
      this.mistakes++;
      this.score = Math.max(0, this.score - 3);
      document.getElementById('ns-score').textContent = this.score;
      document.getElementById('ns-mistakes').textContent = this.mistakes;
      setTimeout(() => el.classList.remove('wrong'), 300);
    }
  },

  finish() {
    const avg = this.times.length
      ? Math.round(this.times.reduce((a,b)=>a+b,0)/this.times.length) : 0;
    const mode = this.config.ordered ? 'ordered' : 'random order';
    showResult('number_scatter', this.score,
      `All ${this.config.count} found (${mode}) · avg ${avg}ms · ${this.mistakes} mistake${this.mistakes !== 1 ? 's' : ''}`,
      this.config.level);
  },
  cleanup() {}
};
