// ─── EXERCISE REGISTRY ────────────────────────────────────────────
const EXERCISES = [
  { id:'peripheral_flash', name:'Peripheral Flash', icon:'👁️', desc:'Keep eyes on the centre dot. Click flashing targets in your periphery without looking away.', locked:false },
  { id:'arrow_reaction',   name:'Arrow Reaction',   icon:'🎯', desc:'Arrows appear in different colours. Use your keyboard arrow keys to match only the target colour arrow.', locked:false },
  { id:'number_scatter',   name:'Number Scatter',   icon:'🔢', desc:'Numbers are scattered on screen. Find and click them in the correct sequence as fast as possible.', locked:false },
  { id:'shape_counter', name:'Shape Counter', icon:'🔷', desc:'Watch the target shape float and change. Count every change — distractors will try to fool you.', locked:false },
  { id:'coming_2', name:'Pattern Flash',   icon:'🧩', desc:'Memorise and replicate brief play diagrams.', locked:true },
  { id:'coming_3', name:'Focus Shift',     icon:'🎯', desc:'Rapidly shift focus between near and far targets.', locked:true },
  { id:'coming_4', name:'Puck Pursuit',    icon:'🏑', desc:'Track a fast-moving ball across the field.', locked:true },
  { id:'coming_5', name:'Contrast Vision', icon:'🌫️', desc:'Detect low-contrast targets in challenging conditions.', locked:true }
];

// ─── ARROW COLOURS & DIRECTIONS ───────────────────────────────────
const ARROW_COLOURS = [
  { name:'Blue',   hex:'#4fc3f7' },
  { name:'Red',    hex:'#ef5350' },
  { name:'Yellow', hex:'#ffd54f' },
  { name:'Green',  hex:'#00e676' },
  { name:'Purple', hex:'#ce93d8' },
  { name:'Orange', hex:'#ff6b35' }
];
const ARROW_DIRS = [
  { dir:'up',    arrow:'↑', key:'ArrowUp'    },
  { dir:'down',  arrow:'↓', key:'ArrowDown'  },
  { dir:'left',  arrow:'←', key:'ArrowLeft'  },
  { dir:'right', arrow:'→', key:'ArrowRight' }
];

function calcPassed(correct, total, requiredPct) {
  if (!total) return false;
  return (correct / total) * 100 >= requiredPct;
}

