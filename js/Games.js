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
    const hue = size > 65 ? '#00e676' : size > 55 ? '#ffeb3b' : '#ff6b35';

    const target = document.createElement('div');
    target.className = 'rt-target';
    target.style.left = x + 'px';
    target.style.top = y + 'px';
    target.style.width = size + 'px';
    target.style.height = size + 'px';
    target.style.background = hue;
    target.style.fontSize = Math.round(size * 0.35) + 'px';
    target.innerHTML = `${points}<div class="rt-shrink-bar" id="rt-shrink"></div>`;
    this.field.appendChild(target);
    this.targetEl = target;
    this.targetStart = Date.now();

    const bar = document.getElementById('rt-shrink');
    bar.style.transition = `width ${this.SHRINK_TIME}ms linear`;
    requestAnimationFrame(() => { bar.style.width = '0%'; });

    target.addEventListener('click', () => {
      const rt = Date.now() - this.targetStart;
      this.reactionTimes.push(rt);
      const pts = Math.max(1, Math.round(points * (1 - rt / this.SHRINK_TIME)));
      this.score += pts;
      this.hits++;
      document.getElementById('rt-score').textContent = this.score;
      const avg = Math.round(this.reactionTimes.reduce((a,b)=>a+b,0)/this.reactionTimes.length);
      document.getElementById('rt-avg').textContent = avg + 'ms';

      const flash = document.createElement('div');
      flash.className = 'rt-reaction-flash';
      flash.style.color = hue;
      flash.textContent = `+${pts}`;
      this.field.appendChild(flash);
      setTimeout(() => flash.remove(), 800);

      clearTimeout(this.expireTimer);
      target.remove();
      this.scheduleNext();
    });

    this.expireTimer = setTimeout(() => {
      target.remove();
      this.scheduleNext();
    }, this.SHRINK_TIME);
  },

  finish() {
    const avg = this.reactionTimes.length
      ? Math.round(this.reactionTimes.reduce((a,b)=>a+b,0)/this.reactionTimes.length)
      : 0;
    showResult('reaction_tap', this.score, `${this.hits}/${this.totalRounds} hit · avg reaction ${avg}ms`);
  },

  cleanup() {
    clearTimeout(this.waitTimer);
    clearTimeout(this.expireTimer);
  }
};

// ─── GAME: NUMBER SCATTER ──────────────────────────────────────────
const GameNumberScatter = {
  score: 0,
  current: 1,
  max: 20,
  sequence: [],
  startTime: null,
  times: [],
  mistakes: 0,

  init(arena) {
    this.score = 0; this.current = 1; this.times = []; this.mistakes = 0;
    arena.innerHTML = `
      <div class="game-score-bar">
        <div class="game-score-item">
          <div class="game-score-label">Score</div>
          <div class="game-score-value" id="ns-score">0</div>
        </div>
        <div class="game-score-item">
          <div class="game-score-label">Find</div>
          <div class="game-score-value" id="ns-target" style="color:var(--accent)">1</div>
        </div>
        <div class="game-score-item">
          <div class="game-score-label">Mistakes</div>
          <div class="game-score-value" id="ns-mistakes">0</div>
        </div>
      </div>
      <div id="ns-field">
        <div class="ns-prompt">Find: <strong id="ns-prompt-num">1</strong></div>
      </div>
    `;
    this.field = document.getElementById('ns-field');
    this.startTime = Date.now();
    this.scatter();
  },

  scatter() {
    const nums = Array.from({length: this.max}, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }

    const fw = this.field.offsetWidth, fh = this.field.offsetHeight;
    const placed = [];

    nums.forEach(n => {
      let x, y, attempts = 0, ok = false;
      while (!ok && attempts < 50) {
        x = 40 + Math.random() * (fw - 80);
        y = 50 + Math.random() * (fh - 80);
        ok = placed.every(p => Math.hypot(p.x - x, p.y - y) > 55);
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
    if (n === this.current) {
      el.classList.add('correct');
      el.style.pointerEvents = 'none';
      this.score += 10;
      this.times.push(Date.now() - this.startTime);
      this.startTime = Date.now();
      document.getElementById('ns-score').textContent = this.score;
      this.current++;
      if (this.current > this.max) { this.finish(); return; }
      document.getElementById('ns-target').textContent = this.current;
      document.getElementById('ns-prompt-num').textContent = this.current;
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
      ? Math.round(this.times.reduce((a,b)=>a+b,0)/this.times.length)
      : 0;
    showResult('number_scatter', this.score, `All 20 found · avg ${avg}ms per number · ${this.mistakes} mistake${this.mistakes !== 1 ? 's' : ''}`);
  },

  cleanup() {}
};
