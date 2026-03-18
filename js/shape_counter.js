// ══════════════════════════════════════════════════════════════════
//  GAME: SHAPE COUNTER
//  1 round per session. Need 3 consecutive passes to level up.
//  Pass = get the exact change count correct.
// ══════════════════════════════════════════════════════════════════
const SHAPE_TYPES   = ['circle','triangle','square','pentagon','star','diamond'];
const SHAPE_COLOURS = [
  {name:'green',  hex:'#00e676'},
  {name:'blue',   hex:'#4fc3f7'},
  {name:'red',    hex:'#ef5350'},
  {name:'yellow', hex:'#ffd54f'},
  {name:'purple', hex:'#ce93d8'},
  {name:'orange', hex:'#ff6b35'},
  {name:'teal',   hex:'#80cbc4'},
  {name:'pink',   hex:'#f48fb1'},
];

const GameShapeCounter = {
  cfg:                  null,
  score:                0,
  changeCount:          0,
  roundDuration:        0,
  roundTimeLeft:        0,
  targetShapeType:      null,
  targetColour:         null,
  shapes:               [],
  roundActive:          false,
  nextChangeTimeout:    null,
  roundTimerInterval:   null,
  roundTimerBarTimeout: null,
  animFrame:            null,
  canvas:               null,
  ctx:                  null,

  init(arena, cfg) {
    this.cfg         = cfg;
    this.score       = 0;
    this.changeCount = 0;
    this.roundActive = false;
    this.shapes      = [];

    // Inject full HTML into arena
    arena.innerHTML = `
      <div class="game-score-bar">
        <div class="game-score-item">
          <div class="game-score-label">Level</div>
          <div class="game-score-value" style="color:${levelColour(cfg.level)}">${cfg.level}</div>
        </div>
        <div class="game-score-item">
          <div class="game-score-label">Distractors</div>
          <div class="game-score-value" style="color:var(--blue)">${cfg.distractorCount}</div>
        </div>
        <div class="game-score-item">
          <div class="game-score-label">Speed</div>
          <div class="game-score-value" style="color:var(--gold)">${cfg.moveSpeed.toFixed(1)}</div>
        </div>
        <div class="game-score-item">
          <div class="game-score-label">Round Time</div>
          <div class="game-score-value" id="sc-roundtime" style="color:var(--text-dim)">—</div>
        </div>
      </div>

      <div id="sc-wrap" style="position:relative;width:100%;flex:1;min-height:420px;overflow:hidden;">

        <!-- Timer bar -->
        <div style="position:absolute;top:0;left:0;right:0;height:5px;background:var(--surface);z-index:5;">
          <div id="sc-timer-bar" style="height:100%;width:100%;background:linear-gradient(90deg,var(--accent),var(--gold));border-radius:0 3px 3px 0;"></div>
        </div>

        <!-- Countdown label -->
        <div id="sc-round-timer" style="position:absolute;top:12px;right:14px;font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:700;color:var(--gold);z-index:5;">—</div>

        <!-- Target label -->
        <div style="position:absolute;top:12px;left:14px;font-family:'Barlow Condensed',sans-serif;font-size:0.78rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);z-index:5;">
          Track: <span id="sc-target-text" style="color:var(--text-dim)">—</span>
        </div>

        <!-- Canvas -->
        <canvas id="sc-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;display:block;"></canvas>

        <!-- MEMORISE OVERLAY -->
        <div id="sc-memorise" style="
          position:absolute;inset:0;
          background:var(--bg2);
          display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          gap:1rem;z-index:20;padding:1.5rem;
        ">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:700;color:var(--gold);letter-spacing:0.08em;">
            👁️ MEMORISE YOUR TARGET
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1rem 1.5rem;display:flex;align-items:center;gap:1rem;">
            <canvas id="sc-preview" width="70" height="70"></canvas>
            <div>
              <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.3rem;">Your target this round</div>
              <div id="sc-mem-name" style="font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:700;">—</div>
            </div>
          </div>
          <div style="font-size:0.8rem;color:var(--text-dim);text-align:center;">
            Count every time <strong id="sc-mem-name2" style="color:var(--accent)">—</strong> changes shape or colour
          </div>
          <div style="font-size:0.72rem;color:var(--text-muted);text-align:center;">
            Speed: <strong style="color:var(--gold)">${cfg.moveSpeed.toFixed(1)}</strong>
            &nbsp;·&nbsp;
            Distractors: <strong style="color:var(--blue)">${cfg.distractorCount}</strong>
          </div>
          <div id="sc-cd" style="font-family:'Barlow Condensed',sans-serif;font-size:5rem;font-weight:900;color:var(--accent);line-height:1;">3</div>
        </div>

        <!-- ANSWER OVERLAY -->
        <div id="sc-answer" style="
          position:absolute;inset:0;
          background:var(--bg2);
          display:none;flex-direction:column;
          align-items:center;justify-content:center;
          gap:1rem;z-index:20;padding:1.5rem;
        ">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:700;letter-spacing:0.06em;">⏱ Time's up!</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.9rem;font-weight:700;letter-spacing:0.08em;color:var(--gold);">How many times did the target change?</div>
          <input id="sc-input" type="number" min="0" max="99" placeholder="—"
            style="width:150px;background:#152019;border:2px solid var(--border);
                   border-radius:10px;padding:0.75rem 1rem;color:var(--text);
                   font-family:'Barlow Condensed',sans-serif;font-size:2.2rem;
                   font-weight:700;text-align:center;outline:none;
                   transition:border-color 0.2s,background 0.2s;
                   -moz-appearance:textfield;"/>
          <div style="font-size:0.7rem;color:var(--text-muted);">Press Enter to confirm</div>
          <div id="sc-result" style="display:none;font-family:'Barlow Condensed',sans-serif;font-size:1.05rem;font-weight:700;text-align:center;"></div>
        </div>

      </div>`;

    // Wait one frame for DOM to settle, then kick off
    requestAnimationFrame(() => {
      this.canvas = document.getElementById('sc-canvas');
      if (!this.canvas) return;
      const wrap = document.getElementById('sc-wrap');
      this.canvas.width  = wrap.offsetWidth  || 700;
      this.canvas.height = wrap.offsetHeight || 420;
      this.ctx = this.canvas.getContext('2d');
      this._startMemorise();
    });
  },

  _startMemorise() {
    // Pick target and round duration
    this.targetShapeType = SHAPE_TYPES[Math.floor(Math.random()*SHAPE_TYPES.length)];
    this.targetColour    = SHAPE_COLOURS[Math.floor(Math.random()*SHAPE_COLOURS.length)];
    this.changeCount     = 0;
    this.roundDuration   = this.cfg.minRoundTime +
      Math.floor(Math.random() * (this.cfg.maxRoundTime - this.cfg.minRoundTime + 1));

    // Update round time display
    const rtEl = document.getElementById('sc-roundtime');
    if (rtEl) rtEl.textContent = this.roundDuration + 's';

    // Draw preview shape
    const previewCanvas = document.getElementById('sc-preview');
    if (previewCanvas) {
      const pc = previewCanvas.getContext('2d');
      pc.clearRect(0,0,70,70);
      this._drawShape(pc, this.targetShapeType, 35, 35, 22, this.targetColour.hex);
    }

    // Set target labels
    const label = `${this.targetColour.name} ${this.targetShapeType}`;
    const nm1   = document.getElementById('sc-mem-name');
    const nm2   = document.getElementById('sc-mem-name2');
    const tl    = document.getElementById('sc-target-text');
    if (nm1) { nm1.textContent = label; nm1.style.color = this.targetColour.hex; }
    if (nm2) { nm2.textContent = label; nm2.style.color = this.targetColour.hex; }
    if (tl)    tl.textContent  = label;

    // Show memorise overlay
    const mem = document.getElementById('sc-memorise');
    const ans = document.getElementById('sc-answer');
    if (mem) mem.style.display = 'flex';
    if (ans) ans.style.display = 'none';

    // Countdown 3-2-1 then start
    let cd = 3;
    const cdEl = document.getElementById('sc-cd');
    if (cdEl) cdEl.textContent = cd;

    const iv = setInterval(() => {
      cd--;
      if (cd <= 0) {
        clearInterval(iv);
        if (mem) mem.style.display = 'none';
        this._startRound();
      } else {
        if (cdEl) cdEl.textContent = cd;
      }
    }, 1000);
  },

  _startRound() {
    this.roundActive   = true;
    this.roundTimeLeft = this.roundDuration;

    // Resize canvas before spawning
    const wrap = document.getElementById('sc-wrap');
    if (wrap && this.canvas) {
      this.canvas.width  = wrap.offsetWidth  || 700;
      this.canvas.height = wrap.offsetHeight || 420;
    }

    this._spawnShapes();
    this._animate();
    this._scheduleNextChange();
    this._startTimerBar();

    const timerEl = document.getElementById('sc-round-timer');
    if (timerEl) { timerEl.textContent = this.roundTimeLeft; timerEl.style.color = 'var(--gold)'; timerEl.style.animation = ''; }

    this.roundTimerInterval = setInterval(() => {
      this.roundTimeLeft--;
      if (timerEl) timerEl.textContent = this.roundTimeLeft;
      if (this.roundTimeLeft <= 5 && timerEl) {
        timerEl.style.color     = 'var(--warn)';
        timerEl.style.animation = 'pulse 0.8s ease infinite';
      }
      if (this.roundTimeLeft <= 0) {
        clearInterval(this.roundTimerInterval);
        this._endRound();
      }
    }, 1000);
  },

  _spawnShapes() {
    this.shapes = [];
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    const spd = this.cfg.moveSpeed;

    // Target
    this.shapes.push({
      x: 80 + Math.random()*(W-160),
      y: 80 + Math.random()*(H-160),
      vx: (Math.random()*2-1) * spd,
      vy: (Math.random()*2-1) * spd,
      shape:    this.targetShapeType,
      colour:   this.targetColour.hex,
      size:     this.cfg.targetSize,
      isTarget: true
    });

    // Distractors
    for (let i=0; i<this.cfg.distractorCount; i++) {
      const col = this._randExcept(SHAPE_COLOURS, this.targetColour.hex, 'hex');
      const shp = this._randExcept(SHAPE_TYPES,   this.targetShapeType, null);
      this.shapes.push({
        x: 80 + Math.random()*(W-160),
        y: 80 + Math.random()*(H-160),
        vx: (Math.random()*2-1) * spd,
        vy: (Math.random()*2-1) * spd,
        shape:    shp,
        colour:   col.hex,
        size:     this.cfg.distractorSize,
        isTarget: false
      });
    }
  },

  _randExcept(arr, exclude, key) {
    const pool = arr.filter(x => (key ? x[key] : x) !== exclude);
    return pool[Math.floor(Math.random()*pool.length)];
  },

  _scheduleNextChange() {
    clearTimeout(this.nextChangeTimeout);
    if (!this.roundActive) return;
    const delay = this.cfg.minChangeInterval +
      Math.random() * (this.cfg.maxChangeInterval - this.cfg.minChangeInterval);
    this.nextChangeTimeout = setTimeout(() => {
      if (!this.roundActive) return;
      this._changeTarget();
      this._scheduleNextChange();
    }, delay);
  },

  _changeTarget() {
    const t = this.shapes.find(s => s.isTarget);
    if (!t) return;
    const newShape  = this._randExcept(SHAPE_TYPES,   t.shape,  null);
    const newColour = this._randExcept(SHAPE_COLOURS, t.colour, 'hex');
    t.shape          = newShape;
    t.colour         = newColour.hex;
    this.targetShapeType = newShape;
    this.targetColour    = newColour;
    this.changeCount++;
  },

  _animate() {
    if (!this.roundActive) return;
    const W = this.canvas.width, H = this.canvas.height;
    this.ctx.clearRect(0, 0, W, H);
    this.shapes.forEach(s => {
      s.x += s.vx; s.y += s.vy;
      if (s.x - s.size < 0)  { s.x = s.size;   s.vx *= -1; }
      if (s.x + s.size > W)  { s.x = W-s.size; s.vx *= -1; }
      if (s.y - s.size < 30) { s.y = s.size+30; s.vy *= -1; }
      if (s.y + s.size > H)  { s.y = H-s.size; s.vy *= -1; }
      this._drawShape(this.ctx, s.shape, s.x, s.y, s.size, s.colour);
    });
    this.animFrame = requestAnimationFrame(() => this._animate());
  },

  _drawShape(c, shape, x, y, size, hex) {
    c.save();
    c.fillStyle   = hex;
    c.shadowColor = hex;
    c.shadowBlur  = 8;
    c.beginPath();
    switch(shape) {
      case 'circle':
        c.arc(x, y, size, 0, Math.PI*2);
        break;
      case 'square':
        c.rect(x-size, y-size, size*2, size*2);
        break;
      case 'triangle':
        c.moveTo(x, y-size);
        c.lineTo(x+size*0.866, y+size*0.5);
        c.lineTo(x-size*0.866, y+size*0.5);
        c.closePath();
        break;
      case 'diamond':
        c.moveTo(x, y-size);
        c.lineTo(x+size*0.65, y);
        c.lineTo(x, y+size);
        c.lineTo(x-size*0.65, y);
        c.closePath();
        break;
      case 'pentagon':
        for (let i=0; i<5; i++) {
          const a = (i*2*Math.PI/5) - Math.PI/2;
          i===0 ? c.moveTo(x+size*Math.cos(a), y+size*Math.sin(a))
                : c.lineTo(x+size*Math.cos(a), y+size*Math.sin(a));
        }
        c.closePath();
        break;
      case 'star':
        for (let i=0; i<10; i++) {
          const a = (i*Math.PI/5) - Math.PI/2;
          const r = i%2===0 ? size : size*0.42;
          i===0 ? c.moveTo(x+r*Math.cos(a), y+r*Math.sin(a))
                : c.lineTo(x+r*Math.cos(a), y+r*Math.sin(a));
        }
        c.closePath();
        break;
    }
    c.fill();
    c.restore();
  },

  _startTimerBar() {
    const bar = document.getElementById('sc-timer-bar');
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width      = '100%';
    bar.style.background = 'linear-gradient(90deg,var(--accent),var(--gold))';
    requestAnimationFrame(() => {
      bar.style.transition = `width ${this.roundDuration}s linear`;
      bar.style.width      = '0%';
      this.roundTimerBarTimeout = setTimeout(() => {
        bar.style.background = 'linear-gradient(90deg,var(--warn),#ff9a00)';
      }, Math.max(0, (this.roundDuration - 5) * 1000));
    });
  },

  _endRound() {
    this.roundActive = false;
    cancelAnimationFrame(this.animFrame);
    clearTimeout(this.nextChangeTimeout);
    clearTimeout(this.roundTimerBarTimeout);
    clearInterval(this.roundTimerInterval);

    const bar     = document.getElementById('sc-timer-bar');
    const timerEl = document.getElementById('sc-round-timer');
    if (bar)     { bar.style.transition = 'none'; bar.style.width = '0%'; }
    if (timerEl) { timerEl.textContent = '—'; timerEl.style.animation = ''; }

    this._showAnswer();
  },

  _showAnswer() {
    const ansEl    = document.getElementById('sc-answer');
    const resultEl = document.getElementById('sc-result');
    const input    = document.getElementById('sc-input');
    if (!ansEl || !input) return;

    ansEl.style.display    = 'flex';
    resultEl.style.display = 'none';
    input.value            = '';
    input.disabled         = false;
    input.style.cssText    = 'width:150px;background:#152019;border:2px solid var(--border);border-radius:10px;padding:0.75rem 1rem;color:var(--text);font-family:\'Barlow Condensed\',sans-serif;font-size:2.2rem;font-weight:700;text-align:center;outline:none;transition:border-color 0.2s,background 0.2s;-moz-appearance:textfield;';

    setTimeout(() => input.focus(), 100);

    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const val = parseInt(input.value);
        if (!isNaN(val) && val >= 0) this._submitAnswer(val, input, resultEl);
      }
    };
  },

  _submitAnswer(val, inputEl, resultEl) {
    const isCorrect = val === this.changeCount;
    inputEl.disabled          = true;
    inputEl.style.borderColor = isCorrect ? 'var(--accent)' : 'var(--warn)';
    inputEl.style.background  = isCorrect ? '#00e67615'     : '#ff6b3515';
    inputEl.style.color       = isCorrect ? 'var(--accent)' : 'var(--warn)';

    resultEl.style.display = 'block';
    resultEl.style.color   = isCorrect ? 'var(--accent)' : 'var(--warn)';
    resultEl.textContent   = isCorrect
      ? `✅ Correct! It changed ${this.changeCount} times.`
      : `❌ It changed ${this.changeCount} times — you said ${val}.`;

    this.score = isCorrect ? 100 : 0;

    setTimeout(() => {
      showResult(
        'shape_counter',
        this.score,
        this.cfg.level,
        isCorrect
          ? `Correct! ${this.changeCount} changes · ${this.roundDuration}s · speed ${this.cfg.moveSpeed.toFixed(1)}`
          : `Wrong — ${this.changeCount} changes · you said ${val} · ${this.roundDuration}s`,
        isCorrect,
        isCorrect ? 100 : 0
      );
    }, 2000);
  },

  cleanup() {
    this.roundActive = false;
    cancelAnimationFrame(this.animFrame);
    clearTimeout(this.nextChangeTimeout);
    clearTimeout(this.roundTimerBarTimeout);
    clearInterval(this.roundTimerInterval);
  }
};