// ══════════════════════════════════════════════════════════════════
//  GAME: PERIPHERAL FLASH
// ══════════════════════════════════════════════════════════════════
const GamePeripheralFlash = {
  score:0, caught:0, missed:0, round:0,
  cfg:null, dotTimeout:null, field:null,

  init(arena, cfg) {
    this.score=0; this.caught=0; this.missed=0; this.round=0;
    this.cfg = cfg;
    arena.innerHTML = `
      <div class="game-score-bar">
        <div class="game-score-item"><div class="game-score-label">Caught</div><div class="game-score-value" id="pf-caught">0</div></div>
        <div class="game-score-item"><div class="game-score-label">Round</div><div class="game-score-value" id="pf-round">0/${cfg.rounds}</div></div>
        <div class="game-score-item"><div class="game-score-label">Missed</div><div class="game-score-value" id="pf-missed">0</div></div>
        <div class="game-score-item"><div class="game-score-label">Need</div><div class="game-score-value" style="color:var(--gold)">${cfg.passAccuracy}%</div></div>
      </div>
      <div id="pf-field"><div class="pf-center"></div></div>`;
    this.field = document.getElementById('pf-field');
    this.nextDot();
  },

  nextDot() {
    if (this.round >= this.cfg.rounds) { this.finish(); return; }
    this.round++;
    document.getElementById('pf-round').textContent = `${this.round}/${this.cfg.rounds}`;

    const fw=this.field.offsetWidth, fh=this.field.offsetHeight;
const cx=fw/2, cy=fh/2;
const minDistPct = this.cfg.minDistPct || 0.22;
const minD = Math.min(fw, fh) * minDistPct;
const maxD = Math.min(cx, cy) - 28;
let x,y,att=0;
do {
  const a=Math.random()*Math.PI*2, d=minD+Math.random()*Math.max(0, maxD-minD);
  x=cx+Math.cos(a)*d; y=cy+Math.sin(a)*d; att++;
} while(att<50 && (x<24||x>fw-24||y<24||y>fh-24));

    const dot=document.createElement('div');
    dot.className='pf-dot';
    dot.style.left=x+'px'; dot.style.top=y+'px';
    this.field.appendChild(dot);

    dot.addEventListener('click', (e)=>{
      e.stopPropagation();
      if(dot.classList.contains('pf-missed')) return;
      clearTimeout(this.dotTimeout);
      this.caught++; this.score+=10;
      document.getElementById('pf-caught').textContent=this.caught;
      dot.style.background='var(--accent)'; dot.style.boxShadow='0 0 16px var(--accent)';
      setTimeout(()=>{ dot.remove(); this.nextDot(); },150);
    });

    this.dotTimeout = setTimeout(()=>{
      dot.classList.add('pf-missed'); this.missed++;
      document.getElementById('pf-missed').textContent=this.missed;
      setTimeout(()=>{ dot.remove(); this.nextDot(); },300);
    }, this.cfg.dotLifetime);
  },

  finish() {
    const acc    = Math.round((this.caught/this.cfg.rounds)*100);
    const passed = calcPassed(this.caught, this.cfg.rounds, this.cfg.passAccuracy);
    showResult('peripheral_flash', this.score, this.cfg.level,
      `${this.caught}/${this.cfg.rounds} caught — ${acc}% accuracy`, passed, acc);
  },
  cleanup() { clearTimeout(this.dotTimeout); }
};

