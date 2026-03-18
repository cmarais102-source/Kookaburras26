// ══════════════════════════════════════════════════════════════════
//  GAME: SHAPE COUNTER
// ══════════════════════════════════════════════════════════════════
const SHAPE_TYPES  = ['circle','triangle','square','pentagon','star','diamond'];
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
  cfg:              null,
  round:            0,
  score:            0,
  correctRounds:    0,
  wrongRounds:      0,
  changeCount:      0,
  roundDuration:    0,
  roundTimeLeft:    0,
  targetShapeType:  null,
  targetColour:     null,
  shapes:           [],
  roundActive:      false,
  nextChangeTimeout:    null,
  roundTimerInterval:   null,
  roundTimerBarTimeout: null,
  animFrame:            null,
  canvas:           null,
  ctx:              null,
  arena:            null,

  init(arena, cfg) {
    this.cfg           = cfg;
    this.round         = 0;
    this.score         = 0;
    this.correctRounds = 0;
    this.wrongRounds   = 0;
    this.roundActive   = false;

    // Build HTML
    arena.innerHTML = `
      <div class="game-score-bar">
        <div class="game-score-item"><div class="game-score-label">Round</div><div class="game-score-value" id="sc-round" style="color:var(--gold)">0/${cfg.totalRounds}</div></div>
        <div class="game-score-item"><div class="game-score-label">Score</div><div class="game-score-value" id="sc-score">0</div></div>
        <div class="game-score-item"><div class="game-score-label">Correct</div><div class="game-score-value" id="sc-correct">0</div></div>
        <div class="game-score-item"><div class="game-score-label">Wrong</div><div class="game-score-value" id="sc-wrong" style="color:var(--warn)">0</div></div>
        <div class="game-score-item"><div class="game-score-label">Round Time</div><div class="game-score-value" id="sc-roundtime" style="color:var(--blue)">—s</div></div>
        <div class="game-score-item"><div class="game-score-label">Need</div><div class="game-score-value" style="color:var(--gold)">${cfg.passAccuracy}%</div></div>
      </div>
      <div id="sc-arena-wrap" style="position:relative;width:100%;flex:1;min-height:400px;">
        <div id="sc-timer-bar-wrap" style="position:absolute;top:0;left:0;right:0;height:5px;background:var(--surface);z-index:5;">
          <div id="sc-timer-bar" style="height:100%;background:linear-gradient(90deg,var(--accent),var(--gold));width:100%;border-radius:0 3px 3px 0;"></div>
        </div>
        <div id="sc-round-timer" style="position:absolute;top:12px;right:14px;font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:700;color:var(--gold);z-index:5;">—</div>
        <div id="sc-target-label" style="position:absolute;top:12px;left:14px;font-family:'Barlow Condensed',sans-serif;font-size:0.78rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);z-index:5;">Track: <span id="sc-target-text" style="color:var(--text-dim)">—</span></div>
        <canvas id="sc-canvas" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>

        <!-- Memorise overlay -->
        <div id="sc-memorise" style="display:none;position:absolute;inset:0;background:var(--bg2);border-radius:8px;flex-direction:column;align-items:center;justify-content:center;gap:1rem;z-index:10;padding:1.5rem;">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:700;color:var(--gold);letter-spacing:0.08em;">👁️ MEMORISE YOUR TARGET</div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:0.85rem 1.5rem;display:flex;align-items:center;gap:1rem;">
            <canvas id="sc-preview-canvas" width="70" height="70"></canvas>
            <div>
              <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.3rem">Your target</div>
              <div id="sc-memorise-name" style="font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:700;letter-spacing:0.05em;">—</div>
            </div>
          </div>
          <div style="font-size:0.8rem;color:var(--text-dim);text-align:center;">Count every time <strong id="sc-memorise-name2" style="color:var(--accent)">—</strong> changes shape or colour</div>
          <div id="sc-memorise-cd" style="font-family:'Barlow Condensed',sans-serif;font-size:4.5rem;font-weight:900;color:var(--accent);line-height:1;">3</div>
        </div>

        <!-- Answer overlay -->
        <div id="sc-answer" style="display:none;position:absolute;inset:0;background:var(--bg2);border-radius:8px;flex-direction:column;align-items:center;justify-content:center;gap:1rem;z-index:10;padding:1.5rem;">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:700;letter-spacing:0.06em;">⏱ Time's up!</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.9rem;font-weight:700;letter-spacing:0.08em;color:var(--gold);">How many times did the target change?</div>
          <input id="sc-answer-input" type="number" min="0" max="99" placeholder="—"
            style="width:150px;background:#152019;border:2px solid var(--border);border-radius:10px;
                   padding:0.75rem 1rem;color:var(--text);font-family:'Barlow Condensed',sans-serif;
                   font-size:2.2rem;font-weight:700;text-align:center;outline:none;
                   transition:border-color 0.2s,background 0.2s;letter-spacing:0.1em;
                   -moz-appearance:textfield;"
          />
          <div style="font-size:0.7rem;color:var(--text-muted)">Press Enter to confirm</div>
          <div id="sc-answer-result" style="display:none;font-family:'Barlow Condensed',sans-serif;font-size:1.05rem;font-weight:700;text-align:center;"></div>
        </div>
      </div>
    `;

    // Remove spinner arrows from number input
    const style = document.createElement('style');
    style.textContent = '#sc-answer-input::-webkit-outer-spin-button,#sc-answer-input::-webkit-inner-spin-button{-webkit-appearance:none;}';
    document.head.appendChild(style);

    this.arena  = document.getElementById('sc-arena-wrap');
    this.canvas = document.getElementById('sc-canvas');
    this.ctx    = this.canvas.getContext('2d');
    this._resizeCanvas();
    this.nextRound();
  },

  _resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width  = this.arena.offsetWidth;
    this.canvas.height = this.arena.offsetHeight;
  },

  nextRound() {
    if (this.round >= this.cfg.totalRounds) { this._finish(); return; }
    this.round++;
    this.changeCount = 0;
    document.getElementById('sc-round').textContent = `${this.round}/${this.cfg.totalRounds}`;

    // Random round duration
    this.roundDuration = this.cfg.minRoundTime +
      Math.floor(Math.random() * (this.cfg.maxRoundTime - this.cfg.minRoundTime + 1));
    document.getElementById('sc-roundtime').textContent = this.roundDuration + 's';

    // Pick target
    this.targetShapeType = SHAPE_TYPES[Math.floor(Math.random()*SHAPE_TYPES.length)];
    this.targetColour    = SHAPE_COLOURS[Math.floor(Math.random()*SHAPE_COLOURS.length)];

    this._showMemorise();
  },

  _showMemorise() {
    document.getElementById('sc-answer').style.display  = 'none';
    document.getElementById('sc-memorise').style.display = 'flex';

    const mc   = document.getElementById('sc-preview-canvas');
    const mctx = mc.getContext('2d');
    mctx.clearRect(0,0,70,70);
    this._drawShape(mctx, this.targetShapeType, 35, 35, 22, this.targetColour.hex);

    const label = `${this.targetColour.name} ${this.targetShapeType}`;
    const nameEl  = document.getElementById('sc-memorise-name');
    nameEl.textContent = label; nameEl.style.color = this.targetColour.hex;
    const name2El = document.getElementById('sc-memorise-name2');
    name2El.textContent = label; name2El.style.color = this.targetColour.hex;
    document.getElementById('sc-target-text').textContent = label;

    let cd = 3;
    const cdEl = document.getElementById('sc-memorise-cd');
    cdEl.textContent = cd;
    const iv = setInterval(()=>{
      cd--;
      if (cd <= 0) {
        clearInterval(iv);
        document.getElementById('sc-memorise').style.display = 'none';
        this._startRound();
      } else {
        cdEl.textContent = cd;
      }
    }, 1000);
  },

  _startRound() {
    this.roundActive  = true;
    this.roundTimeLeft = this.roundDuration;
    this._resizeCanvas();
    this._spawnShapes();
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this._animate();
    this._scheduleNextChange();
    this._startTimerBar();

    const timerEl = document.getElementById('sc-round-timer');
    timerEl.textContent = this.roundTimeLeft;
    timerEl.style.color = 'var(--gold)';
    timerEl.style.animation = '';

    this.roundTimerInterval = setInterval(()=>{
      this.roundTimeLeft--;
      timerEl.textContent = this.roundTimeLeft;
      if (this.roundTimeLeft <= 5) {
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
    const W = this.canvas.width, H = this.canvas.height;

    // Target
    this.shapes.push({
      x:  60 + Math.random()*(W-120),
      y:  60 + Math.random()*(H-120),
      vx: (Math.random()*2-1) * this.cfg.moveSpeed,
      vy: (Math.random()*2-1) * this.cfg.moveSpeed,
      shape:    this.targetShapeType,
      colour:   this.targetColour.hex,
      size:     this.cfg.targetSize,
      isTarget: true
    });

    // Distractors
    for (let i=0; i<this.cfg.distractorCount; i++) {
      const col = this._randExcept(SHAPE_COLOURS, this.targetColour.hex, 'hex');
      const shp = this._randExcept(SHAPE_TYPES,   this.targetShapeType,  null);
      this.shapes.push({
        x:  60 + Math.random()*(W-120),
        y:  60 + Math.random()*(H-120),
        vx: (Math.random()*2-1) * this.cfg.moveSpeed,
        vy: (Math.random()*2-1) * this.cfg.moveSpeed,
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
    this.nextChangeTimeout = setTimeout(()=>{
      if (!this.roundActive) return;
      this._changeTarget();
      this._scheduleNextChange();
    }, delay);
  },

  _changeTarget() {
    const t = this.shapes.find(s=>s.isTarget);
    if (!t) return;
    const newShape  = this._randExcept(SHAPE_TYPES,   t.shape,   null);
    const newColour = this._randExcept(SHAPE_COLOURS, t.colour,  'hex');
    t.shape   = newShape;
    t.colour  = newColour.hex;
    this.targetShapeType = newShape;
    this.targetColour    = newColour;
    this.changeCount++;
  },

  _animate() {
    if (!this.roundActive) return;
    const W = this.canvas.width, H = this.canvas.height;
    this.ctx.clearRect(0,0,W,H);

    this.shapes.forEach(s=>{
      s.x += s.vx; s.y += s.vy;
      if (s.x-s.size < 0)  { s.x=s.size;    s.vx*=-1; }
      if (s.x+s.size > W)  { s.x=W-s.size;  s.vx*=-1; }
      if (s.y-s.size < 32) { s.y=s.size+32; s.vy*=-1; }
      if (s.y+s.size > H)  { s.y=H-s.size;  s.vy*=-1; }
      this._drawShape(this.ctx, s.shape, s.x, s.y, s.size, s.colour);
    });

    this.animFrame = requestAnimationFrame(()=>this._animate());
  },

  _drawShape(c, shape, x, y, size, hex, alpha=1) {
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle   = hex;
    c.shadowColor = hex;
    c.shadowBlur  = 8;
    c.beginPath();
    switch(shape) {
      case 'circle':
        c.arc(x,y,size,0,Math.PI*2); break;
      case 'square':
        c.rect(x-size,y-size,size*2,size*2); break;
      case 'triangle':
        c.moveTo(x,y-size); c.lineTo(x+size*0.866,y+size*0.5); c.lineTo(x-size*0.866,y+size*0.5); c.closePath(); break;
      case 'diamond':
        c.moveTo(x,y-size); c.lineTo(x+size*0.65,y); c.lineTo(x,y+size); c.lineTo(x-size*0.65,y); c.closePath(); break;
      case 'pentagon':
        for(let i=0;i<5;i++){const a=(i*2*Math.PI/5)-Math.PI/2; i===0?c.moveTo(x+size*Math.cos(a),y+size*Math.sin(a)):c.lineTo(x+size*Math.cos(a),y+size*Math.sin(a));} c.closePath(); break;
      case 'star':
        for(let i=0;i<10;i++){const a=(i*Math.PI/5)-Math.PI/2,r=i%2===0?size:size*0.42; i===0?c.moveTo(x+r*Math.cos(a),y+r*Math.sin(a)):c.lineTo(x+r*Math.cos(a),y+r*Math.sin(a));} c.closePath(); break;
    }
    c.fill();
    c.restore();
  },

  _startTimerBar() {
    const bar = document.getElementById('sc-timer-bar');
    bar.style.transition = 'none';
    bar.style.width      = '100%';
    bar.style.background = 'linear-gradient(90deg,var(--accent),var(--gold))';
    requestAnimationFrame(()=>{
      bar.style.transition = `width ${this.roundDuration}s linear`;
      bar.style.width      = '0%';
      this.roundTimerBarTimeout = setTimeout(()=>{
        bar.style.background = 'linear-gradient(90deg,var(--warn),#ff9a00)';
      }, (this.roundDuration-5)*1000);
    });
  },

  _endRound() {
    this.roundActive = false;
    cancelAnimationFrame(this.animFrame);
    clearTimeout(this.nextChangeTimeout);
    clearTimeout(this.roundTimerBarTimeout);
    clearInterval(this.roundTimerInterval);

    const bar = document.getElementById('sc-timer-bar');
    bar.style.transition = 'none'; bar.style.width = '0%';
    const timerEl = document.getElementById('sc-round-timer');
    timerEl.textContent = '—'; timerEl.style.animation = '';

    this._showAnswer();
  },

  _showAnswer() {
    document.getElementById('sc-answer').style.display = 'flex';
    const input = document.getElementById('sc-answer-input');
    const result = document.getElementById('sc-answer-result');
    input.value   = '';
    input.disabled = false;
    input.style.borderColor = '';
    input.style.background  = '';
    input.style.color       = '';
    result.style.display    = 'none';
    setTimeout(()=>input.focus(), 100);

    input.onkeydown = (e)=>{
      if (e.key === 'Enter') {
        const val = parseInt(input.value);
        if (!isNaN(val) && val >= 0) this._submitAnswer(val, input, result);
      }
    };
  },

  _submitAnswer(val, inputEl, resultEl) {
    const isCorrect = val === this.changeCount;
    inputEl.disabled = true;
    inputEl.style.borderColor = isCorrect ? 'var(--accent)' : 'var(--warn)';
    inputEl.style.background  = isCorrect ? 'var(--accent-dim)' : '#ff6b3515';
    inputEl.style.color       = isCorrect ? 'var(--accent)' : 'var(--warn)';

    resultEl.style.display = 'block';
    resultEl.style.color   = isCorrect ? 'var(--accent)' : 'var(--warn)';

    if (isCorrect) {
      this.score += 100; this.correctRounds++;
      resultEl.textContent = `✅ Correct! It changed ${this.changeCount} times.`;
      document.getElementById('sc-correct').textContent = this.correctRounds;
    } else {
      this.wrongRounds++;
      resultEl.textContent = `❌ It changed ${this.changeCount} times — you said ${val}.`;
      document.getElementById('sc-wrong').textContent = this.wrongRounds;
    }
    document.getElementById('sc-score').textContent = this.score;

    setTimeout(()=>{
      document.getElementById('sc-answer').style.display = 'none';
      this.nextRound();
    }, 2200);
  },

  _finish() {
    cancelAnimationFrame(this.animFrame);
    const pct    = Math.round((this.correctRounds / this.cfg.totalRounds) * 100);
    const needed = Math.ceil(this.cfg.totalRounds * (this.cfg.passAccuracy / 100));
    const passed = this.correctRounds >= needed;
    showResult('shape_counter', this.score, this.cfg.level,
      `${this.correctRounds}/${this.cfg.totalRounds} rounds correct — ${pct}%`, passed, pct);
  },

  cleanup() {
    this.roundActive = false;
    cancelAnimationFrame(this.animFrame);
    clearTimeout(this.nextChangeTimeout);
    clearTimeout(this.roundTimerBarTimeout);
    clearInterval(this.roundTimerInterval);
  }
};
