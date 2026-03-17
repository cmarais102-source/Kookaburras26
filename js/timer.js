// ─── SESSION TIMER ────────────────────────────────────────────────
const MAX_SESSION = 10 * 60;

const Timer = {
  elapsed:    0,
  running:    false,
  paused:     false,
  _interval:  null,
  _exStart:   null,
  _exElapsed: 0,

  start() {
    if (this.running) return;
    this.running  = true;
    this.paused   = false;
    this._exStart = this._exStart || Date.now();
    this._interval = setInterval(() => {
      this.elapsed++;
      this.render();
      if (this.elapsed >= MAX_SESSION) { this.stop(); showSessionOver(); }
    }, 1000);
    this._syncBtn();
  },

  pause() {
    if (!this.running) return;
    this.running = false;
    this.paused  = true;
    clearInterval(this._interval);
    this._interval = null;
    if (this._exStart) {
      this._exElapsed += Math.round((Date.now() - this._exStart) / 1000);
      this._exStart = null;
    }
    this._syncBtn();
    const el = document.getElementById('paused-overlay');
    if (el) el.classList.add('show');
  },

  resume() {
    if (this.running) return;
    this.paused   = false;
    this._exStart = Date.now();
    const el = document.getElementById('paused-overlay');
    if (el) el.classList.remove('show');
    this.start();
  },

  toggle() { this.running ? this.pause() : this.resume(); },

  stop() {
    this.running = false;
    clearInterval(this._interval);
    this._interval = null;
    this._syncBtn();
  },

  reset() {
    this.stop();
    this.elapsed    = 0;
    this.paused     = false;
    this._exStart   = null;
    this._exElapsed = 0;
    const el = document.getElementById('paused-overlay');
    if (el) el.classList.remove('show');
    this.render();
    this._syncBtn();
  },

  markExerciseStart() { this._exStart = Date.now(); this._exElapsed = 0; },

  exerciseDuration() {
    let t = this._exElapsed;
    if (this._exStart) t += Math.round((Date.now() - this._exStart) / 1000);
    return t;
  },

  remaining() { return Math.max(0, MAX_SESSION - this.elapsed); },

  fmt(s) {
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  },

  render() {
    const rem = this.remaining();
    const el  = document.getElementById('nav-time-display');
    if (el) { el.textContent = this.fmt(rem); el.classList.toggle('warn', rem <= 60 && rem > 0); }
  },

  _syncBtn() {
    const b = document.getElementById('nav-pause-btn');
    if (b) b.textContent = this.running ? '⏸' : '▶';
  }
};