// ══════════════════════════════════════════════════════════════════
//  GAME: ARROW REACTION
// ══════════════════════════════════════════════════════════════════
const GameArrowReaction = {
  score:0, correct:0, wrong:0, round:0,
  reactionTimes:[], cfg:null,
  targetColour:null, currentDir:null,
  arrowStart:null, waitTimer:null, expireTimer:null,
  _keyHandler:null, _scatteredEls:[],

  init(arena, cfg) {
    this.score=0; this.correct=0; this.wrong=0; this.round=0;
    this.reactionTimes=[]; this._scatteredEls=[];
    this.cfg=cfg; this.currentDir=null;
    this.targetColour = ARROW_COLOURS[Math.floor(Math.random()*ARROW_COLOURS.length)];

    // Build arena HTML
    arena.innerHTML = `
      <div class="game-score-bar">
        <div class="game-score-item"><div class="game-score-label">Score</div><div class="game-score-value" id="ar-score">0</div></div>
        <div class="game-score-item"><div class="game-score-label">Round</div><div class="game-score-value" id="ar-round">0/${cfg.rounds}</div></div>
        <div class="game-score-item"><div class="game-score-label">Correct</div><div class="game-score-value" id="ar-correct">0</div></div>
        <div class="game-score-item"><div class="game-score-label">Avg RT</div><div class="game-score-value" id="ar-avg">—</div></div>
        <div class="game-score-item"><div class="game-score-label">Need</div><div class="game-score-value" style="color:var(--gold)">${cfg.passAccuracy}%</div></div>
      </div>
      <div id="ar-field">
        <div id="ar-colour-bar">
          <span class="ar-colour-label">Target colour:</span>
          <span id="ar-target-swatch" class="ar-target-swatch"></span>
          <span id="ar-target-name" class="ar-target-name"></span>
          <span style="font-size:0.7rem;color:var(--text-muted);margin-left:0.5rem">← press matching arrow key</span>
        </div>
        <div id="ar-arrows-wrap"></div>
        <div id="ar-key-hint">Use ← ↑ → ↓ arrow keys on your keyboard</div>
      </div>`;

    this._updateColourBar();

    // Keyboard listener
    this._keyHandler = (e) => {
      const found = ARROW_DIRS.find(d => d.key === e.key);
      if (found && this.currentDir) {
        e.preventDefault();
        this.handleInput(found.dir);
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    // Small delay before starting so DOM is ready
    setTimeout(() => this.scheduleNext(), 100);
  },

  _updateColourBar() {
    const sw = document.getElementById('ar-target-swatch');
    const nm = document.getElementById('ar-target-name');
    if (sw) {
      sw.style.background  = this.targetColour.hex;
      sw.style.boxShadow   = `0 0 8px ${this.targetColour.hex}88`;
    }
    if (nm) {
      nm.textContent   = this.targetColour.name;
      nm.style.color   = this.targetColour.hex;
    }
  },

  scheduleNext() {
    if (this.round >= this.cfg.rounds) { this.finish(); return; }

    // Clear previous arrows
    this._clearArrows();
    this.currentDir = null;

    // Rotate colour every 3-5 rounds
    if (this.round > 0 && this.round % (3 + Math.floor(Math.random()*3)) === 0) {
      const others = ARROW_COLOURS.filter(c => c.name !== this.targetColour.name);
      this.targetColour = others[Math.floor(Math.random()*others.length)];
      this._updateColourBar();
    }

    const delay = this.cfg.minDelay + Math.random() * (this.cfg.maxDelay - this.cfg.minDelay);
    this.waitTimer = setTimeout(() => this.showArrows(), delay);
  },

  showArrows() {
    this.round++;
    const roundEl = document.getElementById('ar-round');
    if (roundEl) roundEl.textContent = `${this.round}/${this.cfg.rounds}`;
    this.arrowStart = Date.now();

    // Pick target direction
    const targetDir = ARROW_DIRS[Math.floor(Math.random()*ARROW_DIRS.length)];
    this.currentDir = targetDir.dir;

    // Build arrow list: 1 target + (n-1) distractors
    const distractors = ARROW_COLOURS.filter(c => c.name !== this.targetColour.name);
    const arrows = [{ dir: targetDir, colour: this.targetColour }];
    for (let i = 1; i < this.cfg.totalArrows; i++) {
      const col = distractors[Math.floor(Math.random()*distractors.length)];
      const dir = ARROW_DIRS[Math.floor(Math.random()*ARROW_DIRS.length)];
      arrows.push({ dir, colour: col });
    }
    // Shuffle
    for (let i = arrows.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [arrows[i], arrows[j]] = [arrows[j], arrows[i]];
    }

    const scattered = this.cfg.scattered;

    if (scattered) {
      // Level 10+ — place anywhere in the field
      const field = document.getElementById('ar-field');
      if (!field) return;
      const fw = field.offsetWidth  || 700;
      const fh = field.offsetHeight || 400;
      const placed = [];

      arrows.forEach(a => {
        const el = document.createElement('div');
        el.className = 'ar-arrow-scattered';
        el.textContent = a.dir.arrow;
        el.style.color = a.colour.hex;
        el.style.textShadow = `0 0 14px ${a.colour.hex}99`;

        let x, y, attempts = 0, ok = false;
        while (!ok && attempts < 80) {
          x = 70  + Math.random() * (fw - 140);
          y = 100 + Math.random() * (fh - 180);
          ok = placed.every(p => Math.hypot(p.x-x, p.y-y) > 75);
          attempts++;
        }
        placed.push({x, y});
        el.style.left = x + 'px';
        el.style.top  = y + 'px';
        field.appendChild(el);
        this._scatteredEls.push(el);
      });

    } else {
      // Level 1-9 — centred cluster in the wrap div
      const wrap = document.getElementById('ar-arrows-wrap');
      if (!wrap) return;
      wrap.innerHTML = '';
      arrows.forEach(a => {
        const el = document.createElement('div');
        el.className = 'ar-arrow-item';
        el.textContent = a.dir.arrow;
        el.style.color = a.colour.hex;
        el.style.textShadow = `0 0 14px ${a.colour.hex}99`;
        wrap.appendChild(el);
      });
    }

    // Expire timer
    this.expireTimer = setTimeout(() => {
      if (this.currentDir) {
        this.currentDir = null;
        this._flashArena('wrong');
        setTimeout(() => this.scheduleNext(), 450);
      }
    }, this.cfg.expireTime);
  },

  handleInput(dir) {
    if (!this.currentDir) return;
    clearTimeout(this.expireTimer);
    const rt = Date.now() - this.arrowStart;
    const isCorrect = dir === this.currentDir;
    this.currentDir = null;

    if (isCorrect) {
      const pts = Math.max(5, Math.round(20 - rt/80));
      this.score += pts; this.correct++;
      this.reactionTimes.push(rt);
      this._flashArena('correct');
      const scoreEl   = document.getElementById('ar-score');
      const correctEl = document.getElementById('ar-correct');
      const avgEl     = document.getElementById('ar-avg');
      if (scoreEl)   scoreEl.textContent   = this.score;
      if (correctEl) correctEl.textContent = this.correct;
      if (avgEl && this.reactionTimes.length) {
        const avg = Math.round(this.reactionTimes.reduce((a,b)=>a+b,0)/this.reactionTimes.length);
        avgEl.textContent = avg + 'ms';
      }
    } else {
      this.wrong++;
      this.score = Math.max(0, this.score - 3);
      this._flashArena('wrong');
      const scoreEl = document.getElementById('ar-score');
      if (scoreEl) scoreEl.textContent = this.score;
    }

    setTimeout(() => this.scheduleNext(), 400);
  },

  _clearArrows() {
    // Clear scattered els
    this._scatteredEls.forEach(el => el.remove());
    this._scatteredEls = [];
    // Clear wrap
    const wrap = document.getElementById('ar-arrows-wrap');
    if (wrap) wrap.innerHTML = '';
  },

  _flashArena(type) {
    const field = document.getElementById('ar-field');
    if (!field) return;
    field.classList.add('flash-' + type);
    setTimeout(() => field.classList.remove('flash-correct', 'flash-wrong'), 300);
  },

  finish() {
    const acc    = Math.round((this.correct / this.cfg.rounds) * 100);
    const avgRt  = this.reactionTimes.length
      ? Math.round(this.reactionTimes.reduce((a,b)=>a+b,0) / this.reactionTimes.length) : 0;
    const passed = calcPassed(this.correct, this.cfg.rounds, this.cfg.passAccuracy);
    showResult('arrow_reaction', this.score, this.cfg.level,
      `${this.correct}/${this.cfg.rounds} correct — ${acc}% · avg ${avgRt}ms`, passed, acc);
  },

  cleanup() {
    clearTimeout(this.waitTimer);
    clearTimeout(this.expireTimer);
    this._clearArrows();
    if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
  }
};

// ══════════════════════════════════════════════════════════════════
//  GAME: NUMBER SCATTER
// ══════════════════════════════════════════════════════════════════
const GameNumberScatter = {
  score:0, current:0, sequence:[], mistakes:0,
  times:[], startTime:null, cfg:null, field:null,
  timerInterval:null, elapsed:0,

  init(arena, cfg) {
    this.score=0; this.current=0; this.mistakes=0; this.times=[];
    this.cfg=cfg; this.elapsed=0;

    const pool = this._buildPool(cfg.count, cfg.maxDigit);
    this.sequence = cfg.ordered
      ? [...pool].sort((a,b) => a-b)
      : this._shuffle([...pool]);

    const first = this.sequence[0];
    arena.innerHTML = `
      <div class="game-score-bar">
        <div class="game-score-item"><div class="game-score-label">Score</div><div class="game-score-value" id="ns-score">0</div></div>
        <div class="game-score-item"><div class="game-score-label">Find Next</div><div class="game-score-value" id="ns-target" style="color:var(--accent)">${first}</div></div>
        <div class="game-score-item"><div class="game-score-label">Progress</div><div class="game-score-value" id="ns-progress">0/${cfg.count}</div></div>
        <div class="game-score-item"><div class="game-score-label">Mistakes</div><div class="game-score-value" id="ns-mistakes">0</div></div>
        <div class="game-score-item"><div class="game-score-label">Time Left</div><div class="game-score-value" id="ns-timeleft">${cfg.timeLimit}s</div></div>
      </div>
      <div id="ns-field">
        <div class="ns-prompt">Find: <strong id="ns-prompt-num">${first}</strong></div>
      </div>`;

    this.field = document.getElementById('ns-field');
    this.startTime = Date.now();
    this.scatter();

    this.timerInterval = setInterval(() => {
      this.elapsed++;
      const left = this.cfg.timeLimit - this.elapsed;
      const el = document.getElementById('ns-timeleft');
      if (el) { el.textContent = Math.max(0,left)+'s'; if(left<=10) el.style.color='var(--warn)'; }
      if (left <= 0) { clearInterval(this.timerInterval); this.finish(true); }
    }, 1000);
  },

  _buildPool(count, maxDigit) {
    const pool = new Set();
    while (pool.size < count) {
      let n;
      if (maxDigit === 2) {
        n = Math.random()<0.4
          ? (1 + Math.floor(Math.random()*9))
          : (10 + Math.floor(Math.random()*90));
      } else {
        const r = Math.random();
        if (r < 0.2)      n = 1   + Math.floor(Math.random()*9);
        else if (r < 0.6) n = 10  + Math.floor(Math.random()*90);
        else              n = 100 + Math.floor(Math.random()*900);
      }
      pool.add(n);
    }
    return [...pool];
  },

  _shuffle(arr) {
    for (let i=arr.length-1; i>0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    return arr;
  },

  scatter() {
    const display = this._shuffle([...this.sequence]);
    const fw = this.field.offsetWidth, fh = this.field.offsetHeight;
    const placed = [];
    display.forEach(n => {
      let x,y,ok=false,att=0;
      while (!ok && att<80) {
        x = 45 + Math.random()*(fw-90);
        y = 55 + Math.random()*(fh-80);
        ok = placed.every(p => Math.hypot(p.x-x,p.y-y) > 58);
        att++;
      }
      placed.push({x,y});
      const el = document.createElement('div');
      el.className='ns-number'; el.textContent=n; el.dataset.num=n;
      el.style.left=x+'px'; el.style.top=y+'px';
      el.addEventListener('click', () => this.tap(n,el));
      this.field.appendChild(el);
    });
  },

  tap(n, el) {
    if (n === this.sequence[this.current]) {
      el.classList.add('correct'); el.style.pointerEvents='none';
      this.score += 10;
      this.times.push(Date.now()-this.startTime); this.startTime=Date.now();
      this.current++;
      document.getElementById('ns-score').textContent=this.score;
      document.getElementById('ns-progress').textContent=`${this.current}/${this.cfg.count}`;
      if (this.current >= this.sequence.length) { this.finish(false); return; }
      const next = this.sequence[this.current];
      document.getElementById('ns-target').textContent=next;
      document.getElementById('ns-prompt-num').textContent=next;
    } else {
      el.classList.add('wrong'); this.mistakes++;
      this.score = Math.max(0, this.score-3);
      document.getElementById('ns-score').textContent=this.score;
      document.getElementById('ns-mistakes').textContent=this.mistakes;
      setTimeout(() => el.classList.remove('wrong'), 300);
    }
  },

  finish(timeout) {
    clearInterval(this.timerInterval);
    const found  = this.current;
    const acc    = Math.round((found/this.cfg.count)*100);
    const passed = !timeout && calcPassed(found, this.cfg.count, this.cfg.passAccuracy);
    const avg    = this.times.length
      ? Math.round(this.times.reduce((a,b)=>a+b,0)/this.times.length) : 0;
    const detail = timeout
      ? `Time's up! ${found}/${this.cfg.count} found — ${acc}%`
      : `All ${this.cfg.count} found · ${acc}% · avg ${avg}ms · ${this.mistakes} mistake${this.mistakes!==1?'s':''}`;
    showResult('number_scatter', this.score, this.cfg.level, detail, passed, acc);
  },
  cleanup() { clearInterval(this.timerInterval); }
};
